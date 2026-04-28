---
name: DepScope Platform
description: depscope.dev — Package Intelligence for AI Agents. CT 140 on Proxmox 9 (OVH RISE-M). FastAPI + Next.js + PostgreSQL 17. 19 ecosystems, 749k+ packages indexed, 17,290 vulnerabilities, 724 curated alternatives, MCP with 22 tools. Free, no-auth public API.
type: project
---

# DepScope — AI Assistant Operating Manual

> Target audience: Claude / Cursor / Windsurf sessions working on this repo.
> Tone: concrete paths, copy-pasteable commands, no fluff.
> Date of last refresh: **2026-04-21**.

Current scale (stage DB snapshot):

| Metric | Value |
|--------|------:|
| Ecosystems | 17 |
| Packages indexed | 31.054 |
| Vulnerabilities tracked | 2.282 (327 critical / 802 high / 708 medium / 108 low / 337 unknown) |
| Curated alternatives | 595 |
| Average health score | 60 |
| MCP tools | 29 (consolidation to ~15-18 planned — NOT applied yet) |
| Scheduled cron jobs | 36 |

---

## 1. Quick start

### 1.1 Connect to CT 140

```bash
# From the admin laptop (Windows, Git Bash)
node ~/ssh-new.js "pct exec 140 -- bash -c 'whoami && hostname'"

# Interactive shell inside the container
ssh root@91.134.4.25 "pct enter 140"

# Push a local file to CT 140
MSYS_NO_PATHCONV=1 node C:/Users/Vincenzo/push-new.js 140 <local> <remote>

# Fetch a file from CT 140
MSYS_NO_PATHCONV=1 node C:/Users/Vincenzo/fetch-new.js 140 <remote> <local>
```

### 1.2 Environments

| Env | Dir | API | MCP | Web | DB | Admin key |
|-----|-----|-----|-----|-----|----|-----------|
| **prod** | `/home/deploy/depscope/` | :8000 | :8001 | :3000 | `depscope` | `ds_admin_<prod>` |

### 1.3 PM2

```bash
sudo -u deploy pm2 list
# Prod:  depscope-api, depscope-mcp-http, depscope-web
# Stage: depscope-api-stage, depscope-mcp-stage, depscope-web-stage

sudo -u deploy pm2 restart depscope-api-stage
sudo -u deploy pm2 logs depscope-api-stage --lines 100
```

Prod PM2 config:  `/home/deploy/depscope/ecosystem.config.js`.

### 1.4 Database

```bash
# Stage

# Prod
PGPASSWORD=$PROD_DB_PASS psql -U depscope -h localhost -d depscope

# Useful queries
\dt                                                    -- list tables
select count(*) from packages;
select severity, count(*) from vulnerabilities group by 1;
select ecosystem, count(*) from packages group by 1 order by 2 desc;
```

Connection strings live in the cron env block (`sudo -u deploy crontab -l`) and in `ecosystem*.config.js`.

---

## 2. Architecture

```
Client → Cloudflare → HAProxy (host, :80) → CT 140 Nginx (:80)
                                             ├─ /api/*     → FastAPI  (prod :8000 / stage :8100)
                                             ├─ /mcp       → MCP HTTP (prod :8001 / stage :8101)
                                             ├─ /badge/*   → FastAPI
                                             └─ *          → Next.js  (prod :3000 / stage :3100)
```

- **Host**: `91.134.4.25` — OVH RISE-M, Proxmox 9.1 (installed 2026-04-21).
- **CT 140** IP: `10.10.0.140`. LXC container, Debian 13, Python 3.13, Node 20.
- **HAProxy** on host routes `depscope.dev` to the CT.
- **Stage is isolated**: separate DB, separate Redis DB index (`/1`), SMTP sinkholed to `127.0.0.1:9999` so nothing can email out.

---

## 3. Data pipeline

### 3.1 Ingestion (how packages enter)

1. **Seed** — `scripts/seed_popular.py`, `seed_ecosystems.py`, `seed_minor_ecosystems.py` pull top-N lists per ecosystem.
2. **Expand** — `scripts/expand_db.py`, `mass_populate.py`, `catalog_expand_*.py` walk each registry.
3. **Registry fetch** — `api/registries.py` (1867 LOC) is the dispatcher: one function per registry (`npm`, `pypi`, `cargo`, `go`, `composer`, `maven`, `nuget`, `rubygems`, `pub`, `hex`, `swift`, `cocoapods`, `cpan`, `hackage`, `cran`, `conda`, `homebrew`).

