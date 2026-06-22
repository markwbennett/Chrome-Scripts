# X Mass Blocker

## Identity
- **Purpose**: Vivaldi/Chrome extension that bulk-blocks users from X/Twitter search results pages
- **Language/stack**: JavaScript, Chrome Extension Manifest V3
- **Entry point**: manifest.json (extension root), blocker.js (content script), popup.html/popup.js (UI)
- **Key directories**: Single flat directory; all files at root
- **Repo**: Part of ~/github/chrome-extensions/ (multi-extension repo)

## Now
Extension is built and ready for installation. Has not been tested in the browser yet. Next step is to load it unpacked in Vivaldi (`vivaldi://extensions` > Developer mode > Load unpacked) and test against a live X search results page. The DOM selectors (`data-testid="caret"`, `data-testid="cellInnerDiv"`, `data-testid="confirmationSheetConfirm"`) may need adjustment if X has changed its markup.

## Known
