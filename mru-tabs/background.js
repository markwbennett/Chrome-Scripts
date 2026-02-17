// MRU Tabs — moves the active tab to one end of the tab bar
// direction: "right" means most-recent on right, "left" means most-recent on left

let enabled = true;
let direction = "right"; // "right" or "left"
let moving = false; // guard against re-entrant moves

// Load settings on startup
chrome.storage.sync.get({ enabled: true, direction: "right" }, (settings) => {
  enabled = settings.enabled;
  direction = settings.direction;
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) enabled = changes.enabled.newValue;
  if (changes.direction) direction = changes.direction.newValue;
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!enabled || moving) return;

  moving = true;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    // Only move tabs within the same window; skip pinned tabs
    if (tab.pinned) return;

    const targetIndex = direction === "right" ? -1 : 0;
    await chrome.tabs.move(tab.id, { index: targetIndex });
  } catch (e) {
    // Tab may have been closed between activation and move
  } finally {
    moving = false;
  }
});