### 3.2 Enrichment

| Signal | Script | Source |
|--------|--------|--------|
| Vulnerabilities | `osv_backfill.py` | OSV.dev |
| Swift vulns | `swift_backfill.py` | OSV via GitHub repo mapping |
| NuGet downloads | `nuget_downloads_backfill.py` | Azure NuGet search |
| Hackage downloads | `hackage_downloads_backfill.py` | Hackage top ranking |
| Hackage first published | `hackage_first_published.py` | Hackage |
| CPAN downloads | `cpan_popcon_backfill.py` | Debian popcon |
| CPAN metadata | `cpan_metadata_backfill.py` | MetaCPAN |
| CocoaPods dates | `cocoapods_dates_backfill.py` | CocoaPods specs |
| Homebrew dates | `homebrew_dates_backfill.py` | GitHub commits |
| Maven metadata | `maven_metadata_backfill.py` | Maven Central |
| CRAN metadata | `cran_metadata_backfill.py` | CRAN |
| Swift stars | `swift_stars_backfill.py` | GitHub stars |
| KEV + EPSS | `ingest_kev_epss.py` | CISA KEV + FIRST EPSS |
| Malicious/Scorecard | `ingest_malicious_scorecard.py` | OpenSSF |
| Alternatives | `alternatives_curated_seed.py` | curated (idempotent) |
| GitHub stats | `fetch_github_stats.py` | GitHub API |
| Typosquats | `compute_typosquats.py` | internal |
| Maintainer signals | `compute_maintainer_signals.py` | internal |
| Severity re-derive | `reseverity.py` | OSV CVSS → normalized bucket |

### 3.3 Scoring

`api/health.py` (algorithmic, 0-100, no LLM):

| Signal | Max | Source |
|--------|:---:|--------|
| Maintenance | 25 | days since last release |
| Security | 25 | CVEs filtered to latest version |
| Popularity | 20 | weekly downloads |
| Maturity | 15 | total version count |
| Community | 15 | maintainers + stars |

Daily recalc: `scripts/recalc_health_merged.py` (07:00 UTC, after backfills).

---

## 4. Cron map (36 jobs)

Full list: `sudo -u deploy crontab -l`. Key cadence:

- **Every hour**: `disk_monitor` (watchdog).
- **Every 4h**: marketing agent orchestrator.
- **Every 6h**: `alerts.py`, `preprocess.py` (pre-cache top 250).
- **Every 12h**: `fetch_github_stats.py`.
- **Daily 02:00**: `expand_db.py`.
- **Daily 03:00**: `record_health_snapshot.py`, `compute_maintainer_signals.py`.
- **Daily 04:00**: `compute_intelligence.py`.
- **Daily 05:00**: `indexnow_submit`, **05:30** `ingest_kev_epss.py`.
- **Daily 06:00**: `daily_report.py`, `ingest_malicious_scorecard.py`, `fetch_downloads.py` (+18:00).
- **Daily 07:00**: `recalc_health_merged.py` (pulls fresh data into `health_score`).
- **Daily 08:00**: `selftest.py` — emails on failure.
- **Daily 10:00**: followup campaign. **11:00**: GSC pull.
- **Weekly Sun 02:00**: `osv_backfill.py`. **02:30**: `swift_backfill.py`. **05:00**: `nuget_downloads_backfill.py`. **05:30**: `hackage_downloads_backfill.py`. **06:00**: `swift_stars_backfill.py`. **06:30**: `hackage_first_published.py`. **06:45**: `alternatives_curated_seed.py`. **04:00**: `scripts/backup_db.sh`. **04:30**: local pg_dump weekly snapshot. **10:00 Mon**: weekly report. **Mon 04:00**: typosquats.
- **Monthly 1st**: `cocoapods_dates_backfill.py` (03:00), `homebrew_dates_backfill.py` (03:15), `maven_metadata_backfill.py` (03:30), `cran_metadata_backfill.py` (03:45), `cpan_metadata_backfill.py` (04:00), popcon refresh + `cpan_popcon_backfill.py` (04:15), `mass_populate` (02:00).

