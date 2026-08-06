# LGS Blank-Probe Blocker

Stops `portal.lgsonlinesolutions.com` from opening sticky `about:blank` tabs.

## Why this exists

The LGS discovery portal’s login (and later navigation) JavaScript runs a
popup-blocker probe:

```js
window.open('about:blank', '', 'top=1000,height=10,width=10,...')
// then immediately .close()
```

On Vivaldi/Chromium that often becomes a real tab. Focus jumps there; `.close()`
races or fails; multiple blank tabs accumulate. Popups can already be allowed
and the problem still happens.

This extension:

1. **Patches `window.open` in the page** (all frames, before page scripts) so
   blank/empty opens return a fake window that supports `.close()`. Real URLs
   still open normally. If the page later navigates the fake window to a real
   URL, a real tab opens then.
2. **Closes orphan `about:blank` tabs** opened from an LGS tab if they stay blank
   for ~600 ms (backup if anything slips through).

## Install in Vivaldi

1. Open `vivaldi://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Choose this folder:

   `/Users/markbennett/github/chrome-extensions/lgs-blank-probe-blocker`

5. Hard-reload the LGS portal (or close and reopen the tab)

To update after changes: on `vivaldi://extensions`, click the reload arrow on
this extension, then reload the portal tab.

## Scope

Only runs on `*.lgsonlinesolutions.com`. No other sites are patched.

## Credentials

Do **not** put portal passwords in this extension. None are stored here.
