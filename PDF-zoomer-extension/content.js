// PDF Zoom Memory - Content Script
// Remembers and applies zoom level for PDFs viewed in Chrome/Vivaldi's built-in PDF viewer

(function() {
  'use strict';

  const STORAGE_KEY = 'pdfZoomLevel';
  const DEFAULT_ZOOM = 149;

  // Check if this is a PDF page
  function isPDFPage() {
    // Check for PDF viewer embed
    const embed = document.querySelector('embed[type="application/pdf"]');
    if (embed) return true;

    // Check for object tag with PDF
    const obj = document.querySelector('object[type="application/pdf"]');
    if (obj) return true;

    // Check content type
    const contentType = document.contentType;
    if (contentType && contentType.includes('pdf')) return true;

    // Check URL patterns
    const url = window.location.href.toLowerCase();
    if (url.endsWith('.pdf') || url.includes('.pdf?') || url.includes('.pdf#')) return true;

    // Check for PDF viewer structure (Chrome/Vivaldi PDF viewer)
    if (document.body && document.body.children.length === 1) {
      const child = document.body.children[0];
      if (child.tagName === 'EMBED' && child.type === 'application/pdf') return true;
    }

    // Check if we're in a frame that's a PDF
    try {
      if (window.frameElement && window.frameElement.src &&
          window.frameElement.src.toLowerCase().includes('.pdf')) {
        return true;
      }
    } catch (e) {
      // Cross-origin frame, ignore
    }

    return false;
  }

  // Find embedded PDF elements (iframe, embed, object) and apply zoom to their src
  function findAndZoomEmbeddedPDFs(zoomLevel) {
    let found = false;

    // Check iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src || '';
      if (src.toLowerCase().includes('.pdf') || src.includes('application/pdf')) {
        console.log('PDF Zoom Memory: Found PDF iframe:', src);
        applyZoomToUrl(iframe, 'src', zoomLevel);
        found = true;
      }
    });

    // Check embeds
    document.querySelectorAll('embed').forEach(embed => {
      const src = embed.src || '';
      const type = embed.type || '';
      if (src.toLowerCase().includes('.pdf') || type.includes('pdf')) {
        console.log('PDF Zoom Memory: Found PDF embed:', src);
        applyZoomToUrl(embed, 'src', zoomLevel);
        found = true;
      }
    });

    // Check objects
    document.querySelectorAll('object').forEach(obj => {
      const data = obj.data || '';
      const type = obj.type || '';
      if (data.toLowerCase().includes('.pdf') || type.includes('pdf')) {
        console.log('PDF Zoom Memory: Found PDF object:', data);
        applyZoomToUrl(obj, 'data', zoomLevel);
        found = true;
      }
    });

    return found;
  }

  // Apply zoom to an element's URL attribute
  function applyZoomToUrl(element, attr, zoomLevel) {
    const currentUrl = element[attr];
    if (!currentUrl) return;

    try {
      const url = new URL(currentUrl, window.location.href);

      // Remove existing zoom from hash
      let hash = url.hash;
      hash = hash.replace(/#zoom=[^&]*/g, '');
      hash = hash.replace(/&zoom=[^&]*/g, '');

      // Add new zoom
      if (hash && hash !== '#') {
        if (hash.includes('=')) {
          url.hash = hash + '&zoom=' + zoomLevel;
        } else {
          url.hash = 'zoom=' + zoomLevel;
        }
      } else {
        url.hash = 'zoom=' + zoomLevel;
      }

      if (element[attr] !== url.href) {
        console.log('PDF Zoom Memory: Updating', attr, 'to:', url.href);
        element[attr] = url.href;
      }
    } catch (e) {
      console.log('PDF Zoom Memory: Error updating URL:', e);
    }
  }

  // Apply zoom by modifying the URL hash (for direct PDF pages)
  function applyZoom(zoomLevel) {
    const url = new URL(window.location.href);

    // Remove existing zoom parameter from hash
    let hash = url.hash;
    hash = hash.replace(/#zoom=[^&]*/g, '');
    hash = hash.replace(/&zoom=[^&]*/g, '');

    // Add new zoom
    if (hash && hash !== '#') {
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
      console.log('PDF Zoom Memory: Navigating to apply zoom:', zoomLevel);
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
      const savedZoom = result[STORAGE_KEY] || DEFAULT_ZOOM;
      const currentZoom = getZoomFromURL();

      console.log('PDF Zoom Memory: Saved zoom:', savedZoom, 'Current URL zoom:', currentZoom);

      // First, try to find embedded PDFs on the page
      const foundEmbedded = findAndZoomEmbeddedPDFs(savedZoom);

      if (foundEmbedded) {
        console.log('PDF Zoom Memory: Applied zoom to embedded PDFs');
        if (!result[STORAGE_KEY]) {
          saveZoom(DEFAULT_ZOOM);
        }
        return;
      }

      // If this is a direct PDF page
      if (isPDFPage()) {
        if (savedZoom !== currentZoom) {
          console.log('PDF Zoom Memory: Applying saved zoom level:', savedZoom);
          applyZoom(savedZoom);
        }
        if (!result[STORAGE_KEY]) {
          saveZoom(DEFAULT_ZOOM);
        }
      }
    });
  }

  // Monitor for zoom changes via URL hash
  function monitorZoomChanges() {
    let lastZoom = getZoomFromURL();

    window.addEventListener('hashchange', () => {
      const currentZoom = getZoomFromURL();
      console.log('PDF Zoom Memory: Hash changed, zoom:', currentZoom);
      if (currentZoom && currentZoom !== lastZoom) {
        lastZoom = currentZoom;
        saveZoom(currentZoom);
      }
    });

    setInterval(() => {
      const currentZoom = getZoomFromURL();
      if (currentZoom && currentZoom !== lastZoom) {
        console.log('PDF Zoom Memory: Detected zoom change:', currentZoom);
        lastZoom = currentZoom;
        saveZoom(currentZoom);
      }
    }, 1000);
  }

  // Main initialization
  function init() {
    console.log('PDF Zoom Memory: Initializing on', window.location.href);

    // Wait a moment for page to fully load
    setTimeout(() => {
      // Load and apply saved zoom
      loadAndApplyZoom();

      // Start monitoring for zoom changes (only relevant for direct PDF pages)
      if (isPDFPage()) {
        monitorZoomChanges();
      }
    }, 500);
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'applyZoom' && request.zoom) {
      console.log('PDF Zoom Memory: Received zoom request from popup:', request.zoom);
      saveZoom(request.zoom);

      // Try embedded PDFs first
      const foundEmbedded = findAndZoomEmbeddedPDFs(request.zoom);

      if (isPDFPage()) {
        applyZoom(request.zoom);
        sendResponse({ success: true });
      } else if (foundEmbedded) {
        sendResponse({ success: true, embedded: true });
      } else {
        sendResponse({ success: false, reason: 'No PDF found on page' });
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