Logs: `/var/log/depscope/*.log` (prod) — stage cron does not exist, scripts run on prod only.

---

## 5. Development workflow

**Stage first. Always.**

1. Pull latest stage code:
   ```bash

   ```
2. Edit locally or directly in stage (`MSYS_NO_PATHCONV=1 node push-new.js 140 ...`).
3. Restart the relevant stage process:
   ```bash
   sudo -u deploy pm2 restart depscope-api-stage
   ```
4. Smoke-test against (stage decommissioned).
5. Run `scripts/selftest.py` against stage.
6. Promote: copy files to `/home/deploy/depscope/` (or `scripts/sync_prod_to_stage.sh` is the **reverse** direction, do not confuse). Then `pm2 restart depscope-api && pm2 restart depscope-web`.
7. Full backup before any risky write: `scripts/full_backup.sh`.

**Never run destructive DB writes on prod without a `full_backup.sh` snapshot first.**

---

## 6. Key files

| Path | LOC | Purpose |
|------|----:|---------|
| `api/main.py` | 6046 | FastAPI app, every endpoint, rate-limit, tracking |
| `api/registries.py` | 1867 | Per-ecosystem fetchers (19 registries) |
| `api/health.py` | 209 | Health score math |
| `api/verticals.py` | 718 | Error → fix DB, compat matrix, known bugs |
| `api/verticals_v2.py` | 576 | Newer vertical endpoints |
| `api/intelligence.py` | 556 | Quality / scorecard / maintainer trust |
| `api/mcp_http.py` | 498 | MCP Streamable HTTP transport |
| `api/auth.py` | 442 | Magic-link login + `ds_live_xxx` keys |
| `api/email_templates.py` | 320 | Transactional HTML |
| `api/payments.py` | 169 | Stripe scaffolding (inactive) |
| `api/history.py` | 100 | 90-day health trend |
| `api/cache.py` | 32 | Redis cache + rate limit |
| `mcp-server/tools.js` | 859 | **29 MCP tools** declarations + handlers |
| `mcp-server/http-server.js` | 104 | Remote MCP HTTP wrapper |
| `mcp-server/index.js` | 21 | stdio entrypoint (npm `depscope-mcp`) |
| `scripts/recalc_health_merged.py` | — | Daily health rebuild |
| `scripts/selftest.py` | — | End-to-end smoke test |
| `scripts/full_backup.sh` | — | pg_dump + tarball + restic to OVH S3 |
| `scripts/sync_prod_to_stage.sh` | — | Refresh stage DB + code from prod |

---

## 7. API endpoints (current surface)

### 7.1 Public (no auth, 200 req/min, all free)

**Core package intel**: `/api/check/{eco}/{pkg}`, `/api/prompt/{eco}/{pkg}`, `/api/latest`, `/api/exists`, `/api/health`, `/api/versions`, `/api/search/{eco}`, `/api/alternatives`, `/api/compare/{eco}/{a,b,c}`, `/api/vulns`, `/api/typosquat`, `/api/malicious`, `/api/scorecard`, `/api/quality`, `/api/license`, `/api/licenses`, `/api/provenance`, `/api/maintainers`, `/api/history`, `/api/tree`.

**Verticals**: `/api/error` (+ POST `/api/error/resolve`, `/api/error/popular`, `/api/error/{hash}`), `/api/bugs/{eco}/{pkg}` (+ `/api/bugs/popular`, `/api/bugs/search`), `/api/compat` (GET+POST), `/api/breaking` (+ `/api/breaking/{eco}/{pkg}`), `/api/migration/{eco}/{from}/{to}`.

**AI helpers**: `/api/ai/brief/{eco}/{pkg}`, POST `/api/ai/stack`.

**Batch / discovery**: POST `/api/scan`, `/api/trending` (see `main.py`), `/api/ecosystems`, `/api/stats`, `/api/savings`, `/api/sitemap-packages`, `/api/sitemap-quality-pages`.

**Utility**: `/api/now`, `/api/health` (liveness), POST `/api/anomaly`, POST `/api/contact`, `/api/contact/types`, POST `/api/track`.

**Badges**: `/badge/{eco}/{pkg}`, `/badge/{eco}/{pkg}/score`.

**Discovery**: `/`, `/.well-known/security.txt`, `/.well-known/ai-plugin.json`, `/openapi-gpt.json`, `/docs` (Swagger).

