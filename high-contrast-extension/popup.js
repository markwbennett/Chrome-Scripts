const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

// Load current state
chrome.storage.local.get('highContrastEnabled', (result) => {
  const enabled = result.highContrastEnabled || false;
  toggle.checked = enabled;
  status.textContent = enabled ? 'On' : 'Off';
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  status.textContent = enabled ? 'On' : 'Off';

  // Save state
  chrome.storage.local.set({ highContrastEnabled: enabled });

  // Send message to the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', enabled });
    }
  });
});
