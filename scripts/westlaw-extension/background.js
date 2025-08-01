chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reloadExtension') {
        // First refresh the active tab, then reload the extension
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.reload(tabs[0].id, function() {
                    // Small delay to ensure page starts loading before extension reloads
                    setTimeout(() => {
                        chrome.runtime.reload();
                    }, 100);
                });
            } else {
                chrome.runtime.reload();
            }
        });
    } else if (request.action === 'openNotesViewer') {
        // Check if notes viewer is already open
        const notesUrl = chrome.runtime.getURL('notes-viewer.html');
        
        chrome.tabs.query({}, function(tabs) {
            // Look for existing notes viewer tab
            const existingTab = tabs.find(tab => tab.url === notesUrl);
            
            if (existingTab) {
                // Switch to existing tab
                chrome.tabs.update(existingTab.id, {active: true});
                chrome.windows.update(existingTab.windowId, {focused: true});
            } else {
                // Open new tab
                chrome.tabs.create({
                    url: notesUrl
                });
            }
        });
    }
}); 