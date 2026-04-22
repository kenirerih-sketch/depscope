#!/usr/bin/env python3
"""DepScope end-to-end self-test.

Runs a battery of assertions against the live instance (https://depscope.dev)
and the local DB/cron. Prints a single summary line per check and an overall
PASS/FAIL verdict. Exits non-zero on failure so it can be cron-scheduled.

Run locally on CT 140:
    cd /home/deploy/depscope && sudo -u deploy env DATABASE_URL=... \\
        .venv/bin/python3 scripts/selftest.py
"""
import asyncio
import os
import subprocess
import sys
import time
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
import asyncpg

BASE = os.environ.get("SELFTEST_BASE", "https://depscope.dev")
ADMIN_KEY = os.environ.get("ADMIN_API_KEY", "ds_admin_038a5f775217db119be15773f3cc041b")

GREEN, RED, YELLOW, RESET, DIM = "\033[32m", "\033[31m", "\033[33m", "\033[0m", "\033[2m"

results = []  # list of (name, ok, msg)


def log(name, ok, msg=""):
    mark = f"{GREEN}✓{RESET}" if ok else f"{RED}✗{RESET}"
    print(f"  {mark} {name:48} {DIM}{msg}{RESET}")
    results.append((name, ok, msg))


async def http_json(session, path, *, auth=False, method="GET", **kw):
    hdrs = {}
    if auth:
        hdrs["X-API-Key"] = ADMIN_KEY
    url = path if path.startswith("http") else f"{BASE}{path}"
    async with session.request(method, url, headers=hdrs, timeout=aiohttp.ClientTimeout(total=15), **kw) as r:
        status = r.status
        try:
            data = await r.json()
        except Exception:
            data = None
        return status, data


async def test_public(session):
    """Public API endpoints — no auth."""
    # Health check
    status, data = await http_json(session, "/api/check/npm/lodash")
    log("public /api/check lodash", status == 200 and data and data.get("exists") is not False)

    # Alternatives should come through for moment
    status, data = await http_json(session, "/api/check/npm/moment")
    alts = (data or {}).get("recommendation", {}).get("alternatives") or []
    names = [a.get("name") for a in alts]
    has_dayjs = "dayjs" in names
    log("public /api/check moment has dayjs alt", has_dayjs, f"alts={names}")

    # Prompt endpoint (token-saver)
    status, data = await http_json(session, "/api/prompt/npm/axios")
    log("public /api/prompt axios", status == 200)

    # Direct alternatives
    status, data = await http_json(session, "/api/alternatives/npm/request")
    alts = (data or {}).get("alternatives") or []
    log("public /api/alternatives request", status == 200 and len(alts) >= 3, f"n={len(alts)}")

    # Vulns for a known-vulnerable pkg
    status, data = await http_json(session, "/api/vulns/npm/lodash")
    log("public /api/vulns lodash", status == 200)

    # Compare two packages
    status, data = await http_json(session, "/api/compare/npm/lodash,underscore")
    log("public /api/compare lodash,underscore", status == 200)

    # Latest version endpoint (returns {"latest": "..."})
    status, data = await http_json(session, "/api/latest/pypi/requests")
    log("public /api/latest pypi/requests", status == 200 and data and data.get("latest"))

    # Ecosystem fetcher-specific: swift with github-style name
    status, data = await http_json(session, "/api/check/swift/Vapor")
    log("public /api/check swift/Vapor", status == 200)

    # 404 handling for non-existent pkg
    status, data = await http_json(session, "/api/check/npm/this-pkg-does-not-exist-xyz-12345")
    log("public 404 handling", status == 404)


async def test_admin(session):
    """Admin endpoints — require X-API-Key."""
    # Auth rejection
    status, _ = await http_json(session, "/api/admin/overview")
    log("admin rejects missing key", status in (401, 403))

    # All admin endpoints
    for ep, checker in [
        ("overview?range=7d", lambda d: "views" in d and "all" in d["views"]),
        ("timeseries?range=7d&view=all", lambda d: isinstance(d.get("heatmap"), list) and isinstance(d.get("daily_kpis"), list)),
        ("insights", lambda d: isinstance(d.get("coverage_matrix"), list) and len(d.get("vuln_severity", [])) >= 3),
        ("dashboard", lambda d: isinstance(d.get("users"), list)),
        ("stats", lambda d: d.get("packages_indexed", 0) > 30000),
        ("pageviews", lambda d: "total" in d),
        ("sources", lambda d: "total" in d),
        ("charts", lambda d: isinstance(d.get("pageviews_daily"), list)),
        ("plan-metrics", lambda d: isinstance(d.get("ecosystems"), list)),
    ]:
        status, data = await http_json(session, f"/api/admin/{ep}", auth=True)
        ok = status == 200 and data is not None
        detail = ""
        if ok:
            try:
                ok = checker(data)
                if not ok:
                    detail = f"schema-check failed"
            except Exception as e:
                ok = False
                detail = str(e)
        else:
            detail = f"http={status}"
        log(f"admin /api/admin/{ep.split('?')[0]}", ok, detail)


