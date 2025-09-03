const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to Chrome Web Store requirements (1280x800 24-bit PNG)
  await page.setViewport({ width: 1280, height: 800 });
  
  // Navigate to the HTML file
  const filePath = 'file://' + path.resolve(__dirname, 'popup-screenshot.html');
  await page.goto(filePath);
  
  // Navigate and wait for load first
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get the actual content dimensions to ensure we capture everything
  const contentDimensions = await page.evaluate(() => {
    const body = document.body;
    return {
      width: body.scrollWidth,
      height: body.scrollHeight
    };
  });
  
  console.log('Content dimensions:', contentDimensions);
  
  // Add CSS to center the popup content and ensure it fits
  await page.addStyleTag({
    content: `
      body {
        width: 1280px;
        height: 800px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0;
        padding: 0;
        background: #f5f5f5;
        box-sizing: border-box;
      }
      
      #popup-content {
        transform: scale(0.55);
        transform-origin: center top;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-radius: 8px;
        background: white;
        margin-top: 20px;
      }
    `
  });
  
  // Wrap content in a container for better centering
  await page.evaluate(() => {
    const body = document.body;
    const content = body.innerHTML;
    body.innerHTML = '<div id="popup-content">' + content + '</div>';
  });
  
  // Wait for styles to apply
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Take full screenshot at Chrome Web Store dimensions
  await page.screenshot({ 
    path: 'popup-interface-1280x800.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 800 }
  });
  
  console.log('Screenshot saved to popup-interface-1280x800.png');
  
  await browser.close();
})();