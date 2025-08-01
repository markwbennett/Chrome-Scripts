document.addEventListener('DOMContentLoaded', async function() {
  const toggle = document.getElementById('toggle');
  const slider = document.getElementById('weight-slider');
  const sliderValue = document.getElementById('slider-value');
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const url = new URL(tab.url);
  const siteKey = 'hc-disable-' + url.hostname;
  const weightKey = 'hc-weight-' + url.hostname;

  function updateToggleFromStorage() {
    chrome.storage.local.get([siteKey], function(result) {
      const disabled = result[siteKey] === true;
      toggle.checked = !disabled;
    });
  }
  function updateSliderFromStorage() {
    chrome.storage.local.get([weightKey], function(result) {
      const weight = result[weightKey] || 500;
      slider.value = weight;
      sliderValue.textContent = weight;
    });
  }
  updateToggleFromStorage();
  updateSliderFromStorage();

  toggle.addEventListener('change', function() {
    const disabled = !toggle.checked;
    chrome.storage.local.set({[siteKey]: disabled}, function() {
      chrome.tabs.sendMessage(tab.id, {type: 'HC_TOGGLE', disabled});
    });
  });

  slider.addEventListener('input', function() {
    sliderValue.textContent = slider.value;
  });
  slider.addEventListener('change', function() {
    const weight = parseInt(slider.value, 10);
    chrome.storage.local.set({[weightKey]: weight}, function() {
      chrome.tabs.sendMessage(tab.id, {type: 'HC_WEIGHT', weight});
    });
  });
}); 