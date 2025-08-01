// Content script for Harris County District Clerk auto-login
(function() {
    'use strict';

    // Check if we're on the correct page
    if (window.location.href !== 'https://www.hcdistrictclerk.com/Edocs/Public/search.aspx') {
        return;
    }

    // Function to wait for element to be available
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Function to click an element
    function clickElement(element) {
        element.click();
        element.dispatchEvent(new Event('click', { bubbles: true }));
        element.dispatchEvent(new Event('mousedown', { bubbles: true }));
        element.dispatchEvent(new Event('mouseup', { bubbles: true }));
    }

    // Function to fill input field
    function fillField(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Function to click the Criminal tab (whichever is visible)
    async function clickCriminalTab() {
        try {
            // Try mobile tab first
            const mobileTab = document.querySelector('#tabCrimMobile');
            if (mobileTab && mobileTab.offsetParent !== null) {
                console.log('Clicking mobile Criminal tab');
                clickElement(mobileTab);
                return;
            }

            // Try desktop tab
            const desktopTab = document.querySelector('#tabCrim');
            if (desktopTab && desktopTab.offsetParent !== null) {
                console.log('Clicking desktop Criminal tab');
                clickElement(desktopTab);
                return;
            }

            console.log('No visible Criminal tab found');
        } catch (error) {
            console.error('Error clicking Criminal tab:', error);
        }
    }

    // Main auto-login function
    async function autoLogin() {
        try {
            console.log('Starting auto-login process');

            // Get stored credentials
            const result = await chrome.storage.local.get(['hc_username', 'hc_password']);
            
            if (!result.hc_username || !result.hc_password) {
                console.log('No credentials found, opening popup');
                chrome.runtime.sendMessage({ action: 'openPopup' });
                return;
            }

            // Wait for login fields
            const usernameField = await waitForElement('#txtUserName');
            const passwordField = await waitForElement('#txtPassword');
            const loginButton = await waitForElement('#btnLogin');

            console.log('Found login fields');

            // Fill credentials
            fillField(usernameField, result.hc_username);
            fillField(passwordField, result.hc_password);

            console.log('Filled credentials');

            // Click login button
            setTimeout(() => {
                clickElement(loginButton);
                console.log('Clicked login button');

                // Wait for page to load and then click Criminal tab
                setTimeout(() => {
                    clickCriminalTab();
                }, 2000);
            }, 500);

        } catch (error) {
            console.error('Auto-login error:', error);
        }
    }

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startAutoLogin') {
            autoLogin();
        }
    });

    // Start auto-login when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoLogin);
    } else {
        autoLogin();
    }

})(); 