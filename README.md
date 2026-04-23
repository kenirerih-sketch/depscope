<div align="center">

# DepScope

**Package Intelligence for AI Agents**

One free API. **19 ecosystems** (npm, PyPI, Cargo, Go, Maven, NuGet, RubyGems, Composer, Pub, Hex, Swift, CocoaPods, CPAN, Hackage, CRAN, Conda, Homebrew, **JSR, Julia**). Live OSV + KEV + EPSS. CC0 Hallucination Benchmark. Real-time malicious stream.
Built so LLM agents stop hallucinating dependencies, stop re-fetching the same JSON, and stop shipping known-vulnerable code.

**LLM-optimized responses cut input tokens by ~74% vs raw registry JSON.**

[![API Status](https://img.shields.io/badge/API-live-brightgreen)](https://depscope.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Ecosystems](https://img.shields.io/badge/ecosystems-19-cyan)](https://depscope.dev/api-docs)
[![MCP Tools](https://img.shields.io/badge/MCP%20tools-22-purple)](https://www.npmjs.com/package/depscope-mcp)

[Website](https://depscope.dev) · [API Docs](https://depscope.dev/api-docs) · [Swagger](https://depscope.dev/docs) · [GPT Store](https://chatgpt.com/g/g-69e02d12226c8191a7f24f3a8481bc4e-depscope) · [RapidAPI](https://rapidapi.com/depscope/api/depscope) · [npm](https://www.npmjs.com/package/depscope-mcp)

</div>

---

## What's new (v0.7)

- **19 ecosystems**: added JSR (Deno/Bun TypeScript registry) and Julia (scientific/ML).
- **Historical Compromise KB**: seeded with canonical supply-chain incidents (event-stream@3.3.6, ua-parser-js 0.7.29, coa, rc, node-ipc ≥10.1.1, colors 1.4.44-liberty, xrpl.js, ctx, colorama typosquats, rustdecimal, ...). Surfaces in `/api/check` even when the package was unpublished.
- **License risk classifier** on every package: `permissive` / `weak_copyleft` / `strong_copyleft` / `network_copyleft` / `proprietary` / `unknown` + commercial-use notes.
- **Version-scoped check**: `?version=` on `/api/check`, `/api/prompt`, `/api/health`. Returns a `version_scoped` block with vulns filtered to THAT pin + a dedicated recommendation.
- **Transitive dep walk** in `/api/scan`: `include_transitive: true` with depth limit. express@4.19 → 46 packages at depth 2.
- **Lockfile ingestion** in `/api/scan`: 9 formats (package-lock, pnpm-lock, yarn.lock, poetry.lock, Pipfile.lock, composer.lock, Cargo.lock, requirements.txt, go.sum).
- **SBOM export**: `format: "cyclonedx"` or `"spdx"` on `/api/scan`.
- **Real-time malicious stream** `GET /api/live/malicious` (public SSE) — new OpenSSF advisories in seconds, not days.
- **Hallucination Benchmark v1** (CC0) at [depscope.dev/benchmark](https://depscope.dev/benchmark) — corpus of package names that AI coding agents hallucinate, + `/api/benchmark/verify` for eval harnesses.
- **depscope-cli** npm package: `npx depscope-cli express` — zero config, zero auth.

---

## Why DepScope

AI coding agents suggest packages every second of every day. They:

- Hallucinate package names that don't exist.
- Recommend deprecated packages that have been dead for years.
- Have no idea about freshly-disclosed CVEs.
- Guess version numbers from stale training data.
- Re-search the same runtime error millions of times.
- Bump versions without knowing if the combo has ever worked in the wild.

They also **all do the same work independently** — millions of redundant round-trips to npm, PyPI, OSV for identical bytes. That's wasted bandwidth, wasted energy, wasted tokens.

DepScope is the shared fix: aggregate once, serve everyone in milliseconds.

### The three pillars

| Pillar | What it means |
|--------|----------------|
| **Token-saving** | `/api/prompt/{eco}/{pkg}` returns LLM-ready plain text — ~74% fewer input tokens than raw registry JSON. |
| **Energy-saving** | One cached hit here replaces thousands of cold fetches against public registries. Less compute, less bandwidth, less footprint. |
| **Security** | OSV + CISA KEV + EPSS enrichment, OpenSSF Scorecard, malicious-package flags, typosquat detection, maintainer trust — all in one call. |

---

## Quick start

```bash
# One-shot health check (human-readable JSON)
curl https://depscope.dev/api/check/npm/express

# LLM-optimized plain text (drop straight into a model context)
curl https://depscope.dev/api/prompt/npm/express
```

No auth. No signup. No API key. 200 req/min free tier.

---

## 17 ecosystems, one endpoint

```bash
curl https://depscope.dev/api/check/{ecosystem}/{package}
```

| Language | Ecosystem | Packages | Example |
|----------|-----------|---------:|---------|
| JavaScript / Node | `npm` | 12.708 | `/api/check/npm/express` |
| Python | `pypi` | 4.731 | `/api/check/pypi/django` |
| Rust | `cargo` | 4.170 | `/api/check/cargo/tokio` |
| Perl | `cpan` | 2.683 | `/api/check/cpan/DateTime` |
| Ruby | `rubygems` | 1.469 | `/api/check/rubygems/rails` |
| PHP | `composer` | 917 | `/api/check/composer/laravel/framework` |
| R | `cran` | 733 | `/api/check/cran/dplyr` |
| .NET / C# | `nuget` | 719 | `/api/check/nuget/Newtonsoft.Json` |
| macOS CLI | `homebrew` | 603 | `/api/check/homebrew/git` |
| Java / Kotlin | `maven` | 503 | `/api/check/maven/org.springframework.boot/spring-boot-starter` |
| Dart / Flutter | `pub` | 460 | `/api/check/pub/http` |
| Go | `go` | 429 | `/api/check/go/github.com/gin-gonic/gin` |
| Elixir | `hex` | 302 | `/api/check/hex/ecto` |
| Haskell | `hackage` | 300 | `/api/check/hackage/lens` |
| iOS | `cocoapods` | 139 | `/api/check/cocoapods/AFNetworking` |
| Data Science | `conda` | 127 | `/api/check/conda/scipy` |
| Swift | `swift` | 61 | `/api/check/swift/vapor` |

**Total: 31.054 packages, 2.282 tracked vulnerabilities, 595 curated alternatives.**

---

## Endpoints summary

Full reference: [depscope.dev/api-docs](https://depscope.dev/api-docs) · OpenAPI at `/openapi.json` · Swagger UI at `/docs`.

### Package intelligence
| Endpoint | Purpose |
|----------|---------|
| `GET /api/check/{eco}/{pkg}` | Full health report (the default call). |
| `GET /api/prompt/{eco}/{pkg}` | LLM-optimized plain text, ~74% token reduction. |
| `GET /api/latest/{eco}/{pkg}` | Latest version. Fast path. |
| `GET /api/exists/{eco}/{pkg}` | Exists yes/no. Hallucination guard. |
| `GET /api/search/{eco}?q=...` | Keyword search across an ecosystem. |
| `GET /api/alternatives/{eco}/{pkg}` | Curated replacement suggestions. |
| `GET /api/compare/{eco}/{a},{b},{c}` | Side-by-side comparison (up to 10). |
| `GET /api/vulns/{eco}/{pkg}` | Vulnerabilities (+ CISA KEV + EPSS enrichment). |
| `GET /api/typosquat/{eco}/{pkg}` | Is this name a typosquat of a popular package? |
| `GET /api/malicious/{eco}/{pkg}` | OpenSSF malicious-packages flag. |
| `GET /api/scorecard/{eco}/{pkg}` | OpenSSF Scorecard 0-10. |
| `GET /api/quality/{eco}/{pkg}` | Aggregate quality signals. |
| `GET /api/maintainers/{eco}/{pkg}` | Bus factor, ownership change, author dominance. |
| `GET /api/provenance/{eco}/{pkg}` | Sigstore / PEP 740 attestations. |
| `GET /api/license/{eco}/{pkg}` | License classification + commercial safety. |
| `GET /api/health/{eco}/{pkg}` | Quick 0-100 score. |
| `GET /api/history/{eco}/{pkg}` | 90-day health trend. |
| `GET /api/tree/{eco}/{pkg}` | Transitive deps with per-node health. |
| `POST /api/scan` | Audit a full dependency manifest at once. |

### Verticals

| Endpoint | Purpose |
|----------|---------|
| `GET  /api/error?code=X` | Lookup a known runtime error code. |
| `POST /api/error/resolve` | POST a stack trace → verified fix with package context. |
| `GET  /api/bugs/{eco}/{pkg}` | Non-CVE known bugs per version. |
| `GET  /api/compat?packages=next@16,react@19,prisma@6` | Is this combo a verified working stack? |
| `GET  /api/breaking/{eco}/{pkg}` | Breaking changes between versions. |
| `GET  /api/migration/{eco}/{from}/{to}` | Migration path from A to B. |

### Utility

`GET /api/trending` · `GET /api/now` · `GET /api/ecosystems` · `GET /api/stats` · `GET /api/savings` · `GET /badge/{eco}/{pkg}` (SVG score badge).

---

## Use DepScope from your AI agent

### One-line agent rule

**Claude Code** — in `CLAUDE.md`:
```
## DEPSCOPE — Before any install: curl depscope.dev/api/check/{eco}/{pkg}
```

**Cursor** — in `.cursorrules`:
```
Before any install: curl depscope.dev/api/check/{eco}/{pkg} — no auth, free
```

**Windsurf / Copilot / Aider** — same pattern, one line in the rule file.

**ChatGPT** — search "DepScope" in the GPT Store.

### MCP — 29 tools, zero install

Add to your Claude Desktop / Cursor / Windsurf config:

```json
{
  "mcpServers": {
    "depscope": {
      "url": "https://mcp.depscope.dev/mcp"
    }
  }
}
```

Or install the stdio transport locally:

```bash
npm install -g depscope-mcp
```

Tool surface (29 tools, soon consolidating to a tighter 15-18):
`ai_brief`, `audit_stack`, `get_migration_path`, `check_package`, `get_health_score`, `get_vulnerabilities`, `get_latest_version`, `package_exists`, `get_package_prompt`, `compare_packages`, `scan_project`, `find_alternatives`, `get_breaking_changes`, `get_known_bugs`, `check_compatibility`, `resolve_error`, `search_errors`, `check_malicious`, `check_typosquat`, `get_scorecard`, `get_maintainer_trust`, `get_quality`, `get_provenance`, `get_trending`, `report_anomaly`, `contact_depscope`, `check_bulk`, `install_command`, `pin_safe`.

---

## Example response

```json
{
  "package": "express",
  "ecosystem": "npm",
  "latest_version": "5.2.1",
  "health": {
    "score": 85,
    "risk": "low",
    "breakdown": {
      "maintenance": 25,
      "security": 25,
      "popularity": 20,
      "maturity": 15,
      "community": 10
    }
  },
  "vulnerabilities": { "count": 0 },
  "recommendation": {
    "action": "safe_to_use",
    "summary": "express@5.2.1 is safe to use (health: 85/100)"
  }
}
```

---

## Health score (algorithmic, 0-100)

Pure math, no LLM in the hot path. Runs in milliseconds.

| Signal | Max | Source |
|--------|:---:|--------|
| Maintenance | 25 | Days since last release. |
| Security | 25 | CVEs from OSV, filtered to the latest version. |
| Popularity | 20 | Weekly downloads from the registry. |
| Maturity | 15 | Total version count. |
| Community | 15 | Maintainers + GitHub stars. |

**Key detail**: we only surface vulnerabilities that actually affect the latest version. Django goes from 272 historical "vulnerabilities" to just the ones that still matter today.

Current average health across the 31k indexed packages: **60 / 100**.

---

## Self-hosting

DepScope is MIT. Everything you need is in this repo:

- **API**: FastAPI (Python 3.13) — `api/main.py` + `api/registries.py`.
- **Frontend**: Next.js 16 — `frontend/`.
- **DB**: PostgreSQL 17 with the schema in `api/database.py`.
- **MCP**: Node 20 — `mcp-server/`.
- **Cron**: 36 scheduled jobs listed in `CLAUDE.md` §4.
- **Backups**: `scripts/full_backup.sh` — pg_dump + tarball + restic to S3.

Stage mirror runs side-by-side on different ports behind HTTP basic auth (see `ecosystem.stage.config.js`).

---

## Ecosystem

- **MCP Remote** (29 tools, zero install): `https://mcp.depscope.dev/mcp`
- **MCP Server** (stdio): [`depscope-mcp` on npm](https://www.npmjs.com/package/depscope-mcp)
- **ChatGPT GPT**: search "DepScope" in the GPT Store
- **RapidAPI**: [hub listing](https://rapidapi.com/depscope/api/depscope)
- **OpenAPI Spec**: [depscope.dev/openapi.json](https://depscope.dev/openapi.json)
- **AI Plugin Manifest**: [depscope.dev/.well-known/ai-plugin.json](https://depscope.dev/.well-known/ai-plugin.json)
- **llms.txt**: [depscope.dev/llms.txt](https://depscope.dev/llms.txt)

---

## Built with

FastAPI · PostgreSQL 17 · Redis · Next.js 16 · Node 20 · Python 3.13 · Proxmox 9.

Operated by [Cuttalo srl](https://cuttalo.com). Feedback: depscope@cuttalo.com.

---

## License

MIT — see [LICENSE](LICENSE).
