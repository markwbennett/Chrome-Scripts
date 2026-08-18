"""Load search_cases / get_case from the tx-coa scraper without starting MCP."""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

_CANDIDATES = (
    Path(__file__).resolve().parent / "tames_lib.py",
    Path("/Users/markbennett/github/claude-config/mcp-servers/tx-coa/server.py"),
    Path("/home/ubuntu/github/tx-coa/server.py"),
)


def _stub_mcp() -> None:
    if "mcp.server.fastmcp" in sys.modules:
        return
    mcp = types.ModuleType("mcp")
    server = types.ModuleType("mcp.server")
    fastmcp = types.ModuleType("mcp.server.fastmcp")

    class FastMCP:
        def __init__(self, *args, **kwargs):
            pass

        def tool(self, *args, **kwargs):
            def deco(fn):
                return fn

            return deco

        def run(self):
            pass

    fastmcp.FastMCP = FastMCP
    sys.modules.setdefault("mcp", mcp)
    sys.modules.setdefault("mcp.server", server)
    sys.modules["mcp.server.fastmcp"] = fastmcp


def _load_module():
    _stub_mcp()
    for path in _CANDIDATES:
        if not path.is_file():
            continue
        spec = importlib.util.spec_from_file_location("coa_tames_lib", path)
        if spec is None or spec.loader is None:
            continue
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    raise FileNotFoundError(
        "tx-coa server.py not found. Copy it to server/coa/tames_lib.py "
        "or install it at one of: " + ", ".join(str(p) for p in _CANDIDATES)
    )


_mod = _load_module()
search_cases = _mod.search_cases
get_case = _mod.get_case
guess_court_code = _mod._guess_court_code
