chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'readability:togglePanel' });
  } catch (e) {
    // Content script may not be loaded on chrome:// or extension pages.
  }
});
