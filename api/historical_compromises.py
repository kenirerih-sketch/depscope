"""Historical package compromise registry.

Supplements OSV/NVD signals: flags packages that were compromised, sabotaged, or
hijacked in the past even when the currently-latest version is clean. Lets
/check_malicious and /ai_brief return a non-null historical_compromise block so
agents don't treat a once-compromised package as having no reputational history.

Data file: data/historical_compromises.json (see _meta.description).
Wiring: import in api/main.py and merge the result into the check_malicious
payload, e.g.

    from api.historical_compromises import lookup as lookup_historical
    ...
    hist = lookup_historical(ecosystem, package)
    if hist:
        response["historical_compromise"] = hist
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parent / "historical_compromises.json"


@lru_cache(maxsize=1)
def _load() -> dict:
    if not _DATA_FILE.exists():
        return {}
    try:
        raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def _key(ecosystem: str, package: str) -> str:
    return f"{(ecosystem or '').lower()}/{(package or '').lower()}"


def lookup(ecosystem: str, package: str) -> dict | None:
    """Return incident metadata for ecosystem/package, or None if unknown."""
    return _load().get(_key(ecosystem, package))


def has_history(ecosystem: str, package: str) -> bool:
    return lookup(ecosystem, package) is not None


def all_compromised() -> list[dict]:
    """Return full list as records with `ecosystem` / `package` fields split."""
    out = []
    for k, v in _load().items():
        if "/" not in k:
            continue
        eco, pkg = k.split("/", 1)
        out.append({"ecosystem": eco, "package": pkg, **v})
    return out
