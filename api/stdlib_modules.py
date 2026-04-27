"""Registry of language builtins/stdlib names that LLMs mistake for packages.

When an agent calls /check_package for `urllib2`, a bare 404 wastes a round
trip — the agent will re-hallucinate the same name. Returning a structured
stdlib hint teaches the agent (and downstream LLM consumers) the real path
without them needing to look it up.

Data file: data/stdlib_modules.json
Wiring: in api/main.py call `lookup_stdlib(ecosystem, package)` at the start of
/check_package, /package_exists and /ai_brief. When a match is returned,
respond with a 200 payload including `{"kind": "...", "replacement": "...",
"note": "..."}` and skip the registry fetch.
"""
from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parent / "stdlib_modules.json"

# Python 3 stdlib (Python 3.10+). Fallback for `os`, `sys`, `json`, `re`, etc.
_PY3_STDLIB = set(getattr(sys, "stdlib_module_names", set()))


@lru_cache(maxsize=1)
def _load() -> dict:
    if not _DATA_FILE.exists():
        return {}
    try:
        raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def lookup(ecosystem: str, package: str) -> dict | None:
    """Return stdlib hint for ecosystem/package, or None if unknown.

    JSON keys are case-sensitive (Py2 names like `ConfigParser`, `Tkinter`).
    Match case-sensitively first, then case-insensitively. For pypi, fall
    back to Python 3 stdlib so `os`, `sys`, `json`, `re` etc. resolve.
    """
    if not ecosystem or not package:
        return None
    eco = ecosystem.lower()
    bucket = _load().get(eco) or {}
    if package in bucket:
        return bucket[package]
    lower = package.lower()
    for name, entry in bucket.items():
        if name.lower() == lower:
            return entry
    # Fallback: Python 3 stdlib
    if eco == "pypi":
        root = package.split(".")[0]
        if root in _PY3_STDLIB or root.lower() in _PY3_STDLIB:
            return {
                "kind": "Python 3 standard library",
                "replacement": f"import {package} directly — no install needed",
                "note": "Built-in Python 3 stdlib module. AI agent likely hallucinated this as a pypi package.",
            }
    return None


def is_stdlib(ecosystem: str, package: str) -> bool:
    return lookup(ecosystem, package) is not None
