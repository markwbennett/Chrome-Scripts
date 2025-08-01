// Background service worker for Vivaldi tab organizing
chrome.runtime.onInstalled.addListener(() => {
  console.log('Vivaldi Tab Organizer extension installed');
});

// Function to extract domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Normalize common domain variations
    if (hostname.includes('westlaw')) {
      return 'westlaw.com';
    }
    
    // Remove www prefix for consistency
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    return hostname;
  } catch (e) {
    return 'unknown';
  }
}

// Main function to organize tabs by domain for Vivaldi
async function organizeTabs() {
  try {
    console.log('Starting Vivaldi tab organization...');
    
    // Get current window info
    const currentWindow = await chrome.windows.getCurrent();
    console.log(`Working on window ID: ${currentWindow.id}`);
    
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    console.log(`Found ${tabs.length} tabs in window ${currentWindow.id}`);
    
    // Group tabs by domain
    const domainGroups = {};
    
    tabs.forEach(tab => {
      const domain = getDomain(tab.url);
      console.log(`Tab "${tab.title}" (${tab.url}) -> domain: "${domain}"`);
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(tab);
    });
    
    console.log('Domain groups:', Object.keys(domainGroups).map(domain => 
      `${domain}: ${domainGroups[domain].length} tabs`
    ));
    
    // Sort domains alphabetically
    const sortedDomains = Object.keys(domainGroups).sort();
    let currentPosition = 0;
    
    console.log('\n=== ORGANIZING TABS BY DOMAIN ===');
    
    // Process domains in sorted order - move tabs to group them by domain
    for (const domain of sortedDomains) {
      const domainTabs = domainGroups[domain];
      console.log(`\n--- ${domain.toUpperCase()} (${domainTabs.length} tabs) ---`);
      
      // Log tab details before moving
      domainTabs.forEach((tab, i) => {
        console.log(`  ${i + 1}. "${tab.title}"`);
      });
      
      // Move all tabs for this domain to the current position
      console.log(`Moving to positions ${currentPosition} to ${currentPosition + domainTabs.length - 1}`);
      for (let i = 0; i < domainTabs.length; i++) {
        try {
          const newIndex = currentPosition + i;
          await chrome.tabs.move(domainTabs[i].id, { index: newIndex });
        } catch (error) {
          console.warn(`Failed to move tab ${domainTabs[i].id}:`, error);
        }
      }
      
      // Small delay between domain groups
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update position for next domain
      currentPosition += domainTabs.length;
    }
    
    console.log('\n=== ORGANIZATION COMPLETE ===');
    console.log('📋 MANUAL STACKING INSTRUCTIONS:');
    console.log('1. Your tabs are now grouped by domain');
    console.log('2. To create Vivaldi tab stacks:');
    console.log('   • Drag tabs from same domain onto each other');
    console.log('   • Or select multiple tabs (Ctrl+click) and right-click → "Stack # Selected Tabs"');
    console.log('   • Or right-click any tab → "Stack Tabs by Hosts"');
    
    // Return summary for popup
    const summary = {
      totalTabs: tabs.length,
      domains: sortedDomains,
      domainCounts: Object.fromEntries(
        sortedDomains.map(domain => [domain, domainGroups[domain].length])
      )
    };
    
    return summary;
    
  } catch (error) {
    console.error('Error organizing tabs:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'organizeTabs') {
    organizeTabs()
      .then((summary) => {
        try {
          sendResponse({ success: true, summary });
        } catch (error) {
          console.warn('Failed to send response:', error);
        }
      })
      .catch((error) => {
        try {
          sendResponse({ success: false, error: error.message });
        } catch (responseError) {
          console.warn('Failed to send error response:', responseError);
        }
      });
    return true; // Keep message channel open for async response
  }
});