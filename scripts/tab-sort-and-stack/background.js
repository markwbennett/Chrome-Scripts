// Background service worker for tab sorting
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Sort and Stack extension installed');
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

// Function to generate a color for each domain
function getDomainColor(domain, index) {
  const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  return colors[index % colors.length];
}

// Main function to organize tabs by domain
async function organizeTabs() {
  try {
    console.log('Starting tab organization...');
    
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    console.log(`Found ${tabs.length} tabs`);
    
    // Refresh only discarded (sleeping) tabs
    console.log('Refreshing discarded tabs...');
    let refreshedCount = 0;
    for (const tab of tabs) {
      // Only refresh tabs that are discarded (sleeping) and can be refreshed
      if (tab.discarded && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        try {
          console.log(`Refreshing discarded tab: ${tab.title}`);
          await chrome.tabs.reload(tab.id);
          refreshedCount++;
        } catch (error) {
          console.warn(`Failed to refresh discarded tab ${tab.id}:`, error);
        }
      }
    }
    
    console.log(`Refreshed ${refreshedCount} discarded tabs`);
    
    // Wait a moment for refreshes to start if any were done
    if (refreshedCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Get all existing tab groups and remove them completely
    const existingGroups = await chrome.tabGroups.query({ windowId: tabs[0]?.windowId });
    console.log(`Found ${existingGroups.length} existing tab groups to remove`);
    
    for (const group of existingGroups) {
      console.log(`Removing entire group: ${group.title || 'Unnamed'} (ID: ${group.id})`);
      try {
        // Get all tabs in this group
        const groupTabs = await chrome.tabs.query({ groupId: group.id });
        const tabIds = groupTabs.map(tab => tab.id);
        console.log(`  Ungrouping ${tabIds.length} tabs from group ${group.id}`);
        await chrome.tabs.ungroup(tabIds);
      } catch (error) {
        console.warn(`Failed to remove group ${group.id}:`, error);
      }
    }
    
    // Longer delay to ensure ungrouping is complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get updated tab list after ungrouping
    const updatedTabs = await chrome.tabs.query({ currentWindow: true });
    console.log(`After ungrouping, found ${updatedTabs.length} tabs`);
    
    // Group tabs by domain
    const domainGroups = {};
    
    updatedTabs.forEach(tab => {
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
    let colorIndex = 0;
    let currentPosition = 0;
    
    // Process domains in sorted order
    for (const domain of sortedDomains) {
      const domainTabs = domainGroups[domain];
      console.log(`\n=== Processing domain: ${domain} with ${domainTabs.length} tabs ===`);
      
      // Log tab details before moving
      domainTabs.forEach((tab, i) => {
        console.log(`  Tab ${i}: ID=${tab.id}, current index=${tab.index}, title="${tab.title}"`);
      });
      
      // Move all tabs for this domain to the current position
      console.log(`Moving tabs to positions ${currentPosition} to ${currentPosition + domainTabs.length - 1}`);
      for (let i = 0; i < domainTabs.length; i++) {
        try {
          const newIndex = currentPosition + i;
          console.log(`  Moving tab ${domainTabs[i].id} to index ${newIndex}`);
          await chrome.tabs.move(domainTabs[i].id, { index: newIndex });
        } catch (error) {
          console.warn(`Failed to move tab ${domainTabs[i].id}:`, error);
        }
      }
      
      // Small delay to ensure moves are complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create group if domain has more than 1 tab
      if (domainTabs.length > 1) {
        try {
          const tabIds = domainTabs.map(tab => tab.id);
          console.log(`Creating group for ${domain} with tab IDs:`, tabIds);
          
          // Create group with first tab, then add others one by one
          let groupId = await chrome.tabs.group({ tabIds: [tabIds[0]] });
          console.log(`Created initial group ${groupId} with tab ${tabIds[0]}`);
          
          // Add remaining tabs to the group one by one
          for (let i = 1; i < tabIds.length; i++) {
            try {
              console.log(`Adding tab ${tabIds[i]} to group ${groupId}`);
              await chrome.tabs.group({ tabIds: [tabIds[i]], groupId });
              await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between additions
            } catch (error) {
              console.error(`Failed to add tab ${tabIds[i]} to group ${groupId}:`, error);
            }
          }
          
          // Set group title and color
          await chrome.tabGroups.update(groupId, {
            title: domain,
            color: getDomainColor(domain, colorIndex++)
          });
          console.log(`✓ Created group ${groupId} for domain ${domain} with color ${getDomainColor(domain, colorIndex-1)}`);
          
          // Verify the group actually contains all expected tabs
          const finalGroupTabs = await chrome.tabs.query({ groupId });
          console.log(`Group ${groupId} verification: expected ${tabIds.length} tabs, actually has ${finalGroupTabs.length} tabs`);
          if (finalGroupTabs.length !== tabIds.length) {
            console.warn(`GROUP SIZE MISMATCH for ${domain}! Expected ${tabIds.length}, got ${finalGroupTabs.length}`);
            finalGroupTabs.forEach(tab => console.log(`  - Tab in group: ${tab.id} "${tab.title}"`));
          }
          
        } catch (error) {
          console.error(`✗ Failed to create group for ${domain}:`, error);
        }
      } else {
        console.log(`Skipping group creation for ${domain} (only 1 tab)`);
      }
      
      // Update position for next domain
      currentPosition += domainTabs.length;
      console.log(`Next domain will start at position ${currentPosition}`);
    }
    
    console.log(`Organized ${updatedTabs.length} tabs into ${colorIndex} domain groups, sorted by domain`);
    
    // Final verification - check what groups actually exist
    console.log('\n=== Final Verification ===');
    const finalTabs = await chrome.tabs.query({ currentWindow: true });
    const finalGroups = {};
    
    finalTabs.forEach(tab => {
      const groupKey = tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE ? 'ungrouped' : `group-${tab.groupId}`;
      if (!finalGroups[groupKey]) {
        finalGroups[groupKey] = [];
      }
      finalGroups[groupKey].push({
        title: tab.title,
        domain: getDomain(tab.url),
        index: tab.index
      });
    });
    
    Object.keys(finalGroups).forEach(groupKey => {
      console.log(`${groupKey}:`, finalGroups[groupKey].map(t => `${t.domain} (${t.index})`).join(', '));
    });
    
    // Additional verification - query all groups and their actual tabs
    console.log('\n=== Chrome Groups API Verification ===');
    const allGroups = await chrome.tabGroups.query({ windowId: finalTabs[0]?.windowId });
    console.log(`Chrome reports ${allGroups.length} total groups exist`);
    
    for (const group of allGroups) {
      const groupTabs = await chrome.tabs.query({ groupId: group.id });
      const domains = groupTabs.map(tab => getDomain(tab.url));
      const uniqueDomains = [...new Set(domains)];
      console.log(`Group ${group.id} "${group.title}": ${groupTabs.length} tabs, domains: ${uniqueDomains.join(', ')}`);
      
      // Flag any groups with mixed domains
      if (uniqueDomains.length > 1) {
        console.warn(`⚠️  MIXED DOMAIN GROUP DETECTED: Group ${group.id} contains multiple domains!`);
        groupTabs.forEach(tab => console.log(`    - ${getDomain(tab.url)}: "${tab.title}"`));
      }
    }
    
  } catch (error) {
    console.error('Error organizing tabs:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'organizeTabs') {
    organizeTabs()
      .then(() => {
        try {
          sendResponse({ success: true });
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

// Handle service worker lifecycle
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension service worker started');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension service worker suspending');
});