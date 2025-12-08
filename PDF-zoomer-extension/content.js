// PDF Zoom Memory - Content Script
// Remembers and applies zoom level for PDFs viewed in Chrome/Vivaldi's built-in PDF viewer

(function() {
  'use strict';

  const STORAGE_KEY = 'pdfZoomLevel';
  const DEFAULT_ZOOM = 100;

  // Check if this is a PDF page
  function isPDFPage() {
    // Check for PDF viewer embed
    const embed = document.querySelector('embed[type="application/pdf"]');
    if (embed) return true;

    // Check content type
    const contentType = document.contentType;
    if (contentType && contentType.includes('pdf')) return true;

    // Check URL
    const url = window.location.href.toLowerCase();
    if (url.endsWith('.pdf') || url.includes('.pdf?') || url.includes('.pdf#')) return true;

    // Check for PDF viewer structure (Chrome/Vivaldi PDF viewer)
    if (document.body && document.body.children.length === 1) {
      const child = document.body.children[0];
      if (child.tagName === 'EMBED' && child.type === 'application/pdf') return true;
    }

    return false;
  }

  // Get the PDF viewer element
  function getPDFViewer() {
    // Try to find the PDF embed element
    return document.querySelector('embed[type="application/pdf"]');
  }

  // Apply zoom by modifying the URL hash
  function applyZoom(zoomLevel) {
    const url = new URL(window.location.href);

    // Remove existing zoom parameter from hash
    let hash = url.hash;
    hash = hash.replace(/#zoom=[^&]*/g, '');
    hash = hash.replace(/&zoom=[^&]*/g, '');

    // Add new zoom
    if (hash && hash !== '#') {
      // There's existing hash content
      if (hash.includes('=')) {
        url.hash = hash + '&zoom=' + zoomLevel;
      } else {
        url.hash = 'zoom=' + zoomLevel;
      }
    } else {
      url.hash = 'zoom=' + zoomLevel;
    }

    // Only update if zoom is different
    if (window.location.href !== url.href) {
      window.location.replace(url.href);
    }
  }

  // Extract current zoom from URL if present
  function getZoomFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/zoom=(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  // Save zoom level to storage
  function saveZoom(zoomLevel) {
    chrome.storage.local.set({ [STORAGE_KEY]: zoomLevel }, () => {
      console.log('PDF Zoom Memory: Saved zoom level:', zoomLevel);
    });
  }

  // Load and apply saved zoom
  function loadAndApplyZoom() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const savedZoom = result[STORAGE_KEY];
      const currentZoom = getZoomFromURL();

      if (savedZoom && savedZoom !== currentZoom) {
        console.log('PDF Zoom Memory: Applying saved zoom level:', savedZoom);
        applyZoom(savedZoom);
      } else if (!savedZoom && !currentZoom) {
        // No saved zoom and no current zoom - use default
        console.log('PDF Zoom Memory: No saved zoom, using default');
      }
    });
  }

  // Monitor for zoom changes via URL hash
  function monitorZoomChanges() {
    let lastZoom = getZoomFromURL();

    // Check periodically for zoom changes (user manually zooming)
    setInterval(() => {
      const currentZoom = getZoomFromURL();
      if (currentZoom && currentZoom !== lastZoom) {
        lastZoom = currentZoom;
        saveZoom(currentZoom);
      }
    }, 1000);

    // Also listen for hash changes
    window.addEventListener('hashchange', () => {
      const currentZoom = getZoomFromURL();
      if (currentZoom && currentZoom !== lastZoom) {
        lastZoom = currentZoom;
        saveZoom(currentZoom);
      }
    });
  }

  // Alternative method: inject zoom via keyboard simulation
  // This works when hash-based zoom doesn't
  function setupKeyboardZoom(zoomLevel) {
    // Calculate zoom steps needed (each Ctrl+Plus/Minus is ~10-25%)
    // This is a fallback method
    console.log('PDF Zoom Memory: Keyboard zoom method available for level:', zoomLevel);
  }

  // Main initialization
  function init() {
    // Wait a moment for PDF to fully load
    setTimeout(() => {
      if (!isPDFPage()) {
        console.log('PDF Zoom Memory: Not a PDF page');
        return;
      }

      console.log('PDF Zoom Memory: PDF detected, initializing...');

      // Load and apply saved zoom
      loadAndApplyZoom();

      // Start monitoring for zoom changes
      monitorZoomChanges();

    }, 500);
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'applyZoom' && request.zoom) {
      console.log('PDF Zoom Memory: Received zoom request:', request.zoom);
      if (isPDFPage()) {
        applyZoom(request.zoom);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, reason: 'Not a PDF page' });
      }
    }
    return true;
  });

  // Run initialization
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
