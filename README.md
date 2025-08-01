# Chrome Extensions Collection

A collection of useful Chrome extensions for productivity, accessibility, and workflow optimization.

## Extensions

### 🎯 Tab Management
- **[Tab Sort and Stack by Domain](scripts/tab-sort-and-stack/)** - Organizes tabs into stacks grouped by domain name with automatic sorting
- **[Unstack All Tabs](scripts/unstack-all-tabs/)** - Removes all tabs from their stacks/groups
- **[Vivaldi Tab Organizer](scripts/vivaldi-tab-organizer/)** - Specialized tab organization for Vivaldi browser

### ⚡ Productivity
- **[Westlaw Extension](scripts/westlaw-extension/)** - Enhanced Westlaw experience with typography controls and navigation shortcuts
- **[HC Clerk Extension](scripts/hc-clerk-extension/)** - Auto-login for Harris County District Clerk website
- **[Windows in Tabs](scripts/windows-in-tabs/)** - Opens popup windows as tabs instead

### 🎨 Accessibility & UI
- **[High Contrast Extension](scripts/high-contrast-extension/)** - Improves readability with high contrast themes
- **[Legibility Extension](scripts/legibility-extension/)** - Enhanced text readability and typography controls

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the desired extension folder
5. The extension will appear in your toolbar

## Features by Extension

### Tab Sort and Stack by Domain
- Automatically groups tabs by domain (e.g., all Google tabs together)
- Sorts domains alphabetically
- Refreshes sleeping tabs before organizing
- Custom magnet icon representing "pulling similar things together"

### Vivaldi Tab Organizer
- Works specifically with Vivaldi browser's tab stacking system
- Organizes tabs by domain and provides manual stacking instructions
- Detailed breakdown of domain groups
- Vivaldi-optimized interface

### Westlaw Extension
- Customizable typography and layout controls
- Navigation shortcuts and keyboard commands
- Enhanced reading experience
- Notes viewer functionality

## Development

Each extension follows Chrome Extension Manifest V3 standards and includes:
- `manifest.json` - Extension configuration
- `background.js` - Service worker for background tasks
- `popup.html/js` - User interface
- `content.js` - Page interaction scripts (where applicable)
- Icons in 16px, 48px, and 128px sizes

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve these extensions.

## License

Each extension may have its own license. Check individual extension folders for specific licensing information.