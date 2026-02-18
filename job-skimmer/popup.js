// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  };
});

// Send message to content script
function sendCapture(site) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "capture", site });
  });
}

document.getElementById("capture-wellfound").onclick = () =>
  sendCapture("wellfound");
document.getElementById("capture-linkedin").onclick = () =>
  sendCapture("linkedin");
document.getElementById("capture-naukri").onclick = () => sendCapture("naukri");

document.getElementById("scrape-wellfound").onclick = () => {
  const status = document.getElementById("scrape-status");
  status.innerText = "Scraping started...";
  chrome.runtime.sendMessage({ action: "scrape_jobs" }, (response) => {
    status.innerText = response?.message ?? "Done!";
  });
};
