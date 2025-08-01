document.addEventListener('DOMContentLoaded', function() {
  const organizeBtn = document.getElementById('organizeBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const status = document.getElementById('status');
  
  organizeBtn.addEventListener('click', function() {
    console.log('Organize button clicked');
    
    // Disable button and show loading state
    organizeBtn.disabled = true;
    organizeBtn.textContent = 'Refreshing & Organizing...';
    status.textContent = '';
    status.className = 'status';
    
    console.log('About to send message to background script');
    
    // Send message to background script
    try {
      chrome.runtime.sendMessage({ action: 'organizeTabs' }, function(response) {
        // Check if runtime is still valid
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          organizeBtn.disabled = false;
          organizeBtn.textContent = 'Refresh & Organize Tabs by Domain';
          status.textContent = 'Error: Extension context invalidated. Please reload the extension.';
          status.className = 'status error';
          return;
        }
        
        // Re-enable button
        organizeBtn.disabled = false;
        organizeBtn.textContent = 'Refresh & Organize Tabs by Domain';
        
        if (response && response.success) {
          status.textContent = 'Tabs organized successfully!';
          status.className = 'status success';
          
          // Close popup after success
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          status.textContent = 'Error: ' + (response?.error || 'Unknown error occurred');
          status.className = 'status error';
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      organizeBtn.disabled = false;
      organizeBtn.textContent = 'Refresh & Organize Tabs by Domain';
      status.textContent = 'Error: Extension context invalidated. Please reload the extension.';
      status.className = 'status error';
    }
  });
  
  reloadBtn.addEventListener('click', function() {
    chrome.runtime.reload();
  });
});