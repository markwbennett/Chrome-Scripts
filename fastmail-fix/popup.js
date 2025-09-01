document.addEventListener('DOMContentLoaded', async () => {
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    
    // Load saved font size
    const result = await chrome.storage.sync.get(['fontSize']);
    const savedFontSize = result.fontSize || 18;
    
    fontSizeSlider.value = savedFontSize;
    fontSizeValue.textContent = savedFontSize;
    
    // Handle slider changes
    fontSizeSlider.addEventListener('input', async (e) => {
        const newFontSize = e.target.value;
        fontSizeValue.textContent = newFontSize;
        
        // Save to storage
        await chrome.storage.sync.set({ fontSize: newFontSize });
        
        // Send message to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
            action: 'updateFontSize',
            fontSize: newFontSize
        });
    });
});
