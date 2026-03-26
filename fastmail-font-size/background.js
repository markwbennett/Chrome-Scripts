// Reset zoom to 100% for all Fastmail tabs.

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.includes('fastmail.com')) {
    chrome.tabs.setZoom(tabId, 1.0);
  }
});
