// Background script for Harris County District Clerk auto-login extension

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openPopup') {
        // Open the popup when credentials are needed
        chrome.action.openPopup();
    }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('HC District Clerk Auto Login extension installed');
}); 