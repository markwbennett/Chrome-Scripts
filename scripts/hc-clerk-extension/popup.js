// Popup script for Harris County District Clerk auto-login extension

document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');

    // Load existing credentials
    chrome.storage.local.get(['hc_username', 'hc_password'], function(result) {
        if (result.hc_username) {
            usernameInput.value = result.hc_username;
        }
        if (result.hc_password) {
            passwordInput.value = result.hc_password;
        }
    });

    // Function to show status message
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    // Save credentials
    saveBtn.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showStatus('Please enter both username and password', true);
            return;
        }

        chrome.storage.local.set({
            'hc_username': username,
            'hc_password': password
        }, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving credentials', true);
            } else {
                showStatus('Credentials saved successfully!');
                
                // Send message to content script to try auto-login
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0] && tabs[0].url.includes('hcdistrictclerk.com')) {
                        chrome.tabs.sendMessage(tabs[0].id, {action: 'startAutoLogin'});
                    }
                });
            }
        });
    });

    // Clear credentials
    clearBtn.addEventListener('click', function() {
        usernameInput.value = '';
        passwordInput.value = '';
        
        chrome.storage.local.remove(['hc_username', 'hc_password'], function() {
            if (chrome.runtime.lastError) {
                showStatus('Error clearing credentials', true);
            } else {
                showStatus('Credentials cleared successfully!');
            }
        });
    });

    // Allow Enter key to save
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
    });
}); 