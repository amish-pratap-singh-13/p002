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

  // 🚀 Send to background instead of storage
  chrome.runtime.sendMessage({
    action: "saveToBackend",
    site: msg.site,
    links: arr,
  });
});
