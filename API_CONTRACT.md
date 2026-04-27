# DepScope API Contract — v1

**Status**: STABLE since 2026-04-27. Backward-compatible until at least 2027-04-27.

This document is the contract DepScope makes with its callers — humans, MCP clients, and AI agents that `curl` our endpoints inside autonomous loops.

If you depend on a v1 endpoint, you can expect it to keep working.
If we break it without bumping the version, that is a bug — file an issue.

---

## Promises

1. **Additive-only.** Existing fields keep their type and meaning. New fields may appear; old fields will not disappear or change semantics within v1.
2. **No path renames.** A `/api/check/{ecosystem}/{package}` URL will not move within v1.
3. **No breaking enum values.** A `recommendation.action` that was `safe_to_use` yesterday will not become `SAFE_TO_USE` today.
4. **Volatile fields are marked.** Fields prefixed `_` (e.g. `_cache`, `_response_ms`, `_powered_by`) are diagnostic and may change shape any time. Do not depend on them.
5. **Breaking changes go in /api/v2/.** When v2 ships, v1 stays parallel for 12 months minimum.

## What "v1" covers

Every path under `/api/*` listed in `schemas/openapi-v1.json` is part of v1, **except** `/api/admin/*` (operator-only, may change without notice).

Public, contract-stable endpoint families (paths verified against OpenAPI 2026-04-27):
- `/api/check/{ecosystem}/{package}` — full package report
- `/api/ai/brief/{ecosystem}/{package}` — token-cheap LLM brief
- `/api/prompt/{ecosystem}/{package}` — plain-text package brief (~300 tokens)
- `/api/typosquat/{ecosystem}/{package}`
- `/api/malicious/{ecosystem}/{package}`
- `/api/vulns/{ecosystem}/{package}`
- `/api/quality/{ecosystem}/{package}`
- `/api/maintainers/{ecosystem}/{package}`
- `/api/scorecard/{ecosystem}/{package}`
- `/api/health/{ecosystem}/{package}`
- `/api/license/{ecosystem}/{package}`
- `/api/licenses/{ecosystem}/{package}` — transitive aggregate (plural)
- `/api/versions/{ecosystem}/{package}`
- `/api/latest/{ecosystem}/{package}`
- `/api/exists/{ecosystem}/{package}`
- `/api/alternatives/{ecosystem}/{package}`
- `/api/install/{ecosystem}/{package}` — registry-correct install command
- `/api/breaking/{ecosystem}/{package}` (query: `from_version`, `to_version`)
- `/api/bugs/{ecosystem}/{package}` (query: `version`)
- `/api/migration/{ecosystem}/{from_pkg}/{to_pkg}`
- `/api/pin_safe/{ecosystem}/{package}` (query: `constraint`, `min_severity`, `include_prerelease`)
- `/api/provenance/{ecosystem}/{package}`
- `/api/tree/{ecosystem}/{package}` — transitive dep tree
- `/api/history/{ecosystem}/{package}`
- `/api/compare/{ecosystem}/{packages_csv}` — GET path-style comparison
- `/api/compat` (POST body: `{packages: {name: version}}`)
- `/api/scan` (POST body: `{ecosystem?, packages: [...]}`)
- `/api/check_bulk` (POST body: `{items: [...]}`)
- `/api/error/resolve` (POST body: `{error?, query?, context?}`)
- `/api/error/{error_hash}` — resolve by hash
- `/api/trending` (query: `ecosystem?`, `scope?`, `limit?`)
- `/api/maintainer/trust/{platform}/{username}` — single maintainer signal
- `/api/anomaly` — current anomalous activity
- `/api/live/malicious` — fresh malicious advisories
- `/api/benchmark/hallucinations` — hallucination corpus
- `/api/benchmark/verify` — verify a specific (eco, pkg) against corpus
- `/api/ecosystems` — supported ecosystems list
- `/api/status` — system status
- `/api/savings` — token-saving counters
- `/api/now` — server time

## Ecosystems

19 supported, fixed list: `npm, pypi, cargo, go, composer, maven, nuget, rubygems, pub, hex, swift, cocoapods, cpan, hackage, cran, conda, homebrew, jsr, julia`.

Adding an ecosystem = additive. Removing one = breaking → v2 only.

## Stability tier of nested fields

| Field | Tier | Notes |
|-------|------|-------|
| `recommendation.action` | **stable enum** | One of: `safe_to_use`, `update_required`, `do_not_use`, `find_alternative`, `legacy_but_working`, `no_install_needed`, `use_with_caution` |
| `recommendation.summary` | **stable string** | Free text, may rephrase but always present |
| `vulnerabilities.count`, `vulnerabilities.critical`, `vulnerabilities.high` | **stable int** | Always integer ≥ 0 |
| `health.score` | **stable int 0–100** | |
| `version_exists` | **stable bool** | |
| `is_stdlib` | **stable bool** | When true, `hint.kind` is also present |
| `hint.kind` | **stable enum** | `node_builtin`, `python_stdlib`, `apple_framework`, `framework_sdk`, `language_builtin` |
| `latest_version`, `downloads_weekly` | **volatile** | Change daily. Do not snapshot-test. |
| `_cache`, `_response_ms`, `_powered_by` | **volatile** | Diagnostic only |

## How to depend on v1

For agents and MCP clients, the safe pattern is:
```
GET /api/check/npm/react
```
Read `recommendation.action` and `version_exists` and `vulnerabilities.count`. Do not script around `latest_version` numbers — they change.

For CI gates:
```
GET /api/health/npm/your-pkg
```
Returns `{score, risk}`. Block on `score < 70` or `risk in (high, critical)`.

## Versioning of breaking changes

When something must break (rare), we create `/api/v2/<endpoint>`. The `/api/<endpoint>` path stays as v1, frozen, for 12 months. Both ship in OpenAPI; clients pick their version.

## Snapshot tests

`tests/snapshot_test.py` runs daily against the live API and asserts that v1 endpoints keep returning the same structure and stable-tier values for a fixed corpus of test packages. CI fails if a v1 contract regresses.

Golden snapshots live in `tests/snapshots/`. Updating them requires a deliberate `--update` flag and a paired entry in `CHANGELOG.md`.

## Reporting a contract break

If a v1 endpoint breaks for you: file an issue with the request, the response, and the date. We treat v1 regressions as P0.
