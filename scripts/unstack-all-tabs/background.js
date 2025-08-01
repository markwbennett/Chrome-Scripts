// Background service worker for unstacking tabs
chrome.runtime.onInstalled.addListener(() => {
  console.log('Unstack All Tabs extension installed');
});

// Main function to unstack all tabs
async function unstackAllTabs() {
  try {
    console.log('Starting tab unstacking...');
    
    // Get current window info
    const currentWindow = await chrome.windows.getCurrent();
    console.log(`Working on window ID: ${currentWindow.id}`);
    
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    console.log(`Found ${tabs.length} tabs in window ${currentWindow.id}`);
    
    // Get all existing tab groups and remove them completely
    const existingGroups = await chrome.tabGroups.query({ windowId: currentWindow.id });
    console.log(`Found ${existingGroups.length} existing tab groups to remove in window ${currentWindow.id}`);
    
    // Also check other windows
    const allWindows = await chrome.windows.getAll();
    console.log(`Total browser windows: ${allWindows.length}`);
    for (const window of allWindows) {
      if (window.id !== currentWindow.id) {
        const otherWindowGroups = await chrome.tabGroups.query({ windowId: window.id });
        console.log(`Window ${window.id} has ${otherWindowGroups.length} groups`);
      }
    }
    
    for (const group of existingGroups) {
      console.log(`Removing group: "${group.title || 'Unnamed'}" (ID: ${group.id})`);
      try {
        // Get all tabs in this group
        const groupTabs = await chrome.tabs.query({ groupId: group.id });
        const tabIds = groupTabs.map(tab => tab.id);
        console.log(`  Ungrouping ${tabIds.length} tabs:`, tabIds);
        
        if (tabIds.length > 0) {
          await chrome.tabs.ungroup(tabIds);
          console.log(`  ✓ Successfully ungrouped ${tabIds.length} tabs from "${group.title || 'Unnamed'}"`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to remove group ${group.id}:`, error);
      }
    }
    
    // Verify all tabs are ungrouped
    console.log('\n=== Verification ===');
    const finalTabs = await chrome.tabs.query({ currentWindow: true });
    let groupedTabsCount = 0;
    
    finalTabs.forEach(tab => {
      if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        groupedTabsCount++;
        console.log(`Still grouped: "${tab.title}" in group ${tab.groupId}`);
      }
    });
    
    if (groupedTabsCount === 0) {
      console.log('✓ All tabs successfully ungrouped!');
    } else {
      console.warn(`⚠️  ${groupedTabsCount} tabs are still in groups`);
    }
    
    console.log(`Unstacking complete: processed ${existingGroups.length} groups, ${finalTabs.length} total tabs`);
    
    // Final API check - see what Chrome thinks exists now
    console.log('\n=== Final API State Check ===');
    const remainingGroups = await chrome.tabGroups.query({ windowId: finalTabs[0]?.windowId });
    console.log(`Chrome API reports ${remainingGroups.length} groups remaining after ungrouping`);
    
    if (remainingGroups.length > 0) {
      console.warn('⚠️  Chrome API still shows groups existing:');
      for (const group of remainingGroups) {
        const groupTabs = await chrome.tabs.query({ groupId: group.id });
        console.log(`  - Group ${group.id} "${group.title}": ${groupTabs.length} tabs`);
      }
    } else {
      console.log('✓ Chrome API confirms no groups exist');
    }
    
  } catch (error) {
    console.error('Error unstacking tabs:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'unstackTabs') {
    unstackAllTabs()
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