# Texas Appellate Highlighter

Chrome extension that highlights Texas appellate case-search rows on `search.txcourts.gov`.

- **CCA (`PD-*`)**: PDR stage from the statewide IACLS CCA database.
- **COA (`NN-YY-NNNNN-XX`)**: stage from the Bennett COA database (bar 00792970).

## Colors

### CCA / PDR

| Color | Stage |
|--------|--------|
| Yellow | Granted (pending merits — not yet submitted/decided) |
| Green | Submitted |
| Grey | Decided (opinion issued) |
| Red | Refused |

Other PDR stages (`awaiting_disp`, `pre_pdr`, abandoned, stored) are left uncolored.

### COA (Bennett cases)

| Color | Stage |
|--------|--------|
| Yellow | Pending (record / briefing) |
| Green | Submitted |
| Grey | Decided (opinion issued) |
| Red | Dismissed |

## Install (load unpacked)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select:

   `/Users/markbennett/github/chrome-extensions/cca-pdr-highlighter`

4. Open a search, e.g.

   https://search.txcourts.gov/CaseSearch.aspx?coa=coscca&s=c

   or any COA court (`coa=coa01` … `coa=coa15`). Search by bar number (or case number). Matching rows paint by stage; a legend sits at the bottom-right.

5. Toolbar popup → **Refresh status map** to force a fresh download from iacls.org.

## Data sources

- CCA JSON: `https://iacls.org/cca/status_map.json`
  - Built on iacls by `export_status_map.py` (same stage rules as the timeline page)
  - Wired into `daily_update.py` after the timeline export (cron ~09:30 America/Chicago)
- COA JSON: `https://iacls.org/coa/status_map.json`
  - Bennett cases only (bar 00792970)
  - Built by `server/coa/build.py` / `server/coa/daily_update.py`

## Layout

```
cca-pdr-highlighter/     load-unpacked this folder
  manifest.json
  background.js          fetch + cache CCA and COA status maps
  content.js             paint search.txcourts.gov rows
  content.css
  popup.html / popup.js
  icons/
  server/
    export_status_map.py copy of CCA script deployed to iacls
    coa/                 Bennett COA database builder
```

## Server ops

```bash
ssh iacls 'cd /home/ubuntu/github/cca && python3 export_status_map.py'
# → output/status_map.json (also https://iacls.org/cca/status_map.json)

# Local rebuild of Bennett COA map, then deploy:
cd server/coa
python3 build.py --incremental
python3 export_status_map.py --no-deploy
scp output/status_map.json iacls:/var/www/iacls.org/html/coa/status_map.json
```