async def test_heatmap_tz(session):
    """Heatmap should have hours in Europe/Rome: peak should shift from UTC."""
    status, data = await http_json(session, "/api/admin/timeseries?range=30d&view=all", auth=True)
    if status != 200 or not data:
        log("heatmap timezone shift", False, "no data")
        return
    cells = data.get("heatmap", [])
    if not cells:
        log("heatmap timezone shift", False, "empty")
        return
    top = max(cells, key=lambda c: c["n"])
    # Peak we saw in UTC was dow=1 hour=13. In Europe/Rome (CEST = +2) it becomes hour=15.
    # Accept 14,15,16 as valid (DST variation).
    ok = top["hour"] in (14, 15, 16)
    log("heatmap in Europe/Rome", ok, f"peak dow={top['dow']} hour={top['hour']}:00 n={top['n']}")


async def test_db(conn):
    """DB integrity."""
    # Orphan rows
    orphans_v = await conn.fetchval("SELECT COUNT(*) FROM vulnerabilities v LEFT JOIN packages p ON p.id=v.package_id WHERE p.id IS NULL")
    log("DB no orphan vulns", orphans_v == 0, f"orphans={orphans_v}")

    orphans_a = await conn.fetchval("SELECT COUNT(*) FROM alternatives a LEFT JOIN packages p ON p.id=a.package_id WHERE p.id IS NULL")
    log("DB no orphan alternatives", orphans_a == 0, f"orphans={orphans_a}")

    # Severity classified (not everything unknown)
    sev = await conn.fetch("SELECT severity, COUNT(*) FROM vulnerabilities GROUP BY 1")
    sev_map = {r["severity"]: r["count"] for r in sev}
    total = sum(sev_map.values())
    classified = total - sev_map.get("unknown", 0)
    log("DB >80% vulns classified", classified / max(total, 1) > 0.8, f"{classified}/{total}")
    log("DB has critical + high", sev_map.get("critical", 0) > 0 and sev_map.get("high", 0) > 0, f"crit={sev_map.get('critical', 0)} high={sev_map.get('high', 0)}")

    # Health score reasonable
    avg = await conn.fetchval("SELECT AVG(health_score)::int FROM packages")
    log("DB avg health >= 55", avg >= 55, f"avg={avg}")

    # No packages with corrupt data
    invalid = await conn.fetchval("SELECT COUNT(*) FROM packages WHERE health_score < 0 OR health_score > 100")
    log("DB health scores in [0, 100]", invalid == 0, f"invalid={invalid}")

    # Recent data update
    recent = await conn.fetchval("SELECT COUNT(*) FROM packages WHERE updated_at > NOW() - INTERVAL '48 hours'")
    log("DB packages updated in 48h", recent > 0, f"recent={recent}")

    # Alternatives table populated
    alt_count = await conn.fetchval("SELECT COUNT(*) FROM alternatives")
    log("DB alternatives >= 500", alt_count >= 500, f"n={alt_count}")

    # Downloads coverage
    eco_dl = await conn.fetch("""
        SELECT ecosystem, COUNT(*) FILTER (WHERE downloads_weekly > 0)::float / COUNT(*) AS pct
        FROM packages GROUP BY 1
    """)
    empty = [r["ecosystem"] for r in eco_dl if r["pct"] == 0]
    # maven/cocoapods have no public downloads API — that's expected
    expected_empty = {"maven", "cocoapods"}
    unexpected = set(empty) - expected_empty
    log("DB downloads populated for known ecosystems", not unexpected, f"empty={empty} unexpected={sorted(unexpected)}")

    # Page view tracking working
    pv = await conn.fetchval("SELECT COUNT(*) FROM page_views_clean WHERE created_at > NOW() - INTERVAL '24 hours'")
    log("page_views_clean receiving traffic", pv > 0, f"24h={pv}")

    # api_usage tracking
    usage = await conn.fetchval("SELECT COUNT(*) FROM api_usage WHERE created_at > NOW() - INTERVAL '1 hour'")
    log("api_usage logging recent requests", usage > 0, f"1h={usage}")


