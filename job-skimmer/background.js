const API_BASE = "http://localhost:8000";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "saveToBackend") {
    fetch(`${API_BASE}/capture-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: msg.site, links: msg.links }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Saved:", data);
        alert(`Saved ${data.added} new jobs to backend`);
      })
      .catch((err) => console.error("Error saving:", err));
  }

  if (msg.action === "scrape_jobs") {
    scrapeAllJobs().then((message) => sendResponse({ message }));
    return true;
  }
});

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === "complete") return resolve();
      const listener = (id, info) => {
        if (id === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ SYNC function — executeScript cannot await async functions in MV3
function scrapeTabSync(source) {
  const SELECTORS = {
    wellfound: {
      description: "div.styles_description__36q7q",
      sidebar: "div.styles_component__wuFdv",
    },
  };

  const sel = SELECTORS[source];
  if (!sel) return { job_description: null, location: null };

  const descEl = document.querySelector(sel.description);
  const sidebarEl = document.querySelector(sel.sidebar);

  if (!descEl) return { job_description: null, location: null };

  const description = descEl.innerText?.trim() ?? null;
  const sidebarText = sidebarEl?.innerText?.trim() ?? null;
  const full = [description, sidebarText].filter(Boolean).join("\n\n---\n\n");

  const locationMatch = sidebarText?.match(/Hires remotely in\s+(.+)/);
  const location = locationMatch ? locationMatch[1].trim() : null;

  return { job_description: full, location };
}

async function scrapeAllJobs() {
  let jobs;
  try {
    const res = await fetch(`${API_BASE}/jobs/unscraped`);
    jobs = await res.json();
  } catch (err) {
    console.error("Failed to fetch unscraped jobs:", err);
    return "Failed to reach backend.";
  }

  if (!jobs.length) return "No unscraped jobs found.";

  console.log(`Starting scrape of ${jobs.length} jobs...`);
  let successCount = 0;

  for (const job of jobs) {
    let tab;
    try {
      tab = await chrome.tabs.create({ url: job.url, active: false });
      console.log(`Opened tab ${tab.id} for job ${job.id}`);

      await waitForTabLoad(tab.id);

      // ✅ wait for JS rendering AFTER network load
      await sleep(3000);

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeTabSync, // ✅ sync, not async
        args: [job.source],
      });

      console.log("Raw result:", result); // debug

      // ✅ guard against undefined
      if (!result || result.result === undefined) {
        console.warn(`executeScript returned nothing for job ${job.id}`);
        continue;
      }

      const { job_description, location } = result.result;

      if (!job_description) {
        console.warn(
          `No content found for job ${job.id}, selector may have changed`,
        );
        continue;
      }

      console.log(`Scraped job ${job.id}:`, {
        location,
        preview: job_description.slice(0, 80),
      });

      const saveRes = await fetch(`${API_BASE}/jobs/${job.id}/scraped-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description, location }),
      });
      const saveData = await saveRes.json();
      console.log(`Saved job ${job.id}:`, saveData);
      successCount++;
    } catch (err) {
      console.error(`Failed job ${job.id}:`, err);
    } finally {
      if (tab?.id) {
        try {
          await chrome.tabs.remove(tab.id);
        } catch (e) {}
        console.log(`Closed tab ${tab.id}`);
      }
    }

    await sleep(1000);
  }

  return `Done! Scraped ${successCount} / ${jobs.length} jobs.`;
}
