# Bennett COA database

Builds `coa.db` from a TAMES search of bar **00792970**, classifies each Court of Appeals case, and exports `output/status_map.json` for the highlighter.

```bash
python3 test_classify.py
python3 build.py                 # full fetch (~217 cases)
python3 build.py --incremental   # skip decided/dismissed
python3 export_status_map.py --no-deploy
python3 daily_update.py          # incremental + export (on iacls, deploys)
```

`tames.py` loads the tx-coa MCP `server.py` (MCP stubbed) so search/get_case stay in one parser.
