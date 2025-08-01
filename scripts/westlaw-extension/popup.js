document.addEventListener('DOMContentLoaded', function() {
    
    // Send message to content script
    function sendMessage(action) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('westlaw.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {action: action}, function(response) {
                    if (chrome.runtime.lastError) {
                        console.log('Content script not ready:', chrome.runtime.lastError.message);
                        // Optionally show user feedback
                        document.getElementById('status').textContent = 'Content script loading...';
                    }
                });
            }
        });
    }

    // Check if on Westlaw page and show appropriate UI
    function checkWestlawPage() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const isWestlawPage = tabs[0] && tabs[0].url.includes('westlaw.com');
            
            if (isWestlawPage) {
                // Show normal controls
                document.getElementById('controls').style.display = 'block';
                document.getElementById('westlaw-warning').style.display = 'none';
                updateStatus();
            } else {
                // Show warning message
                document.getElementById('controls').style.display = 'none';
                document.getElementById('westlaw-warning').style.display = 'block';
                document.getElementById('status').textContent = 'Navigate to Westlaw to use this extension';
            }
        });
    }

    // Update status display
    function updateStatus() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('westlaw.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
                    if (chrome.runtime.lastError) {
                        console.log('Content script not ready:', chrome.runtime.lastError.message);
                        document.getElementById('status').textContent = 'Content script loading...';
                        return;
                    }
                    if (response) {
                        // Update killswitch button
                        const killswitchBtn = document.getElementById('toggleKillswitch');
                        if (response.killswitchEnabled) {
                            killswitchBtn.textContent = '🟢 ENABLE ALL MODIFICATIONS';
                            killswitchBtn.classList.add('enabled');
                        } else {
                            killswitchBtn.textContent = '🔴 DISABLE ALL MODIFICATIONS';
                            killswitchBtn.classList.remove('enabled');
                        }
                        
                        // Update toggle button states
                        const sidebarBtn = document.getElementById('toggleSidebar');
                        const focusBtn = document.getElementById('toggleFocusMode');
                        
                        if (response.sidebarHidden) {
                            sidebarBtn.classList.add('active');
                            sidebarBtn.textContent = '👁️ Show Sidebar';
                        } else {
                            sidebarBtn.classList.remove('active');
                            sidebarBtn.textContent = '🙈 Hide Sidebar';
                        }
                        
                        if (response.focusModeEnabled) {
                            focusBtn.classList.add('active');
                            focusBtn.textContent = '🎯 Focus Mode: ON';
                        } else {
                            focusBtn.classList.remove('active');
                            focusBtn.textContent = '🎯 Focus Mode: OFF';
                        }
                        
                        // Update keep-alive button
                        const keepAliveBtn = document.getElementById('toggleKeepAlive');
                        if (response.keepAliveEnabled) {
                            keepAliveBtn.classList.add('active');
                            keepAliveBtn.textContent = '🔄 Keep Session Alive: ON';
                        } else {
                            keepAliveBtn.classList.remove('active');
                            keepAliveBtn.textContent = '🔄 Keep Session Alive: OFF';
                        }
                        
                        document.getElementById('status').textContent = 
                            `${response.killswitchEnabled ? 'DISABLED | ' : ''}` +
                            `Font: ${response.fontSize}px | Line: ${response.lineHeight} | ` +
                            `Margins: L${response.leftMargin}px R${response.rightMargin}px | ` +
                            `Sidebar: ${response.sidebarHidden ? 'Hidden' : 'Visible'} | ` +
                            `Focus: ${response.focusModeEnabled ? 'ON' : 'OFF'} | ` +
                            `Keep-Alive: ${response.keepAliveEnabled ? 'ON' : 'OFF'}`;
                        
                        document.getElementById('version').textContent = `v${response.version}`;
                    }
                });
            }
        });
    }

    // Font size controls
    document.getElementById('increaseFontSize').addEventListener('click', function() {
        sendMessage('increaseFontSize');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('decreaseFontSize').addEventListener('click', function() {
        sendMessage('decreaseFontSize');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('resetFontSize').addEventListener('click', function() {
        sendMessage('resetFontSize');
        setTimeout(updateStatus, 100);
    });

    // Line height controls
    document.getElementById('increaseLineHeight').addEventListener('click', function() {
        sendMessage('increaseLineHeight');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('decreaseLineHeight').addEventListener('click', function() {
        sendMessage('decreaseLineHeight');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('resetLineHeight').addEventListener('click', function() {
        sendMessage('resetLineHeight');
        setTimeout(updateStatus, 100);
    });

    // Margin controls
    document.getElementById('increaseMargins').addEventListener('click', function() {
        sendMessage('increaseMargins');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('decreaseMargins').addEventListener('click', function() {
        sendMessage('decreaseMargins');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('moveLeft').addEventListener('click', function() {
        sendMessage('moveLeft');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('moveRight').addEventListener('click', function() {
        sendMessage('moveRight');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('resetMargins').addEventListener('click', function() {
        sendMessage('resetMargins');
        setTimeout(updateStatus, 100);
    });

    // Layout controls
    document.getElementById('toggleSidebar').addEventListener('click', function() {
        sendMessage('toggleSidebar');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('toggleFocusMode').addEventListener('click', function() {
        sendMessage('toggleFocusMode');
        setTimeout(updateStatus, 100);
    });

    document.getElementById('toggleKeepAlive').addEventListener('click', function() {
        sendMessage('toggleKeepAlive');
        setTimeout(updateStatus, 100);
    });

    // Navigation controls
    document.getElementById('navigateNext').addEventListener('click', function() {
        sendMessage('navigateNext');
    });

    document.getElementById('navigatePrevious').addEventListener('click', function() {
        sendMessage('navigatePrevious');
    });

    document.getElementById('scrollToTop').addEventListener('click', function() {
        sendMessage('scrollToTop');
    });

    document.getElementById('navigatePreviousDocument').addEventListener('click', function() {
        sendMessage('navigatePreviousDocument');
    });

    document.getElementById('navigateNextDocument').addEventListener('click', function() {
        sendMessage('navigateNextDocument');
    });

    document.getElementById('copyAndSwitchToNotes').addEventListener('click', function() {
        sendMessage('copyAndSwitchToNotes');
    });

    document.getElementById('viewNotes').addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'openNotesViewer'});
        window.close();
    });

    // Killswitch control
    document.getElementById('toggleKillswitch').addEventListener('click', function() {
        sendMessage('toggleKillswitch');
        setTimeout(updateStatus, 100);
    });

    // Reload extension control
    document.getElementById('reloadExtension').addEventListener('click', function() {
        // Send reload message and close popup after a brief delay
        chrome.runtime.sendMessage({action: 'reloadExtension'});
        setTimeout(function() {
            window.close();
        }, 100);
    });

    // Initial page check
    checkWestlawPage();
}); 