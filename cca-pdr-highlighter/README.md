# CCA PDR Highlighter

Chrome extension that highlights Texas Court of Criminal Appeals case-search rows by PDR stage, using the IACLS CCA database on iacls.org.

## Colors

| Color | Stage |
|--------|--------|
| Yellow | Granted (pending merits — not yet submitted/decided) |
| Green | Submitted |
| Grey | Decided (opinion issued) |
| Red | Refused |

Other stages (`awaiting_disp`, `pre_pdr`, abandoned, stored) are left uncolored.

## Install (load unpacked)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select:

   `/Users/markbennett/github/chrome-extensions/cca-pdr-highlighter`

4. Open a CCA search, e.g.

   https://search.txcourts.gov/CaseSearch.aspx?coa=coscca&s=c

   Search by bar number (or case number). Matching rows paint by stage; a legend sits at the bottom-right.

5. Toolbar popup → **Refresh status map** to force a fresh download from iacls.org.

## Data source

- Public JSON: `https://iacls.org/cca/status_map.json`
- Built on iacls by `export_status_map.py` (same stage rules as the timeline page)
- Wired into `daily_update.py` after the timeline export (cron ~09:30 America/Chicago)

## Layout

```
cca-pdr-highlighter/     load-unpacked this folder
  manifest.json
  background.js          fetch + cache status map
  content.js             paint search.txcourts.gov rows
  content.css
  popup.html / popup.js
  icons/
  server/
    export_status_map.py copy of script deployed to iacls
```

## Server ops

```bash
ssh iacls 'cd /home/ubuntu/github/cca && python3 export_status_map.py'
# → output/status_map.json (also https://iacls.org/cca/status_map.json via symlink)
```
