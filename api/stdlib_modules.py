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
from functools import lru_cache
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parent / "stdlib_modules.json"


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

    Keys in the JSON are case-sensitive to preserve Python 2 module casing
    (`ConfigParser`, `Tkinter`, `Queue`). Agents typically emit the exact
    name, so we match case-sensitively first and fall back to a lowercase
    match for forgiving lookup.
    """
    if not ecosystem or not package:
        return None
    bucket = _load().get(ecosystem.lower()) or {}
    if package in bucket:
        return bucket[package]
    lower = package.lower()
    for name, entry in bucket.items():
        if name.lower() == lower:
            return entry
    return None


def is_stdlib(ecosystem: str, package: str) -> bool:
    return lookup(ecosystem, package) is not None
