document.addEventListener('DOMContentLoaded', function() {
  const organizeBtn = document.getElementById('organizeBtn');
  const status = document.getElementById('status');
  const instructions = document.getElementById('instructions');
  const domainList = document.getElementById('domainList');
  
  organizeBtn.addEventListener('click', function() {
    console.log('Organize button clicked');
    
    // Disable button and show loading state
    organizeBtn.disabled = true;
    organizeBtn.textContent = '⏳ Organizing...';
    status.textContent = '';
    status.className = 'status';
    instructions.className = 'instructions';
    domainList.innerHTML = '';
    
    console.log('About to send message to background script');
    
    // Send message to background script
    try {
      chrome.runtime.sendMessage({ action: 'organizeTabs' }, function(response) {
        // Check if runtime is still valid
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          organizeBtn.disabled = false;
          organizeBtn.textContent = '📋 Organize Tabs by Domain';
          status.textContent = 'Error: Extension context invalidated. Please reload the extension.';
          status.className = 'status error';
          return;
        }
        
        // Re-enable button
        organizeBtn.disabled = false;
        organizeBtn.textContent = '📋 Organize Tabs by Domain';
        
        if (response && response.success) {
          const summary = response.summary;
          
          status.textContent = `✅ Organized ${summary.totalTabs} tabs into ${summary.domains.length} domain groups!`;
          status.className = 'status success';
          
          // Show instructions
          instructions.className = 'instructions show';
          
          // Show domain breakdown
          if (summary.domains.length > 0) {
            domainList.innerHTML = '<h4>📊 Domain Breakdown:</h4>';
            summary.domains.forEach(domain => {
              const count = summary.domainCounts[domain];
              const item = document.createElement('div');
              item.className = 'domain-item';
              item.innerHTML = `<span>${domain}</span><span>${count} tab${count > 1 ? 's' : ''}</span>`;
              domainList.appendChild(item);
            });
          }
          
        } else {
          status.textContent = '❌ Error: ' + (response?.error || 'Unknown error occurred');
          status.className = 'status error';
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      organizeBtn.disabled = false;
      organizeBtn.textContent = '📋 Organize Tabs by Domain';
      status.textContent = '❌ Error: Extension context invalidated. Please reload the extension.';
      status.className = 'status error';
    }
  });
});