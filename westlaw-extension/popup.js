document.addEventListener('DOMContentLoaded', function() {
    
    // Load feature toggles from storage
    function loadFeatureToggles() {
        chrome.storage.local.get({
            fontSizeEnabled: true,
            lineHeightEnabled: true,
            marginsEnabled: true,
            sidebarEnabled: true,
            focusModeEnabled: true,
            keepAliveEnabled: true,
            searchNavEnabled: true,
            docNavEnabled: true,
            notesEnabled: true,
            opinionBordersEnabled: true,
            opinionHighlightingEnabled: true
        }, function(items) {
            document.getElementById('toggleFontSize').checked = items.fontSizeEnabled;
            document.getElementById('toggleLineHeight').checked = items.lineHeightEnabled;
            document.getElementById('toggleMargins').checked = items.marginsEnabled;
            document.getElementById('toggleSidebarFeature').checked = items.sidebarEnabled;
            document.getElementById('toggleFocusModeFeature').checked = items.focusModeEnabled;
            document.getElementById('toggleKeepAliveFeature').checked = items.keepAliveEnabled;
            document.getElementById('toggleSearchNav').checked = items.searchNavEnabled;
            document.getElementById('toggleDocNav').checked = items.docNavEnabled;
            document.getElementById('toggleNotesFeature').checked = items.notesEnabled;
            document.getElementById('toggleOpinionBorders').checked = items.opinionBordersEnabled;
            document.getElementById('toggleOpinionHighlighting').checked = items.opinionHighlightingEnabled;
            
            updateFeatureVisibility();
        });
    }
    
    // Save feature toggles to storage
    function saveFeatureToggle(feature, enabled) {
        chrome.storage.local.set({[feature]: enabled}, function() {
            updateFeatureVisibility();
        });
    }
    
    // Update visibility of feature sections based on toggles
    function updateFeatureVisibility() {
        const fontSizeEnabled = document.getElementById('toggleFontSize').checked;
        const lineHeightEnabled = document.getElementById('toggleLineHeight').checked;
        const marginsEnabled = document.getElementById('toggleMargins').checked;
        const sidebarEnabled = document.getElementById('toggleSidebarFeature').checked;
        const focusModeEnabled = document.getElementById('toggleFocusModeFeature').checked;
        const keepAliveEnabled = document.getElementById('toggleKeepAliveFeature').checked;
        const searchNavEnabled = document.getElementById('toggleSearchNav').checked;
        const docNavEnabled = document.getElementById('toggleDocNav').checked;
        const notesEnabled = document.getElementById('toggleNotesFeature').checked;
        
        document.getElementById('fontSizeSection').style.display = fontSizeEnabled ? 'block' : 'none';
        document.getElementById('lineHeightSection').style.display = lineHeightEnabled ? 'block' : 'none';
        document.getElementById('marginsSection').style.display = marginsEnabled ? 'block' : 'none';
        document.getElementById('layoutSection').style.display = (sidebarEnabled || focusModeEnabled) ? 'block' : 'none';
        document.getElementById('sessionSection').style.display = keepAliveEnabled ? 'block' : 'none';
        document.getElementById('navigationSection').style.display = (searchNavEnabled || docNavEnabled || notesEnabled) ? 'block' : 'none';
    }
    
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
                // Show controls for debugging
                document.getElementById("controls").style.display = "block";
                document.getElementById("westlaw-warning").style.display = "none";
                document.getElementById("status").textContent = "Debug mode: Controls visible on all pages";
            }        });
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
                            focusBtn.textContent = '�� Focus Mode: OFF';
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
                        
                        // Update citing references button
                        const citingRefsBtn = document.getElementById('toggleCitingReferencesFocus');
                        if (response.citingReferencesEnabled) {
                            citingRefsBtn.classList.add('active');
                            citingRefsBtn.textContent = '📋 Citing References Focus: ON';
                        } else {
                            citingRefsBtn.classList.remove('active');
                            citingRefsBtn.textContent = '📋 Citing References Focus: OFF';
                        }
                        
                        document.getElementById('status').textContent = 
                            `${response.killswitchEnabled ? 'DISABLED | ' : ''}` +
                            `Font: ${response.fontSize}px | Line: ${response.lineHeight} | ` +
                            `Margins: L${response.leftMargin}px R${response.rightMargin}px | ` +
                            `Sidebar: ${response.sidebarHidden ? 'Hidden' : 'Visible'} | ` +
                            `Focus: ${response.focusModeEnabled ? 'ON' : 'OFF'} | ` +
                            `Keep-Alive: ${response.keepAliveEnabled ? 'ON' : 'OFF'}`;
                        
                        document.getElementById('version').textContent = `v${response.version || '1.5'}`;
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

    document.getElementById('toggleCitingReferencesFocus').addEventListener('click', function() {
        sendMessage('toggleCitingReferencesFocus');
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

    // Feature toggle event listeners
    document.getElementById('toggleFontSize').addEventListener('change', function() {
        saveFeatureToggle('fontSizeEnabled', this.checked);
    });

    document.getElementById('toggleLineHeight').addEventListener('change', function() {
        saveFeatureToggle('lineHeightEnabled', this.checked);
    });

    document.getElementById('toggleMargins').addEventListener('change', function() {
        saveFeatureToggle('marginsEnabled', this.checked);
    });

    document.getElementById('toggleSidebarFeature').addEventListener('change', function() {
        saveFeatureToggle('sidebarEnabled', this.checked);
    });

    document.getElementById('toggleFocusModeFeature').addEventListener('change', function() {
        saveFeatureToggle('focusModeEnabled', this.checked);
    });

    document.getElementById('toggleKeepAliveFeature').addEventListener('change', function() {
        saveFeatureToggle('keepAliveEnabled', this.checked);
    });

    document.getElementById('toggleSearchNav').addEventListener('change', function() {
        saveFeatureToggle('searchNavEnabled', this.checked);
    });

    document.getElementById('toggleDocNav').addEventListener('change', function() {
        saveFeatureToggle('docNavEnabled', this.checked);
    });

    document.getElementById('toggleNotesFeature').addEventListener('change', function() {
        saveFeatureToggle('notesEnabled', this.checked);
    });

    document.getElementById('toggleOpinionBorders').addEventListener('change', function() {
        saveFeatureToggle('opinionBordersEnabled', this.checked);
        sendMessage('toggleOpinionBorders');
    });

    document.getElementById('toggleOpinionHighlighting').addEventListener('change', function() {
        saveFeatureToggle('opinionHighlightingEnabled', this.checked);
        sendMessage('toggleOpinionHighlighting');
    });

    // Initial page check and load toggles
    checkWestlawPage();
    loadFeatureToggles();
    
    // Set fallback version
    document.getElementById('version').textContent = 'v1.5';});