### 7.2 Admin (header `X-API-Key: $ADMIN_API_KEY`)

`/api/admin/overview`, `/timeseries`, `/insights`, `/dashboard`, `/stats`, `/pageviews`, `/sources`, `/charts`, `/plan-metrics`, `/seo-health`, `/automation`.

Marketing agent sub-tree: `/api/admin/agent/{rules,plan,actions,opportunities,opportunities/all,metrics,run,dashboard,platforms,timeline,emails,opportunities/{id}/article,config,config/{key},state}`.

### 7.3 MCP (22 tools via stdio or remote HTTP)

Listed in `mcp-server/tools.js`: `ai_brief`, `audit_stack`, `get_migration_path`, `check_package`, `get_health_score`, `get_vulnerabilities`, `get_latest_version`, `package_exists`, `get_package_prompt`, `compare_packages`, `scan_project`, `find_alternatives`, `get_breaking_changes`, `get_known_bugs`, `check_compatibility`, `resolve_error`, `search_errors`, `check_malicious`, `check_typosquat`, `get_scorecard`, `get_maintainer_trust`, `get_quality`, `get_provenance`, `get_trending`, `report_anomaly`, `contact_depscope`, `check_bulk`, `install_command`, `pin_safe`.

Consolidation to 15-18 tools is planned but **not yet applied** — all 29 remain live.

---

## 8. Common tasks

### 8.1 Add a new package source (ecosystem)

1. Add dispatcher in `api/registries.py` — follow the signature of existing fetchers (`fetch_<eco>(package, version=None)`).
2. Add ecosystem to `ECOSYSTEMS` list in `api/main.py`.
3. Seed list: add under `scripts/seed_ecosystems.py` or a new `seed_<eco>.py`.
4. If the registry exposes download stats, add a backfill script under `scripts/<eco>_downloads_backfill.py`.
5. Update `api/health.py` if the new signal doesn't map to existing fields.
6. Cron: add weekly backfill line. Daily `recalc_health_merged.py` picks up new rows automatically.
7. Update this file's table in §3.1 and the README ecosystems table.

### 8.2 Fix a health-calc bug

- Single function: `health.calculate_health(...)` in `api/health.py`.
- Re-run for the whole DB: `scripts/recalc_health_merged.py` (writes `packages.health_score`, `health_breakdown`).
- For one package: `python3 -c "from api.health import calculate_health; ..."` or hit `/api/check/{eco}/{pkg}?refresh=1`.

### 8.3 Add an admin endpoint

1. Decorate with `@app.get("/api/admin/<name>", include_in_schema=False)` in `api/main.py`.
2. First line: `require_admin(x_api_key)` → raises 401 if missing/mismatched.
3. Add to admin frontend under `frontend/app/admin/`.
4. Stage-deploy → smoke-test with `curl -H "X-API-Key: $ADMIN_API_KEY" ...`.

### 8.4 Invalidate cache

```bash
# Stage
redis-cli -n 1 FLUSHDB
# Prod
redis-cli -n 0 FLUSHDB
```

### 8.5 Sync prod → stage

```bash

```

Refreshes stage DB and code. **Never run the reverse direction without an explicit commit.**

### 8.6 Full backup

```bash
bash /home/deploy/depscope/scripts/full_backup.sh
```

pg_dump + /home/deploy/depscope tarball → OVH S3 restic repo.

---

## 9. Rules (hard constraints)

- **Stage first** for every code and schema change.
- **No destructive ops on prod** without `full_backup.sh` first.
- **Italian** in internal memory files (e.g. `~/.claude/projects/.../MEMORY.md`). **English** in repo files (CLAUDE.md, README.md, code comments).
- Pages at `/stats` hide numbers until the next 10k threshold (see `api/main.py` and `frontend/app/stats/`).
- Pure algorithmic health score — **no LLM** in the hot path.
- Three pillars for every user-facing message: **token-saving, energy-saving, security**.

---

## 10. Contact / ownership

- **Company**: Cuttalo srl, P.IVA IT03242390734, Grottaglie (TA).
- **Mailbox**: depscope@cuttalo.com (IMAP on VM 130).
- **Admin dashboard**: https://depscope.dev/admin (API key required).
- **Support**: depscope@cuttalo.com.
