document.addEventListener('DOMContentLoaded', function() {
  const unstackBtn = document.getElementById('unstackBtn');
  const status = document.getElementById('status');
  
  unstackBtn.addEventListener('click', function() {
    console.log('Unstack button clicked');
    
    // Disable button and show loading state
    unstackBtn.disabled = true;
    unstackBtn.textContent = 'Unstacking...';
    status.textContent = '';
    status.className = 'status';
    
    console.log('About to send message to background script');
    
    // Send message to background script
    try {
      chrome.runtime.sendMessage({ action: 'unstackTabs' }, function(response) {
        // Check if runtime is still valid
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          unstackBtn.disabled = false;
          unstackBtn.textContent = 'Remove All Tab Stacks';
          status.textContent = 'Error: Extension context invalidated. Please reload the extension.';
          status.className = 'status error';
          return;
        }
        
        // Re-enable button
        unstackBtn.disabled = false;
        unstackBtn.textContent = 'Remove All Tab Stacks';
        
        if (response && response.success) {
          status.textContent = 'All tabs unstacked successfully!';
          status.className = 'status success';
          
          // Close popup after success
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          status.textContent = 'Error: ' + (response?.error || 'Unknown error occurred');
          status.className = 'status error';
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      unstackBtn.disabled = false;
      unstackBtn.textContent = 'Remove All Tab Stacks';
      status.textContent = 'Error: Extension context invalidated. Please reload the extension.';
      status.className = 'status error';
    }
  });
});