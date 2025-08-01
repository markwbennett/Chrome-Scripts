(function() {
    'use strict';
    
    // Dynamic version info
    const SCRIPT_VERSION = '5.6.3';
    const BUILD_TIME = new Date().toISOString();
    
    // Page detection functions
    function isSearchPage() {
        const url = window.location.href;
        console.log('isSearchPage checking URL:', url);
        
        // Don't treat Link pages as search pages
        if (url.includes('next.westlaw.com/Link/')) {
            console.log('Link page detected - not treating as search page');
            return false;
        }
        
        const isSearch = url.includes('next.westlaw.com/Search/') ||
                        url.includes('/Search/') ||
                        url.includes('/Browse/') ||
                        url.includes('/Results/') ||
                        url.search(/\/Search\?/i) !== -1;
        
        console.log('isSearchPage result:', isSearch);
        return isSearch;
    }
    
    function isDocumentPage() {
        const url = window.location.href;
        console.log('isDocumentPage checking URL:', url);
        
        const isDocPage = url.includes('next.westlaw.com/Document') || 
                         url.includes('next.westlaw.com/Link/') ||
                         url.includes('/Link/Document/FullText') || 
                         url.includes('/Document/') ||
                         url.includes('/Cases/') ||
                         url.includes('/Statutes/') ||
                         url.includes('/Regulations/') ||
                         document.getElementById('co_document') !== null;
        
        console.log('isDocumentPage result:', isDocPage);
        return isDocPage;
    }

    // Storage helpers to replace GM functions
    async function getValue(key, defaultValue) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] !== undefined ? result[key] : defaultValue);
            });
        });
    }

    function setValue(key, value) {
        chrome.storage.local.set({[key]: value});
    }

    // ===========================================
    // MASTER KILLSWITCH MODULE
    // ===========================================
    const KILLSWITCH_STORAGE_KEY = 'westlawKillswitch';
    let killswitchEnabled = false;

    async function initializeKillswitch() {
        killswitchEnabled = await getValue(`${KILLSWITCH_STORAGE_KEY}_${currentDomain}`, false);
    }

    function toggleKillswitch() {
        killswitchEnabled = !killswitchEnabled;
        setValue(`${KILLSWITCH_STORAGE_KEY}_${currentDomain}`, killswitchEnabled);
        
        if (killswitchEnabled) {
            // Remove all modifications
            removeAllModifications();
            showNotification('All modifications disabled', 'killswitch');
        } else {
            // Re-apply all settings
            applyAllSettings();
            showNotification('All modifications enabled', 'killswitch');
        }
    }

    function removeAllModifications() {
        // Remove all style elements
        if (divStyleElement) {
            divStyleElement.remove();
            divStyleElement = null;
        }
        if (marginStyleElement) {
            marginStyleElement.remove();
            marginStyleElement = null;
        }
        if (toggleStyleElement) {
            toggleStyleElement.remove();
            toggleStyleElement = null;
        }

        if (focusStyleElement) {
            focusStyleElement.remove();
            focusStyleElement = null;
        }

        // Stop keep-alive
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
    }

    // ===========================================
    // FONT SIZE ADJUSTER MODULE
    // ===========================================
    const FONT_STORAGE_KEY = 'westlawDivFontSize';
    const LINE_HEIGHT_STORAGE_KEY = 'westlawLineHeight';
    const DEFAULT_FONT_SIZE = 18;
    const DEFAULT_LINE_HEIGHT = 1.5;
    const currentDomain = window.location.hostname;

    const TARGET_SELECTORS = [
        '.co_scrollWrapper',
        '#co_document',
        '.co_document',
        '.co_contentBlock',
        '#coid_website_documentWidgetDiv',
        '.co_paragraph',
        '.co_headnote'
    ];

    let divFontSize = DEFAULT_FONT_SIZE;
    let lineHeight = DEFAULT_LINE_HEIGHT;
    let divStyleElement = null;

    async function initializeFontSettings() {
        divFontSize = await getValue(`${FONT_STORAGE_KEY}_${currentDomain}`, DEFAULT_FONT_SIZE);
        lineHeight = await getValue(`${LINE_HEIGHT_STORAGE_KEY}_${currentDomain}`, DEFAULT_LINE_HEIGHT);
    }

    function updateDivFontSize() {
        if (killswitchEnabled) return;
        
        if (divStyleElement) {
            divStyleElement.remove();
        }

        divStyleElement = document.createElement('style');
        divStyleElement.id = 'westlaw-div-font-adjuster';

        const cssRules = TARGET_SELECTORS.map(selector => {
            return `
                ${selector} {
                    font-size: ${divFontSize}px !important;
                    line-height: ${lineHeight} !important;
                }

                ${selector} * {
                    font-size: inherit !important;
                    line-height: inherit !important;
                }

                ${selector} .co_footnoteReference,
                ${selector} .co_citatorFlagText,
                ${selector} small,
                ${selector} .small {
                    font-size: ${Math.max(divFontSize - 2, 12)}px !important;
                }

                ${selector} h1 {
                    font-size: ${divFontSize + 6}px !important;
                }

                ${selector} h2 {
                    font-size: ${divFontSize + 4}px !important;
                }

                ${selector} h3 {
                    font-size: ${divFontSize + 2}px !important;
                }

                ${selector} button,
                ${selector} input,
                ${selector} select {
                    font-size: ${Math.max(divFontSize - 1, 14)}px !important;
                }
            `;
        }).join('\n');

        divStyleElement.textContent = cssRules;
        (document.head || document.documentElement).appendChild(divStyleElement);

        setValue(`${FONT_STORAGE_KEY}_${currentDomain}`, divFontSize);
        setValue(`${LINE_HEIGHT_STORAGE_KEY}_${currentDomain}`, lineHeight);
        showNotification(`Font: ${divFontSize}px | Line height: ${lineHeight}`, 'font');
    }

    function updateLineHeight() {
        lineHeight = Math.max(1.0, Math.min(3.0, parseFloat(lineHeight.toFixed(1))));
        updateDivFontSize();
    }

    // ===========================================
    // MARGIN ADJUSTER MODULE
    // ===========================================
    const MARGIN_STORAGE_KEY_LEFT = 'westlawLeftMargin';
    const MARGIN_STORAGE_KEY_RIGHT = 'westlawRightMargin';
    const DEFAULT_LEFT_MARGIN = 50;
    const DEFAULT_RIGHT_MARGIN = 50;
    const ADJUSTMENT_STEP = 10;

    let leftMargin = DEFAULT_LEFT_MARGIN;
    let rightMargin = DEFAULT_RIGHT_MARGIN;
    let marginStyleElement = null;

    async function initializeMarginSettings() {
        leftMargin = await getValue(`${MARGIN_STORAGE_KEY_LEFT}_${currentDomain}`, DEFAULT_LEFT_MARGIN);
        rightMargin = await getValue(`${MARGIN_STORAGE_KEY_RIGHT}_${currentDomain}`, DEFAULT_RIGHT_MARGIN);
    }

    function updateMargins() {
        if (killswitchEnabled) return;
        
        if (marginStyleElement) {
            marginStyleElement.remove();
        }

        // Skip margin adjustments on search pages
        if (isSearchPage()) {
            showNotification('Margins disabled on search pages', 'margin');
            return;
        }

        marginStyleElement = document.createElement('style');
        marginStyleElement.id = 'westlaw-margin-adjuster';

        const marginRules = `
            /* Primary margin targets - avoid duplicates to prevent accumulation */
            #co_document {
                margin-left: ${leftMargin}px !important;
                margin-right: ${rightMargin}px !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                box-sizing: border-box !important;
            }

            /* Secondary targets only if co_document doesn't exist */
            .co_scrollWrapper:not(#co_document *) {
                margin-left: ${leftMargin}px !important;
                margin-right: ${rightMargin}px !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                box-sizing: border-box !important;
            }

            /* Ensure child elements inside co_document don't add extra margins */
            #co_document * {
                margin-left: 0 !important;
                margin-right: 0 !important;
            }

            /* Override Westlaw's inline styles that set 80px margins */
            [style*="margin: 0px 80px"],
            [style*="margin:0 80px"],
            [style*="margin-left: 80px"],
            [style*="margin-right: 80px"],
            [style*="margin-left:80px"],
            [style*="margin-right:80px"] {
                margin-left: ${leftMargin}px !important;
                margin-right: ${rightMargin}px !important;
            }

            /* Specific elements that might have default margins */
            #coid_website_documentWidgetDiv,
            #co_displayOptionsPreview,
            #co_documentNotes,
            #co_WarningTop {
                margin-left: ${leftMargin}px !important;
                margin-right: ${rightMargin}px !important;
            }

            /* Ensure containers don't constrain width */
            #co_contentWrapper,
            #co_mainContainer,
            #co_container,
            #co_pageContainer {
                max-width: none !important;
                width: 100% !important;
            }
        `;

        marginStyleElement.textContent = marginRules;
        (document.head || document.documentElement).appendChild(marginStyleElement);

        setValue(`${MARGIN_STORAGE_KEY_LEFT}_${currentDomain}`, leftMargin);
        setValue(`${MARGIN_STORAGE_KEY_RIGHT}_${currentDomain}`, rightMargin);
        console.log('Applied margins:', {leftMargin, rightMargin});
        showNotification(`Margins: L${leftMargin}px | R${rightMargin}px`, 'margin');
    }

    function moveLeft() {
        // Shift content left by decreasing left margin and increasing right margin
        leftMargin = Math.max(leftMargin - ADJUSTMENT_STEP, 0);
        rightMargin = Math.min(rightMargin + ADJUSTMENT_STEP, 300);
        updateMargins();
        showNotification(`Shifted left: L${leftMargin}px | R${rightMargin}px`, 'margin');
    }

    function moveRight() {
        // Shift content right by increasing left margin and decreasing right margin
        leftMargin = Math.min(leftMargin + ADJUSTMENT_STEP, 300);
        rightMargin = Math.max(rightMargin - ADJUSTMENT_STEP, 0);
        updateMargins();
        showNotification(`Shifted right: L${leftMargin}px | R${rightMargin}px`, 'margin');
    }

    // ===========================================
    // SIDEBAR TOGGLE MODULE
    // ===========================================
    const SIDEBAR_STORAGE_KEY = 'westlawSidebarHidden';

    const SIDEBAR_SELECTORS = [
        '#co_rightColumn',
        '#co_footerContainer',
        'aside[role="complementary"]',
        '#coid_website_relatedInfoWidgetDiv',
        '#coid_website_recommendedDocuments',
        '#coid_website_documentToolWidgetDiv',
        '.co_relatedinfo_topic_container',
        '.co_recommendedDocumentContainer',
        '[id*="relatedInfo"]',
        '.co_rightRail',
        '.co_sideBar'
    ];

    let sidebarHidden = false;
    let toggleStyleElement = null;

    async function initializeSidebarSettings() {
        sidebarHidden = await getValue(`${SIDEBAR_STORAGE_KEY}_${currentDomain}`, false);
    }

    function updateSidebarVisibility() {
        if (killswitchEnabled) return;
        
        // Skip sidebar modifications on search pages
        if (isSearchPage()) {
            console.log('Sidebar modifications disabled on search pages');
            if (toggleStyleElement) {
                toggleStyleElement.remove();
                toggleStyleElement = null;
            }
            return;
        }
        
        // Skip sidebar modifications on RelatedInformation pages
        if (window.location.href.includes('next.westlaw.com/RelatedInformation/')) {
            console.log('Sidebar modifications disabled on RelatedInformation pages');
            if (toggleStyleElement) {
                toggleStyleElement.remove();
                toggleStyleElement = null;
            }
            return;
        }
        
        if (toggleStyleElement) {
            toggleStyleElement.remove();
        }

        if (sidebarHidden) {
            toggleStyleElement = document.createElement('style');
            toggleStyleElement.id = 'westlaw-sidebar-toggle';
            
            const hideRules = SIDEBAR_SELECTORS.map(selector => 
                `${selector} { 
                    display: none !important; 
                    height: 0 !important;
                    min-height: 0 !important;
                    max-height: 0 !important;
                    width: 0 !important;
                    min-width: 0 !important;
                    max-width: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    overflow: hidden !important;
                }`
            ).join('\n');

            // Additional rules to expand main content when sidebar is hidden
            const expandRules = `
                /* Expand main content to fill reclaimed space */
                #co_contentWrapper,
                #co_mainContainer,
                #co_container,
                #co_pageContainer {
                    max-width: none !important;
                    width: 100% !important;
                }
                
                /* Ensure document content uses full width */
                .co_scrollWrapper,
                #co_document,
                .co_document {
                    max-width: 100% !important;
                    width: 100% !important;
                }
            `;

            toggleStyleElement.textContent = hideRules + '\n' + expandRules;
            (document.head || document.documentElement).appendChild(toggleStyleElement);
        }

        setValue(`${SIDEBAR_STORAGE_KEY}_${currentDomain}`, sidebarHidden);
        showNotification(`Sidebar: ${sidebarHidden ? 'Hidden' : 'Visible'}`, 'sidebar');
    }

    function toggleSidebar() {
        sidebarHidden = !sidebarHidden;
        updateSidebarVisibility();
    }



    // ===========================================
    // FOCUS MODE MODULE
    // ===========================================
    const FOCUS_MODE_STORAGE_KEY = 'westlawFocusMode';



    let focusModeEnabled = false;
    let focusStyleElement = null;

    async function initializeFocusSettings() {
        focusModeEnabled = await getValue(`${FOCUS_MODE_STORAGE_KEY}_${currentDomain}`, false);
    }

    function updateFocusMode() {
        console.log('updateFocusMode called:', {
            killswitchEnabled,
            focusModeEnabled,
            isDocumentPage: isDocumentPage(),
            currentURL: window.location.href
        });
        
        if (killswitchEnabled) {
            console.log('Focus mode blocked by killswitch');
            return;
        }
        
        if (focusStyleElement) {
            focusStyleElement.remove();
            console.log('Removed existing focus style element');
        }

        // Only apply focus mode on document pages, not search pages
        if (focusModeEnabled && isDocumentPage() && !isSearchPage()) {
            console.log('Applying focus mode...');
            
            // Check if #co_document exists
            const docElement = document.getElementById('co_document');
            console.log('Document element found:', !!docElement, docElement);
            
            focusStyleElement = document.createElement('style');
            focusStyleElement.id = 'westlaw-focus-mode';
            
            // Use display: none to completely remove elements from layout
            const focusRules = `
                /* Hide header elements and their containers */
                #co_headerWrapper,
                #co_headerContainer,
                #co_docHeaderContainer,
                #co_docHeader,
                header,
                .co_header,
                [class*="header"],
                [id*="header"] {
                    display: none !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* Remove any top spacing from main containers */
                #co_pageContainer,
                #co_mainContainer,
                #co_contentColumn {
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                }
                
                /* Ensure notification is visible */
                #westlaw-notification {
                    z-index: 10000 !important;
                    display: block !important;
                }
            `;

            focusStyleElement.textContent = focusRules;
            (document.head || document.documentElement).appendChild(focusStyleElement);
            
            console.log('Focus mode CSS applied:', focusStyleElement);
        } else {
            console.log('Focus mode not applied:', {
                focusModeEnabled,
                isDocumentPage: isDocumentPage()
            });
        }

        setValue(`${FOCUS_MODE_STORAGE_KEY}_${currentDomain}`, focusModeEnabled);
        
        let status;
        if (focusModeEnabled && !isDocumentPage()) {
            status = 'ON (only works on document pages)';
        } else {
            status = focusModeEnabled ? 'ON' : 'OFF';
        }
        showNotification(`Focus Mode: ${status}`, 'focus');
    }

    function toggleFocusMode() {
        console.log('toggleFocusMode called, current state:', focusModeEnabled);
        focusModeEnabled = !focusModeEnabled;
        console.log('toggleFocusMode new state:', focusModeEnabled);
        updateFocusMode();
    }

    // ===========================================
    // KEEP ALIVE MODULE
    // ===========================================
    const KEEP_ALIVE_STORAGE_KEY = 'westlawKeepAlive';
    const KEEP_ALIVE_MASTER_KEY = 'westlawKeepAliveMaster';
    let keepAliveEnabled = false;
    let keepAliveInterval = null;
    let isKeepAliveMaster = false;
    const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const MASTER_HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
    const tabId = Math.random().toString(36).substr(2, 9); // Unique tab identifier

    async function initializeKeepAliveSettings() {
        keepAliveEnabled = await getValue(`${KEEP_ALIVE_STORAGE_KEY}_${currentDomain}`, false);
        await checkKeepAliveMaster();
    }

    async function checkKeepAliveMaster() {
        const masterInfo = await getValue(KEEP_ALIVE_MASTER_KEY, null);
        const now = Date.now();
        
        // If no master exists or master is stale (no heartbeat for 60 seconds)
        if (!masterInfo || (now - masterInfo.lastHeartbeat) > 60000) {
            // Become the master
            isKeepAliveMaster = true;
            await setValue(KEEP_ALIVE_MASTER_KEY, {
                tabId: tabId,
                lastHeartbeat: now
            });
            console.log('Became keep-alive master tab:', tabId);
        } else if (masterInfo.tabId === tabId) {
            // We are already the master
            isKeepAliveMaster = true;
        } else {
            // Another tab is the master
            isKeepAliveMaster = false;
            console.log('Another tab is keep-alive master:', masterInfo.tabId);
        }
    }

    async function updateMasterHeartbeat() {
        if (isKeepAliveMaster) {
            await setValue(KEEP_ALIVE_MASTER_KEY, {
                tabId: tabId,
                lastHeartbeat: Date.now()
            });
        }
    }

    function sendKeepAlivePing() {
        console.log('Sending Westlaw keep-alive ping...');
        
        // HEAD request to current page
        fetch(window.location.href, {
            method: 'HEAD',
            credentials: 'include'
        }).catch(() => {
            // Fallback: simulate minimal user activity
            document.dispatchEvent(new Event('mousemove'));
        });
    }

    function updateKeepAlive() {
        if (killswitchEnabled) {
            console.log('Keep-alive blocked by killswitch');
            return;
        }
        
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }

        if (keepAliveEnabled && isKeepAliveMaster) {
            keepAliveInterval = setInterval(sendKeepAlivePing, KEEP_ALIVE_INTERVAL);
            console.log('Keep-alive started - pinging every 5 minutes (master tab)');
        } else if (keepAliveEnabled && !isKeepAliveMaster) {
            console.log('Keep-alive enabled but another tab is master');
        } else {
            console.log('Keep-alive stopped');
        }

        setValue(`${KEEP_ALIVE_STORAGE_KEY}_${currentDomain}`, keepAliveEnabled);
        
        let status = keepAliveEnabled ? 'ON' : 'OFF';
        if (keepAliveEnabled && !isKeepAliveMaster) {
            status += ' (delegated to other tab)';
        }
        showNotification(`Keep Session Alive: ${status}`, 'keepalive');
    }

    async function toggleKeepAlive() {
        console.log('toggleKeepAlive called, current state:', keepAliveEnabled);
        keepAliveEnabled = !keepAliveEnabled;
        console.log('toggleKeepAlive new state:', keepAliveEnabled);
        
        // Re-check master status when toggling
        await checkKeepAliveMaster();
        updateKeepAlive();
    }

    // ===========================================
    // NOTIFICATION SYSTEM
    // ===========================================
    function showNotification(message, type) {
        const existingNotification = document.getElementById('westlaw-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'westlaw-notification';
        notification.textContent = message;
        
        const typeColors = {
            font: '#4CAF50',
            margin: '#2196F3', 
            sidebar: '#FF9800',
            focus: '#9C27B0',
            navigation: '#607D8B',
            killswitch: '#F44336',
            keepalive: '#17a2b8'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${typeColors[type] || '#333'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification && notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 2000);
    }

    // ===========================================
    // NAVIGATION FUNCTIONS
    // ===========================================
    function navigateNext() {
        const button = document.getElementById('co_documentFooterSearchTermNavigationNext');
        if (button && button.getAttribute('aria-disabled') !== 'true') {
            button.click();
            showNotification('Next search term', 'navigation');
        } else {
            showNotification('No next search term', 'navigation');
        }
    }

    function navigatePrevious() {
        const button = document.getElementById('co_documentFooterSearchTermNavigationPrevious');
        if (button && button.getAttribute('aria-disabled') !== 'true') {
            button.click();
            showNotification('Previous search term', 'navigation');
        } else {
            showNotification('No previous search term', 'navigation');
        }
    }

    function scrollToTop() {
        // Check if already at top of page
        if (window.scrollY === 0 || window.pageYOffset === 0) {
            // Already at top, navigate to previous document
            navigatePreviousDocument();
        } else {
            // Not at top, scroll to top
            window.scrollTo(0, 0);
            showNotification('Scrolled to top', 'navigation');
        }
    }

    function scrollToBottom() {
        // Check if already at bottom of page
        if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
            // Already at bottom, navigate to next document
            navigateNextDocument();
        } else {
            // Not at bottom, scroll to bottom
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
            showNotification('Scrolled to bottom', 'navigation');
        }
    }

    function navigatePreviousDocument() {
        const prevButton = document.getElementById('co_documentFooterResultsNavigationPrevious');
        if (prevButton && prevButton.getAttribute('aria-disabled') !== 'true') {
            prevButton.click();
            showNotification('Previous document', 'navigation');
        } else {
            showNotification('Already at first document', 'navigation');
        }
    }

    function navigateNextDocument() {
        const nextButton = document.getElementById('co_documentFooterResultsNavigationNext');
        if (nextButton && nextButton.getAttribute('aria-disabled') !== 'true') {
            nextButton.click();
            showNotification('Next document', 'navigation');
        } else {
            showNotification('Already at last document', 'navigation');
        }
    }

    function copyAndSwitchToNotes() {
        // Try to extract selected text first, fallback to copying with reference
        const selectedText = window.getSelection().toString().trim();
        
        if (selectedText) {
            // Use selected text as quotation
            saveQuotationToNotes(selectedText);
        } else {
            // Try to click copy button and extract from clipboard or page
            const button = document.querySelector('button.co_copyWithRefLabel');
            const copyContainer = document.querySelector('.co_copyWithRefContainer');
            
            if (button && copyContainer && !copyContainer.hidden && copyContainer.style.display !== 'none') {
                button.click();
                showNotification('Copied with reference', 'navigation');
                
                // Use robust clipboard reading with retries
                readClipboardWithRetries();
            } else {
                showNotification('Copy button not found - please select text to save', 'navigation');
            }
        }
    }

    function extractAndSaveQuotation() {
        // Try to find quotable content on the page
        const documentContent = document.querySelector('.co_document, #co_document, .co_contentBlock');
        if (documentContent) {
            // Get first paragraph or meaningful content as fallback
            const firstParagraph = documentContent.querySelector('p, .co_paragraph');
            if (firstParagraph) {
                const text = firstParagraph.textContent.trim();
                if (text.length > 10) {
                    saveQuotationToNotes(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
                    return;
                }
            }
        }
        
        // Fallback: just open notes viewer
        openNotesViewer();
        showNotification('Please select text before saving quotations', 'navigation');
    }

    function saveQuotationToNotes(quotation) {
        const pageTitle = document.title;
        const url = window.location.href;
        
        const noteEntry = {
            quotation: quotation,
            citation: '', // Don't add extra citation
            pageTitle: pageTitle,
            url: url,
            timestamp: new Date().toISOString()
        };
        
        // Get existing notes and prepend new one
        chrome.storage.local.get(['westlawNotes'], function(result) {
            const notes = result.westlawNotes || [];
            notes.unshift(noteEntry); // Add to beginning instead of end
            
            chrome.storage.local.set({ westlawNotes: notes }, function() {
                showNotification('Quotation saved to notes', 'navigation');
                openNotesViewer();
            });
        });
    }

    function extractCitation() {
        // Try to find citation information on the page
        const citationSelectors = [
            '.co_citationData',
            '.co_title',
            '.co_documentTitle',
            '#co_documentTitle',
            '[data-testid="citation"]',
            '.citation',
            'h1'
        ];
        
        for (const selector of citationSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        // Fallback to document title
        return document.title || 'Citation not found';
    }

    function openNotesViewer() {
        chrome.runtime.sendMessage({action: 'openNotesViewer'});
    }

         async function readClipboardWithRetries() {
         const maxRetries = 3;
         const initialDelay = 800; // Wait longer initially for copy operation
         const retryDelay = 300; // Shorter retry intervals

         // Wait initial delay for copy operation to complete
         await new Promise(resolve => setTimeout(resolve, initialDelay));

         for (let i = 0; i < maxRetries; i++) {
             try {
                 const text = await navigator.clipboard.readText();
                 if (text && text.trim()) {
                     // Use clipboard content exactly as-is
                     const quotation = text.trim();
                     
                     if (quotation) {
                         const noteEntry = {
                             quotation: quotation,
                             citation: '', // Don't extract citation, clipboard has everything needed
                             pageTitle: document.title,
                             url: window.location.href,
                             timestamp: new Date().toISOString()
                         };
                         
                         // Save to storage first, then open notes viewer after ensuring save is complete
                         chrome.storage.local.get(['westlawNotes'], function(result) {
                             const notes = result.westlawNotes || [];
                             notes.unshift(noteEntry); // Add to beginning instead of end
                             
                             chrome.storage.local.set({ westlawNotes: notes }, function() {
                                 showNotification('Quotation saved to notes', 'navigation');
                                 // Small delay to ensure storage operation is fully committed
                                 setTimeout(() => {
                                     openNotesViewer();
                                 }, 100);
                             });
                         });
                         return; // Exit if successful
                     }
                 }
                 
                 // If we reach here, clipboard was empty or had no valid content
                 if (i === maxRetries - 1) {
                     showNotification('Clipboard is empty or contains no valid content', 'navigation');
                 }
             } catch (err) {
                 console.error(`Clipboard read attempt ${i + 1} failed:`, err);
                 
                 if (err.name === 'NotAllowedError') {
                     showNotification('Clipboard access denied. Please allow clipboard permissions.', 'navigation');
                     return;
                 } else if (i === maxRetries - 1) {
                     // Only show error on final attempt
                     showNotification(`Failed to read clipboard: ${err.message}`, 'navigation');
                 }
             }
             
             // Wait before retry (except on last iteration)
             if (i < maxRetries - 1) {
                 await new Promise(resolve => setTimeout(resolve, retryDelay));
             }
         }
     }

     async function readClipboardAndSave() {
         try {
             const text = await navigator.clipboard.readText();
             if (text.trim()) {
                 // Use clipboard content exactly as-is
                 const quotation = text.trim();
                 
                 if (quotation) {
                     const noteEntry = {
                         quotation: quotation,
                         citation: '', // Don't extract citation, clipboard has everything needed
                         pageTitle: document.title,
                         url: window.location.href,
                         timestamp: new Date().toISOString()
                     };
                     
                     // Save to storage first, then open notes viewer after ensuring save is complete
                     chrome.storage.local.get(['westlawNotes'], function(result) {
                         const notes = result.westlawNotes || [];
                         notes.unshift(noteEntry); // Add to beginning instead of end
                         
                         chrome.storage.local.set({ westlawNotes: notes }, function() {
                             showNotification('Quotation saved to notes', 'navigation');
                             // Small delay to ensure storage operation is fully committed
                             setTimeout(() => {
                                 openNotesViewer();
                             }, 100);
                         });
                     });
                 } else {
                     showNotification('No valid content found in clipboard', 'navigation');
                 }
             } else {
                 showNotification('Clipboard is empty', 'navigation');
             }
         } catch (err) {
             console.error('Clipboard read failed:', err);
             console.error('Error details:', err.name, err.message);
             
             if (err.name === 'NotAllowedError') {
                 showNotification('Clipboard access denied. Please allow clipboard permissions.', 'navigation');
             } else if (err.name === 'NotFoundError') {
                 showNotification('No text found in clipboard.', 'navigation');
             } else {
                 showNotification(`Could not read clipboard: ${err.message}`, 'navigation');
             }
         }
     }

    // ===========================================
    // OPINION COLORIZER MODULE
    // ===========================================
    let opinionStyleElement = null;

    function updateOpinionColors() {
        if (killswitchEnabled) return;
        
        if (opinionStyleElement) {
            opinionStyleElement.remove();
        }

        opinionStyleElement = document.createElement('style');
        opinionStyleElement.id = 'westlaw-opinion-colorizer';

        const colorRules = `
            /* Very light pink for dissent sections */
            .co_contentBlock.x_opinionDissent,
            div[class*="dissent"] {
                background-color: rgba(255, 182, 193, 0.15) !important; /* slightly darker light pink */
            }

            /* Very light yellow for concur/concurrence sections */
            .co_contentBlock.x_opinionConcur,
            .co_contentBlock.x_opinionConcurrence,
            .co_contentBlock.x_opinionConcurrance,
            div[class*="concur"] {
                background-color: rgba(255, 255, 0, 0.1) !important; /* light yellow */
            }
        `;

        opinionStyleElement.textContent = colorRules;
        (document.head || document.documentElement).appendChild(opinionStyleElement);
    }

    // ===========================================
    // KEYBOARD SHORTCUTS
    // ===========================================
    document.addEventListener('keydown', function(e) {
        if (document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA' &&
            !document.activeElement.isContentEditable) {

            // Search term navigation (within document)
            if ((e.key === 'n' || e.key === 'ArrowRight') && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                navigateNext();
                e.preventDefault();
            }

            if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                navigatePrevious();
                e.preventDefault();
            }

            // Document navigation (between documents)
            if (e.key === 'ArrowLeft' && e.shiftKey && !e.ctrlKey && !e.altKey) {
                navigatePreviousDocument();
                e.preventDefault();
            }

            if (e.key === 'ArrowRight' && e.shiftKey && !e.ctrlKey && !e.altKey) {
                navigateNextDocument();
                e.preventDefault();
            }

            // Scroll to top / previous document
            if (e.key === 'ArrowUp' && e.shiftKey && !e.ctrlKey && !e.altKey) {
                scrollToTop();
                e.preventDefault();
            }

            // Scroll to bottom
            if (e.key === 'ArrowDown' && e.shiftKey && !e.ctrlKey && !e.altKey) {
                scrollToBottom();
                e.preventDefault();
            }

            // Copy and notes
            if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                // Check if the Copy with Reference button is visible
                const copyButton = document.querySelector('button.co_copyWithRefLabel');
                const copyContainer = document.querySelector('.co_copyWithRefContainer');
                
                if (copyButton && copyContainer && !copyContainer.hidden && copyContainer.style.display !== 'none') {
                    // Click the Copy with Reference button directly
                    copyButton.click();
                    showNotification('Copied with reference', 'navigation');
                    
                    // Use robust clipboard reading with retries
                    readClipboardWithRetries();
                    e.preventDefault();
                }
                // If no copy button available, do nothing (don't prevent default)
            }
        }
    });

    // ===========================================
    // MESSAGE LISTENER FOR POPUP COMMANDS
    // ===========================================
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch(request.action) {
            case 'increaseFontSize':
                divFontSize = Math.min(divFontSize + 1, 36);
                updateDivFontSize();
                break;
            case 'decreaseFontSize':
                divFontSize = Math.max(divFontSize - 1, 10);
                updateDivFontSize();
                break;
            case 'resetFontSize':
                divFontSize = DEFAULT_FONT_SIZE;
                updateDivFontSize();
                break;
            case 'increaseLineHeight':
                lineHeight += 0.1;
                updateLineHeight();
                break;
            case 'decreaseLineHeight':
                lineHeight -= 0.1;
                updateLineHeight();
                break;
            case 'resetLineHeight':
                lineHeight = DEFAULT_LINE_HEIGHT;
                updateLineHeight();
                break;
            case 'increaseMargins':
                console.log('Before increase:', {leftMargin, rightMargin});
                leftMargin = Math.min(leftMargin + ADJUSTMENT_STEP, 300);
                rightMargin = Math.min(rightMargin + ADJUSTMENT_STEP, 300);
                console.log('After increase:', {leftMargin, rightMargin, ADJUSTMENT_STEP});
                updateMargins();
                break;
            case 'decreaseMargins':
                console.log('Before decrease:', {leftMargin, rightMargin});
                leftMargin = Math.max(leftMargin - ADJUSTMENT_STEP, 0);
                rightMargin = Math.max(rightMargin - ADJUSTMENT_STEP, 0);
                console.log('After decrease:', {leftMargin, rightMargin, ADJUSTMENT_STEP});
                updateMargins();
                break;
            case 'moveLeft':
                moveLeft();
                break;
            case 'moveRight':
                moveRight();
                break;
            case 'resetMargins':
                leftMargin = DEFAULT_LEFT_MARGIN;
                rightMargin = DEFAULT_RIGHT_MARGIN;
                updateMargins();
                break;
            case 'toggleSidebar':
                toggleSidebar();
                break;
            case 'toggleFocusMode':
                toggleFocusMode();
                break;
            case 'toggleKeepAlive':
                toggleKeepAlive();
                break;
            case 'navigateNext':
                navigateNext();
                break;
            case 'navigatePrevious':
                navigatePrevious();
                break;
            case 'scrollToTop':
                scrollToTop();
                break;
            case 'scrollToBottom':
                scrollToBottom();
                break;
            case 'navigatePreviousDocument':
                navigatePreviousDocument();
                break;
            case 'navigateNextDocument':
                navigateNextDocument();
                break;
            case 'copyAndSwitchToNotes':
                copyAndSwitchToNotes();
                break;
            case 'toggleKillswitch':
                toggleKillswitch();
                break;
            case 'getStatus':
                sendResponse({
                    fontSize: divFontSize,
                    lineHeight: lineHeight,
                    leftMargin: leftMargin,
                    rightMargin: rightMargin,
                    sidebarHidden: sidebarHidden,
                    focusModeEnabled: focusModeEnabled,
                    keepAliveEnabled: keepAliveEnabled,
                    killswitchEnabled: killswitchEnabled,
                    version: SCRIPT_VERSION
                });
                break;
        }
    });

    // ===========================================
    // INITIALIZATION
    // ===========================================
    async function applyAllSettings() {
        updateDivFontSize();
        updateMargins();
        updateSidebarVisibility();
        updateFocusMode();
        updateKeepAlive();
        updateOpinionColors();  // Add this line
    }

    async function initialize() {
        await initializeKillswitch();
        await initializeFontSettings();
        await initializeMarginSettings();
        await initializeSidebarSettings();
        await initializeFocusSettings();
        await initializeKeepAliveSettings();
        
        applyAllSettings();
        
        // Apply settings with delays for dynamic content
        setTimeout(applyAllSettings, 500);
        setTimeout(applyAllSettings, 1500);
        
        // Check for join session button
        setTimeout(autoJoinSession, 1000);
        setTimeout(autoJoinSession, 3000);
        
        // Start heartbeat for keep-alive master coordination
        setInterval(updateMasterHeartbeat, MASTER_HEARTBEAT_INTERVAL);
        setInterval(checkKeepAliveMaster, MASTER_HEARTBEAT_INTERVAL * 2);
    }

    // ===========================================
    // AUTO-JOIN SESSION
    // ===========================================
    function autoJoinSession() {
        const joinButton = document.querySelector('button[name="JoinSession"]');
        if (joinButton && joinButton.textContent.trim() === 'Join session') {
            console.log('Auto-clicking Join session button');
            joinButton.click();
            showNotification('Auto-joined session', 'navigation');
        }
    }

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Observe changes for dynamic content
    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const hasTargetContent = TARGET_SELECTORS.some(selector => {
                            return node.matches && (node.matches(selector) || node.querySelector(selector));
                        });

                        if (hasTargetContent) {
                            shouldUpdate = true;
                            break;
                        }
                        
                        // Also check for join session button
                        if (node.querySelector && node.querySelector('button[name="JoinSession"]')) {
                            setTimeout(autoJoinSession, 500);
                        }
                    }
                }
            }
        });

        if (shouldUpdate) {
            clearTimeout(observer.timeoutId);
            observer.timeoutId = setTimeout(applyAllSettings, 300);
        }
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Handle page unload - clean up keep-alive interval and master status
    window.addEventListener('beforeunload', async function() {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        
        // Clear master status if we were the master
        if (isKeepAliveMaster) {
            await setValue(KEEP_ALIVE_MASTER_KEY, null);
        }
    });

    console.log(`Westlaw Combined Enhancements v${SCRIPT_VERSION} loaded at ${new Date().toLocaleTimeString()} (Built: ${BUILD_TIME}). Navigation keys: N/Right (next term), Left (prev term), Shift+Left/Right (prev/next doc), Up (top/prev doc), Enter (copy). Controls via extension popup.`);

})(); 