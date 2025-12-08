// PDF Zoom Memory - Popup Script

const STORAGE_KEY = 'pdfZoomLevel';

// Load current zoom level
function loadCurrentZoom() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const savedZoom = result[STORAGE_KEY] || 100;
    document.getElementById('currentZoom').textContent = savedZoom;
    document.getElementById('zoomLevel').value = savedZoom;
    updatePresetButtons(savedZoom);
  });
}

// Update preset button states
function updatePresetButtons(zoom) {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (parseInt(btn.dataset.zoom, 10) === zoom) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Save zoom level
function saveZoom(zoomLevel) {
  chrome.storage.local.set({ [STORAGE_KEY]: zoomLevel }, () => {
    document.getElementById('currentZoom').textContent = zoomLevel;
    showStatus('Zoom level saved! New PDFs will open at ' + zoomLevel + '%', 'success');
    updatePresetButtons(zoomLevel);

    // Try to apply to current tab if it's a PDF
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'applyZoom',
          zoom: zoomLevel
        }).catch(() => {
          // Tab might not have content script, that's okay
        });
      }
    });
  });
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;

  setTimeout(() => {
    status.className = 'status';
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentZoom();

  // Save button
  document.getElementById('saveBtn').addEventListener('click', () => {
    const zoomInput = document.getElementById('zoomLevel');
    let zoom = parseInt(zoomInput.value, 10);

    // Validate
    if (isNaN(zoom) || zoom < 25) zoom = 25;
    if (zoom > 500) zoom = 500;

    zoomInput.value = zoom;
    saveZoom(zoom);
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const zoom = parseInt(btn.dataset.zoom, 10);
      document.getElementById('zoomLevel').value = zoom;
      saveZoom(zoom);
    });
  });

  // Enter key in input
  document.getElementById('zoomLevel').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('saveBtn').click();
    }
  });
});
