// Content script for browser extension
// This script intercepts OpenImageViewerConf calls and opens documents in new tabs

(function() {
    'use strict';
    
    // Store the original function if it exists
    let originalOpenImageViewerConf = window.OpenImageViewerConf;
    
    // Override the OpenImageViewerConf function
    window.OpenImageViewerConf = function(param1, param2) {
        console.log('Intercepted OpenImageViewerConf call:', param1, param2);
        
        // Extract the 'Get' parameter from the first argument
        // The URL pattern is: https://www.hcdistrictclerk.com/Edocs/Public/ViewFilePage.aspx?Get=...
        let getParam = param1; // This should be the encoded parameter
        
        // Construct the full URL
        let viewerUrl = `https://www.hcdistrictclerk.com/Edocs/Public/ViewFilePage.aspx?${getParam}`;
        
        console.log('Opening URL in new tab:', viewerUrl);
        
        // Open in new tab instead of popup window
        window.open(viewerUrl, '_blank');
        
        // Prevent the original function from running (if it exists)
        return false;
    };
    
    // Alternative approach: Override window.open to force new tabs
    let originalWindowOpen = window.open;
    window.open = function(url, target, features) {
        // If features are specified (indicating popup), open in new tab instead
        if (features) {
            console.log('Converting popup to new tab:', url);
            return originalWindowOpen.call(this, url, '_blank');
        }
        // Otherwise, use original behavior
        return originalWindowOpen.call(this, url, target, features);
    };
    
    // Method 3: Event listener approach for links with javascript: hrefs
    document.addEventListener('click', function(event) {
        let target = event.target;
        
        // Find the closest anchor tag
        while (target && target.tagName !== 'A') {
            target = target.parentElement;
        }
        
        if (target && target.href && target.href.startsWith('javascript:OpenImageViewerConf')) {
            event.preventDefault();
            
            // Extract the parameters from the href
            let match = target.href.match(/OpenImageViewerConf\('([^']+)','([^']+)'\)/);
            if (match) {
                let param1 = match[1];
                let param2 = match[2];
                
                // Use the first parameter as the Get parameter
                let viewerUrl = `https://www.hcdistrictclerk.com/Edocs/Public/ViewFilePage.aspx?${param1}`;
                
                console.log('Opening document in new tab:', viewerUrl);
                window.open(viewerUrl, '_blank');
                
                // Apply the styling that was in the original onclick
                target.style.color = 'teal';
            }
        }
    });
    
    console.log('Document viewer extension loaded - popup windows will now open as new tabs');
})();