// ==UserScript==
// @name         Keep Westlaw Alive
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Send periodic pings to keep Westlaw session active
// @author       You
// @match        *://*.westlaw.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration
    const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
    const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'click'];
    
    let lastActivity = Date.now();
    let pingInterval = null;
    
    // Track user activity
    function trackActivity() {
        lastActivity = Date.now();
    }
    
    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, trackActivity, true);
    });
    
    // Send keep-alive ping
    function sendKeepAlivePing() {
        console.log('Sending Westlaw keep-alive ping...');
        
        // Method 1: HEAD request to current page
        fetch(window.location.href, {
            method: 'HEAD',
            credentials: 'include'
        }).catch(() => {
            // Method 2: Simulate minimal user activity
            document.dispatchEvent(new Event('mousemove'));
        });
    }
    
    // Start the keep-alive interval
    function startKeepAlive() {
        if (pingInterval) {
            clearInterval(pingInterval);
        }
        
        pingInterval = setInterval(sendKeepAlivePing, PING_INTERVAL);
        console.log('Westlaw keep-alive started - pinging every 5 minutes continuously');
    }
    
    // Stop keep-alive when page is hidden/unloaded
    function stopKeepAlive() {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
            console.log('Westlaw keep-alive stopped');
        }
    }
    
    // Keep running even when tab is hidden - no visibility change handling needed
    
    // Handle page unload
    window.addEventListener('beforeunload', stopKeepAlive);
    
    // Initialize
    startKeepAlive();
    
    console.log('Keep Westlaw Alive script loaded');
})(); 