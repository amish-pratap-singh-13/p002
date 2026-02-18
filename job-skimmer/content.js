chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "capture") return;

  let selector;

  if (msg.site === "wellfound") {
    selector = "a[href^='/jobs/']";
  }

  if (msg.site === "linkedin") {
    selector = "a.job-card-container__link";
  }

  if (msg.site === "naukri") {
    selector = ".title a";
  }

  const links = new Set();

  document.querySelectorAll(selector).forEach((a) => {
    try {
      links.add(new URL(a.href, location.origin).href);
    } catch {}
  });

  const arr = Array.from(links);

  chrome.storage.local.get(["jobLinks"], (res) => {
    const old = res.jobLinks || {};
    old[msg.site] = Array.from(new Set([...(old[msg.site] || []), ...arr]));

    chrome.storage.local.set({ jobLinks: old }, () => {
      alert(`Captured ${arr.length} jobs for ${msg.site}`);
    });
  });
});
