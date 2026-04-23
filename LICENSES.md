# Licenses — DepScope

Last audit: 2026-04-23.
Contact for license disputes: **legal@depscope.dev**.

## 1. DepScope source code

All code in this repository (Python under `api/`, `scripts/`, Node.js under
`mcp-server/`, TypeScript/React under `frontend/`) is © **SPI Operations Ltd
/ DepScope.dev** and released under the license stated in the top-level
[`LICENSE`](./LICENSE) file.

The DepScope brand, logos, and trade dress are **not** under that license —
see §5 below.

## 2. Third-party code consumed at runtime

### 2.1 Python runtime dependencies

Resolved from `pyproject.toml` (or `requirements.txt` where present).
Full list with exact versions is reproducible via:

```
.venv/bin/python3 -m pip freeze --all
```

Top dependencies and their licenses (as of last audit):

| Package | License | Notes |
|---------|---------|-------|
| `fastapi` | MIT | core web framework |
| `uvicorn` | BSD-3-Clause | ASGI server |
| `asyncpg` | Apache-2.0 | PostgreSQL driver |
| `aiohttp` | Apache-2.0 | HTTP client |
| `pydantic` | MIT | data validation |
| `python-multipart` | Apache-2.0 | form parsing |
| `redis` | MIT | cache client |
| `requests` | Apache-2.0 | HTTP client (sync) |
| `python-dotenv` | BSD-3-Clause | env loader |
| `pyjwt` | MIT | JWT |
| `email-validator` | CC0-1.0 | email parsing |

All runtime dependencies are **permissive** (MIT / Apache-2.0 / BSD /
ISC / Unlicense / CC0). **No GPL, AGPL, SSPL, or Commons-Clause**
dependencies are linked into the service. A copy of each third-party
license is present under `vendor-licenses/` (bulk-extracted before each
release).

### 2.2 Node runtime dependencies (`mcp-server/`)

Governed by `mcp-server/package.json`. Direct deps inspected:

| Package | License |
|---------|---------|
| `@modelcontextprotocol/sdk` | MIT |
| `express` | MIT |
| `node-fetch` | MIT |
| `dotenv` | BSD-2-Clause |

Transitive deps audited via `npx license-checker --production --onlyAllow
"MIT;BSD-2-Clause;BSD-3-Clause;ISC;Apache-2.0;CC0-1.0;Unlicense"`. Audit
passes clean as of last release.

### 2.3 Frontend dependencies (`frontend/package.json`)

Next.js (MIT), React (MIT), Tailwind CSS (MIT), recharts (MIT). Full
tree inspected via the same license-checker allowlist; no copyleft
artifacts. Font/icon assets are either OFL-1.1 / MIT / public-domain —
see `frontend/public/LICENSES-ASSETS.md` if and when assets are added.

## 3. Third-party data consumed at runtime

See [`DATA_SOURCES.md`](./DATA_SOURCES.md) for the authoritative list,
including ToS URLs for each source and retention policy. In short:
all data is fetched from **public, freely licensed** sources with no
ToS restrictions that would preclude derivative, aggregate re-use. We
do **not** scrape sites that prohibit automated access, and we respect
`robots.txt` on all crawl paths.

## 4. Outbound license (what consumers of DepScope get)

- The **public API** returns metadata that is a mix of:
  - Attributed facts lifted from upstream registries (which are
    themselves published under open terms) — treated as public fact
    under EU Database Directive 96/9/EC and U.S. fair-use.
  - Our **derived computations** (health scores, alternatives ranking,
    hallucination frequency stats) — licensed under the same license
    as the source code above.
- The **MCP server** is identical in license to the code repo.
- Aggregated dataset dumps (planned) will be released under **CC0-1.0**
  to maximise adoption and avoid licence-compatibility headaches.

## 5. Trademarks & trade dress

"DepScope", the DepScope logo, and the visual design of
[depscope.dev](https://depscope.dev) are unregistered trademarks of
SPI Operations Ltd. Consumer use of the API is permitted without a
trademark license; commercial re-skinning, hosting under the
"DepScope" name, or confusingly similar branding is not. Write to
`legal@depscope.dev` for permission.

## 6. Audit log

Every material change to this file lands in the git history; the last
10 changes are summarised below.

- 2026-04-23: initial audit — no GPL/AGPL, no SSPL, all permissive.

## 7. Contact

`legal@depscope.dev` — license questions, allowed uses.
`security@depscope.dev` — vulnerability reports.
`privacy@depscope.dev` — GDPR requests.
