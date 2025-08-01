# Westlaw Combined Enhancements - Chrome Extension

A standalone Chrome extension that enhances the Westlaw reading experience with customizable typography, layout controls, and navigation shortcuts.

## Installation

### Option 1: Load as Developer Extension (Recommended)

1. **Open Chrome Extensions**: Go to `chrome://extensions/`
2. **Enable Developer Mode**: Toggle the "Developer mode" switch in the top right
3. **Load Extension**: Click "Load unpacked" and select the `westlaw-extension` folder
4. **Pin Extension**: Click the puzzle piece icon in Chrome toolbar and pin "Westlaw Combined Enhancements"

### Option 2: Package and Install

1. **Package Extension**: In Chrome extensions page, click "Pack extension"
2. **Select Directory**: Choose the `westlaw-extension` folder
3. **Install**: Drag the generated `.crx` file to Chrome extensions page

## Usage

### Extension Popup
Click the extension icon (orange square with blue "W") in your toolbar while on any Westlaw page to access all controls:

- **Font Size**: Increase/Decrease/Reset (10-36px range)
- **Line Height**: Increase/Decrease/Reset (1.0-3.0 range, 0.1 increments)
- **Margins**: Increase/Decrease/Reset symmetrical margins
- **Move Left/Right**: Shift content left or right independently
- **Toggle Sidebar**: Hide/show right sidebar
- **Toggle Focus Mode**: Hide header/footer elements
- **Copy & Notes**: Copy document with reference and download notes file
- **Navigation**: Next/Previous search terms, scroll to top

### Smart Page Detection
- **On Westlaw Pages**: Shows all controls and functionality
- **On Other Pages**: Displays helpful message directing users to Westlaw

### Keyboard Shortcuts
Navigation shortcuts work when not typing in input fields:

| Key | Action |
|-----|--------|
| `N` or `→` | Next search term |
| `←` | Previous search term |
| `↑` | Scroll to top |
| `Enter` | Copy document & download notes |

## Features

### Typography Controls
- **Font Size**: Adjust document font size with proper scaling for headings and footnotes
- **Line Height**: Fine-tune line spacing for optimal readability

### Layout Controls
- **Margins**: Symmetrical margin adjustment for comfortable reading width
- **Content Positioning**: Move content left or right independently
- **Sidebar Toggle**: Hide distracting sidebar elements
- **Focus Mode**: Remove header/footer clutter while keeping navigation

### Copy & Notes Integration
- **Smart Copy**: Automatically finds and clicks Westlaw's copy button
- **Notes File**: Downloads structured notes file with sections for research, citations, and key points
- **File Naming**: Auto-names files with current date (westlaw-notes-YYYY-MM-DD.txt)

### Smart Persistence
- All settings are saved per domain
- Settings automatically restored when returning to Westlaw
- Real-time status display in popup

### User Experience
- **Visual Icon**: Orange background with blue "W" for easy identification
- **Page Detection**: Shows helpful message when not on Westlaw pages
- **Clean Interface**: Organized popup with clear section divisions

### Dynamic Content Support
- Automatically applies settings to dynamically loaded content
- Works with all Westlaw document types and interfaces

## Advantages Over Userscript

- **No Userscript Manager Required**: Works directly in Chrome
- **Better Integration**: Native Chrome extension popup interface
- **Easier Distribution**: Can be packaged and shared as `.crx` file
- **More Reliable**: Uses Chrome's native storage and messaging APIs
- **Better Security**: Chrome's extension security model

## Compatibility

- **Browser**: Chrome (Manifest V3)
- **Westlaw**: All document types and interfaces
- **Permissions**: Only requests storage and activeTab permissions

## Development

The extension consists of:
- `manifest.json`: Extension configuration
- `content.js`: Main functionality injected into Westlaw pages
- `popup.html/js`: User interface for controls
- `icons/`: Extension icons

## Version

Current version: **1.6**

### Recent Updates
- **v1.6**: Added smart page detection with user-friendly warnings for non-Westlaw pages
- **v1.5**: Updated icons with orange background and blue "W" for better visibility
- **v1.4**: Restored copy & notes functionality with automatic file downloads
- **v1.3**: Added move left/right margin controls

## Support

This extension enhances the Westlaw experience without modifying underlying functionality. All changes are cosmetic and reversible. 