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
        console.log('Opening notes viewer:', notesUrl);
        
        chrome.tabs.query({}, function(tabs) {
            if (chrome.runtime.lastError) {
                console.error('Error querying tabs:', chrome.runtime.lastError);
                return;
            }
            
            // Look for existing notes viewer tab
            const existingTab = tabs.find(tab => tab.url === notesUrl);
            
            if (existingTab) {
                console.log('Found existing notes tab, switching to it');
                // Switch to existing tab and trigger refresh
                chrome.tabs.update(existingTab.id, {active: true}, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error updating tab:', chrome.runtime.lastError);
                        return;
                    }
                    chrome.windows.update(existingTab.windowId, {focused: true});
                    // Send message to refresh the notes
                    chrome.tabs.sendMessage(existingTab.id, {action: 'refreshNotes'}, function() {
                        if (chrome.runtime.lastError) {
                            console.log('Could not send refresh message (tab might still be loading)');
                        }
                    });
                });
            } else {
                console.log('Creating new notes tab');
                // Open new tab
                chrome.tabs.create({
                    url: notesUrl
                }, function(tab) {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating tab:', chrome.runtime.lastError);
                    } else {
                        console.log('Notes tab created successfully:', tab.id);
                    }
                });
            }
        });
    } else if (request.action === 'notesUpdated') {
        // Broadcast to all notes viewer tabs to refresh
        const notesUrl = chrome.runtime.getURL('notes-viewer.html');
        
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                if (tab.url === notesUrl) {
                    chrome.tabs.sendMessage(tab.id, {action: 'refreshNotes'});
                }
            });
        });
    }
}); 