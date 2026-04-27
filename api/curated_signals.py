"""Curated signals for AI-agent confusion not captured by registry data.

- RENAMES: package was renamed/republished under a new name (often @scoped).
  Surface the canonical name in /api/check responses for the old name.
- MAINTENANCE_MODE: package is published as 'maintained' on the registry but
  community-flagged as in maintenance mode. Used by /api/migration to warn
  when migrating TO such a package.
"""
from __future__ import annotations

# (ecosystem, lower-name) -> {to, note, source_url?}
RENAMES: dict[tuple[str, str], dict] = {
    ("npm", "tanstack-query"): {
        "to": "@tanstack/react-query",
        "note": "Canonical TanStack Query is published under @tanstack/. The bare 'tanstack-query' npm pkg is a low-quality squat.",
        "source_url": "https://tanstack.com/query/latest",
    },
    ("npm", "react-query"): {
        "to": "@tanstack/react-query",
        "note": "react-query was renamed to @tanstack/react-query at v4 (2022).",
        "source_url": "https://tanstack.com/query/v4/docs/framework/react/guides/migrating-to-react-query-4",
    },
    ("npm", "node-sass"): {
        "to": "sass",
        "note": "node-sass is deprecated; the official replacement is the pure-JS 'sass' package (Dart Sass).",
        "source_url": "https://sass-lang.com/blog/libsass-is-deprecated/",
    },
    ("pypi", "sklearn"): {
        "to": "scikit-learn",
        "note": "The pypi package 'sklearn' is a deprecated stub; the real package is 'scikit-learn'.",
        "source_url": "https://pypi.org/project/sklearn/",
    },
    ("pypi", "discord"): {
        "to": "discord.py",
        "note": "The Discord library on PyPI is 'discord.py', not 'discord'.",
        "source_url": "https://pypi.org/project/discord.py/",
    },
}

# (ecosystem, lower-name) -> human-readable note
MAINTENANCE_MODE: dict[tuple[str, str], str] = {
    ("npm", "moment"): "moment is in long-term maintenance mode. Authors recommend dayjs / luxon / date-fns / Temporal for new code.",
    ("npm", "request"): "request is deprecated as of 2020-02. Use node-fetch / axios / undici instead.",
    ("npm", "node-sass"): "node-sass is deprecated. Use 'sass' (Dart Sass) instead.",
    ("npm", "left-pad"): "left-pad has been superseded by built-in String.prototype.padStart (ES2017).",
    ("pypi", "nose"): "nose is unmaintained since 2015. Use pytest.",
    ("pypi", "imp"): "imp module is deprecated since Python 3.4. Use importlib.",
}


def lookup_rename(ecosystem: str, package: str) -> dict | None:
    return RENAMES.get(((ecosystem or "").lower(), (package or "").lower()))


def is_maintenance_mode(ecosystem: str, package: str) -> str | None:
    return MAINTENANCE_MODE.get(((ecosystem or "").lower(), (package or "").lower()))
