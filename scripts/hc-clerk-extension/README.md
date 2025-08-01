# Harris County District Clerk Auto-Login Extension

This Chrome extension automatically fills login credentials and navigates to the Criminal tab on the Harris County District Clerk website (https://www.hcdistrictclerk.com/Edocs/Public/search.aspx).

## Features

- Automatically fills username and password fields
- Clicks the login button
- Selects the Criminal tab (works for both mobile and desktop views)
- Securely stores credentials locally on your device
- First-run setup prompts for credentials

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `hc-clerk-extension` folder
4. The extension icon should appear in your toolbar

## Usage

1. Navigate to https://www.hcdistrictclerk.com/Edocs/Public/search.aspx
2. If this is your first time, the extension will prompt you to enter your credentials
3. Click the extension icon to set up or modify your credentials
4. The extension will automatically:
   - Fill in your username and password
   - Click the login button
   - Navigate to the Criminal tab

## Security

- Credentials are stored locally using Chrome's secure storage API
- Credentials are never transmitted anywhere except to the Harris County website
- You can clear stored credentials at any time using the extension popup

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main auto-login functionality
- `background.js` - Background service worker
- `popup.html` - Credential setup interface
- `popup.js` - Popup functionality
- `icons/` - Extension icons 