# Privacy Policy for Chrome Westlaw Enhancements

**Last Updated: September 2, 2025**

## Overview

Chrome Westlaw Enhancements is a browser extension designed to improve the reading experience on Westlaw.com. This privacy policy explains how the extension handles your data and protects your privacy.

## Data Collection

**We do NOT collect, store, or transmit any personal data.**

### What Data is NOT Collected:
- Personal information (name, email, etc.)
- Browsing history or website visits
- Document content you view on Westlaw
- Search queries or research activities
- User behavior or analytics data
- Any data transmitted to external servers

## Local Data Storage

The extension stores the following settings **locally on your device only**:

### Settings Stored Locally:
- Font size preferences
- Line height settings
- Margin adjustments
- Layout preferences (sidebar, focus mode)
- Feature toggle states (star page highlighting, footnotes, etc.)
- Keep-alive session preferences

### How Local Storage Works:
- All settings use Chrome's built-in `chrome.storage.local` API
- Data never leaves your device
- Settings are specific to your browser profile
- You can clear all extension data by removing the extension

## Permissions Explained

### Required Permissions:
- **`storage`**: Store your preferences locally on your device
- **`activeTab`**: Apply reading enhancements to the current Westlaw tab
- **`tabs`**: Reload tabs when settings change, open notes viewer
- **`clipboardRead/Write`**: Copy selected text for research notes (only when you press Enter)

### Host Permissions:
- **`*://*.westlaw.com/*`**: Required to enhance Westlaw pages
- **`file:///*`**: Limited to specific test files for development purposes

## Third-Party Services

**None.** This extension does not:
- Connect to any external services
- Use analytics platforms
- Include tracking scripts
- Send data to remote servers
- Use third-party APIs

## Data Security

- All data remains on your local device
- No network transmission of personal data
- No external dependencies or remote code
- Open source code available for inspection

## Your Rights

You have full control over your data:
- **View**: All settings visible in extension popup
- **Modify**: Change any setting at any time
- **Delete**: Remove extension to delete all stored data
- **Export**: Settings stored in standard Chrome storage format

## Updates to Privacy Policy

Any changes to this privacy policy will be:
- Posted to this GitHub repository
- Included in extension update notes
- Effective immediately upon publication

## Contact

For privacy questions or concerns:
- **GitHub**: [Create an issue](https://github.com/markwbennett/Chrome-Scripts/issues)
- **Repository**: https://github.com/markwbennett/Chrome-Scripts

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- Chrome Extension privacy requirements
- General data protection principles

---

**Summary**: Your privacy is fully protected. No personal data is collected, transmitted, or stored externally. All functionality operates locally within your browser.