def test_cron():
    """Verify crontab is installed with new env + schedule."""
    try:
        out = subprocess.check_output(["sudo", "-u", "deploy", "crontab", "-l"], text=True)
    except Exception as e:
        log("cron readable", False, str(e))
        return

    env_ok = ":depscope2026@" not in out
    log("cron DATABASE_URL has new password", env_ok)

    smtp_ok = "SMTP_PASS=" in out
    log("cron SMTP_PASS present", smtp_ok)

    jobs = [
        "recalc_health_merged.py",
        "osv_backfill.py",
        "alternatives_curated_seed.py",
        "nuget_downloads_backfill.py",
        "cpan_popcon_backfill.py",
        "swift_stars_backfill.py",
    ]
    for j in jobs:
        log(f"cron has {j}", j in out)

    # No literal ${DB_PASSWORD}
    scripts_dir = "/home/deploy/depscope/scripts"
    try:
        grep = subprocess.check_output(
            ["grep", "-l", "${DB_PASSWORD}", scripts_dir], text=True, stderr=subprocess.DEVNULL
        ).strip()
        broken = grep.splitlines() if grep else []
    except subprocess.CalledProcessError:
        broken = []
    log("no scripts still using literal ${DB_PASSWORD}", len(broken) == 0, f"broken={len(broken)}")


def test_pm2():
    """PM2 processes online."""
    try:
        out = subprocess.check_output(["sudo", "-u", "deploy", "pm2", "jlist"], text=True)
        import json
        apps = json.loads(out)
    except Exception as e:
        log("pm2 jlist", False, str(e))
        return

    required = {"depscope-api", "depscope-web", "depscope-mcp-http"}
    got = {a["name"] for a in apps if a["pm2_env"]["status"] == "online"}
    missing = required - got
    log("pm2 core processes online", not missing, f"online={sorted(got & required)} missing={sorted(missing)}")

    for a in apps:
        if a["name"] in required and a["pm2_env"]["status"] != "online":
            log(f"pm2 {a['name']}", False, f"status={a['pm2_env']['status']}")


def test_redis():
    """Redis reachable + cache active."""
    try:
        info = subprocess.check_output(["sudo", "-u", "deploy", "redis-cli", "INFO", "stats"], text=True)
        hits = int([l for l in info.splitlines() if l.startswith("keyspace_hits:")][0].split(":")[1])
        misses = int([l for l in info.splitlines() if l.startswith("keyspace_misses:")][0].split(":")[1])
        total = hits + misses
        ratio = hits / max(total, 1)
    except Exception as e:
        log("redis INFO", False, str(e))
        return

    log("redis hit ratio >= 50%", ratio >= 0.5, f"{ratio*100:.1f}% ({hits} hits / {total})")


async def main():
    print(f"\n{DIM}━━━ DepScope self-test @ {BASE} — {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())} ━━━{RESET}\n")

    # Live HTTP checks
    async with aiohttp.ClientSession() as session:
        print(f"{DIM}━ Public API{RESET}")
        await test_public(session)
        print(f"\n{DIM}━ Admin API{RESET}")
        await test_admin(session)
        print(f"\n{DIM}━ Heatmap timezone{RESET}")
        await test_heatmap_tz(session)

    # DB checks
    print(f"\n{DIM}━ Database{RESET}")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        log("DATABASE_URL set", False, "env missing — skipping DB checks")
    else:
        try:
            conn = await asyncpg.connect(db_url, timeout=5)
            await test_db(conn)
            await conn.close()
        except Exception as e:
            log("DB connect", False, str(e))

    # Infrastructure
    print(f"\n{DIM}━ Infrastructure{RESET}")
    test_cron()
    test_pm2()
    test_redis()

    # Summary
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed
    print(f"\n{DIM}━━━ Summary ━━━{RESET}")
    color = GREEN if failed == 0 else (YELLOW if failed <= 2 else RED)
    print(f"  {color}{passed}/{total} passed{RESET}, {failed} failed")

    if failed:
        print(f"\n{DIM}Failed checks:{RESET}")
        for n, ok, msg in results:
            if not ok:
                print(f"  {RED}✗ {n}{RESET}  {DIM}{msg}{RESET}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
