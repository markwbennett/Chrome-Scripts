# Chrome Westlaw Enhancements - Chrome Extension

A Chrome extension that enhances the Westlaw experience with customizable typography, layout controls, and navigation shortcuts.

## Quick Installation

**For easy installation instructions, see [INSTALL.md](INSTALL.md)**

## Advanced Installation

### Option 1: Load as Developer Extension (Recommended)

1. **Open Chrome Extensions**: Go to `chrome://extensions/`
2. **Enable Developer Mode**: Toggle the "Developer mode" switch in the top right
3. **Load Extension**: Click "Load unpacked" and select the `chrome-westlaw-extension` folder
4. **Pin Extension**: Click the puzzle piece icon in Chrome toolbar and pin "Chrome Westlaw Enhancements"

### Option 2: Package and Install

1. **Package Extension**: In Chrome extensions page, click "Pack extension"
2. **Select Directory**: Choose the `chrome-westlaw-extension` folder
3. **Install**: Drag the generated `.crx` file to Chrome extensions page

## Usage

### Extension Popup
Click the extension icon (orange square with blue "W") in your toolbar while on any Westlaw page to access all controls:

#### Master Controls
- **Killswitch**: 🔴/🟢 Disable/Enable all modifications instantly
- **Reload Extension**: 🔄 Reload the extension if needed

#### Feature Toggles
- **Font Size Controls**: Enable/disable font size adjustment buttons
- **Line Height Controls**: Enable/disable line height adjustment buttons
- **Margin Controls**: Enable/disable margin adjustment buttons
- **Hide Sidebar**: Toggle visibility of Westlaw's right sidebar
- **Focus Mode**: Hide header/footer elements for distraction-free reading
- **Keep Session Alive**: Send periodic pings to prevent session timeout
- **Citing References Focus**: Show only content column in citing references tables
- **Search Navigation**: Enable/disable search term navigation buttons and shortcuts
- **Document Navigation**: Enable/disable document navigation buttons and shortcuts
- **Notes Feature**: Enable/disable notes saving and viewer functionality
- **Opinion Colorizer (Borders)**: Add colored borders to different opinion sections
- **Opinion Colorizer (Highlighting)**: Add background highlighting to opinion sections
- **Star Page Highlighting**: Highlight starred content with enhanced visibility
- **Inline Footnotes**: Move footnotes inline with the text for easier reading
- **Link Opener**: Add link opening options to text selection menu

#### Typography Controls
- **Font Size**: Increase/Decrease/Reset (10-36px range)
- **Line Height**: Increase/Decrease/Reset (1.0-3.0 range, 0.1 increments)

#### Layout Controls
- **Margins**: Increase/Decrease/Reset symmetrical margins
- **Move Left/Right**: Shift content left or right independently

#### Navigation Controls
- **Search Term Navigation**: Next/Previous search terms, scroll to top
- **Document Navigation**: Navigate between previous/next documents
- **Copy & Notes**: Save quotations and view notes

### Smart Page Detection
- **On Westlaw Pages**: Shows all controls and functionality
- **On Other Pages**: Displays helpful message directing users to Westlaw

### Keyboard Shortcuts
Navigation shortcuts work when not typing in input fields:

| Key | Action |
|-----|--------|
| `N` or `→` | Next search term |
| `←` | Previous search term |
| `↑` | Scroll to top / Previous document |
| `Shift + ←` | Previous document |
| `Shift + →` | Next document |
| `Enter` | Copy document & download notes |
| `O` | Open selected links in new tabs (requires Link Opener enabled) |

## Features

### Master Controls
- **Killswitch**: Instantly disable/enable all modifications with visual feedback
- **Extension Reload**: Quick extension restart if needed

### Typography Enhancement
- **Font Size Control**: Adjust document font size (10-36px) with proper scaling for headings and footnotes
- **Line Height Control**: Fine-tune line spacing (1.0-3.0) for optimal readability
- **Dynamic Application**: Settings apply to all content including dynamically loaded elements

### Layout & Reading Experience
- **Margin Control**: Symmetrical margin adjustment for comfortable reading width
- **Content Positioning**: Move content left or right independently
- **Sidebar Management**: Hide/show Westlaw's right sidebar
- **Focus Mode**: Remove header/footer clutter while preserving navigation
- **Star Page Enhancement**: Enhanced highlighting for starred content with better contrast

### Opinion & Document Organization
- **Opinion Colorizer**: Visual organization of court opinions with distinct colors:
  - Blue borders/highlighting for majority opinions
  - Green for concurring opinions
  - Orange for concurring-and-dissenting opinions
  - Red for dissenting opinions
  - Grey for attorney blocks
- **Citing References Focus**: Streamline citing references tables to show only content
- **Inline Footnotes**: Move footnotes inline with text for easier reading

### Navigation & Productivity
- **Search Term Navigation**: Jump between highlighted search terms with keyboard shortcuts
- **Document Navigation**: Navigate between previous/next documents in search results
- **Link Opener**: Select text and open all contained links in new tabs with 'O' key or selection menu
- **Keep Session Alive**: Prevent session timeout with periodic background pings (5-minute intervals)

### Notes & Research Management
- **Smart Copy**: Automatically finds and clicks Westlaw's copy button with reference
- **Enhanced Selection Menu**: Additional options in text selection popup:
  - "Copy cite to notes" for quick quotation saving
  - "Open links in new tabs" (when Link Opener enabled)
- **Notes Viewer**: Dedicated interface for managing saved quotations
- **File Integration**: Downloads structured notes with research sections

### Smart Persistence & Reliability
- **Domain-Specific Settings**: All preferences saved per domain (westlaw.com vs other sites)
- **Master Tab Coordination**: Features like Keep Alive use single "master" tab to avoid conflicts
- **Real-Time Status**: Live status display in popup showing current settings
- **Feature Toggle System**: Granular control over which features are active

### User Experience
- **Modern Toggle Interface**: Clean switch-based controls for all features
- **Visual Feedback**: Color-coded notifications for different feature types
- **Page Detection**: Automatic detection of Westlaw pages vs other sites
- **Keyboard-Friendly**: Comprehensive keyboard shortcuts that don't interfere with typing
- **Dynamic Content Support**: Works with all Westlaw document types and dynamically loaded content

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

Current version: **1.6.6**

### Recent Updates
- **v1.6.6**: Add Link Opener feature, improve opinion colorization with distinct orange for concurring/dissenting sections, add "Copy cite to notes" to selection menu, fix keyboard shortcut 'O', improve toggle switch UI feedback
- **v1.6.5**: Consolidate popup interface and fix footnote ordering
- **v1.6.4**: Improve popup layout and fix toggle communication
- **v1.6.3**: Add privacy policy for Chrome Web Store submission
- **v1.6.2**: Fix killswitch functionality and improve footnote reorganization
- **v1.6.1**: Add inline footnote reorganization feature
- **v1.6.0**: Major UI overhaul with feature toggles, killswitch, and enhanced controls
- **v1.5**: Add star page highlighting, Westlaw Edge compatibility, font sizing for star pages
- **v1.4**: Enhanced notes system, content highlighting, and UI improvements
- **v1.3**: Refined icon design and improved visual presentation
- **v1.2**: Enhanced icon design with better positioning and sizing
- **v1.1**: Improved copy/paste reliability with better timing and fallback mechanisms
- **v1.0**: Initial release with typography controls, layout adjustments, and copy/notes functionality

## Support

This extension enhances the Westlaw experience without modifying underlying functionality. All changes are cosmetic and reversible. 
