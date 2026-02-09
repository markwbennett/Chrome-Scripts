const STYLE_ID = 'high-contrast-override';

const HIGH_CONTRAST_CSS = `
  *, *::before, *::after {
    background-color: #ffffff !important;
    color: #000000 !important;
    border-color: #cccccc !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }
  a, a * {
    color: #1a0dab !important;
    text-decoration: underline !important;
  }
  a:visited, a:visited * {
    color: #660099 !important;
  }
  img, video, canvas, svg, iframe {
    background-color: transparent !important;
  }
  body {
    font-size: max(18px, 1em) !important;
    line-height: 1.6 !important;
  }
`;

function applyHighContrast() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = HIGH_CONTRAST_CSS;
  (document.head || document.documentElement).appendChild(style);
}

function removeHighContrast() {
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

// Check stored state on load
chrome.storage.local.get('highContrastEnabled', (result) => {
  if (result.highContrastEnabled) {
    applyHighContrast();
  }
});

// Listen for toggle messages from the popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggle') {
    if (message.enabled) {
      applyHighContrast();
    } else {
      removeHighContrast();
    }
  }
});
