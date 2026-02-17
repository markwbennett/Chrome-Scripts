const enabledEl = document.getElementById("enabled");
const directionEl = document.getElementById("direction");

// Load current settings
chrome.storage.sync.get({ enabled: true, direction: "right" }, (settings) => {
  enabledEl.checked = settings.enabled;
  directionEl.value = settings.direction;
});

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
});

directionEl.addEventListener("change", () => {
  chrome.storage.sync.set({ direction: directionEl.value });
});
