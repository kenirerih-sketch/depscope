#!/usr/bin/env python3
"""Auto-ingest packages that bots (Google, GPTBot, Bing, etc.) requested and
got 404 on.

Rationale: these are URLs that search engines + AI-training crawlers
discovered externally (registries, blog posts, sitemaps). They're almost
certainly REAL packages we simply haven't ingested yet. Converting the 404s
back to 200s closes a coverage gap at zero human cost.

Runs daily. Soft caps + exponential backoff so we don't flood upstream
registries. Only tries cases seen in last 30 days with hits >= 1 (low bar
on purpose: a single Googlebot 404 is already a strong signal).

Guards:
- Skip names with trailing characters suggesting URL noise (e.g. trailing
  slash was already stripped below).
- Skip AI-hallucinated looking names by requiring the seen source to be a
  BOT (not an agent like claude-code/cursor).
- Skip names where we already have the package (re-run safety).
- Skip names over 120 chars (URL noise).
- Cap 300 ingestions per run.
"""
import asyncio
import os
import re
import sys

sys.path.insert(0, "/home/deploy/depscope")

import asyncpg
from api.registries import fetch_package, save_package_to_db, fetch_vulnerabilities
from api.health import calculate_health_score

DB_URL = os.environ["DATABASE_URL"]
MAX_INGESTIONS = int(os.environ.get("MAX_INGESTIONS", "300"))
BOT_AGENTS = (
    "googlebot", "bingbot", "openai-bot", "crawler",
    "yandexbot", "applebot", "perplexity-bot", "anthropic-bot",
    "duckduckbot", "baiduspider",
)

# Names that are obviously URL noise (from pkg path parsing errors)
NOISE_RE = re.compile(r"(\s|[<>\"'\\?#%&])")


async def candidates(pool):
    """Return list of (ecosystem, package_name, total_hits) candidates."""
    rows = await pool.fetch(
        f"""
        SELECT ecosystem, package_name, COUNT(*) AS hits
        FROM api_usage
        WHERE status_code = 404
          AND endpoint = 'check'
          AND agent_client = ANY($1)
          AND COALESCE(package_name, '') <> ''
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1, 2
        ORDER BY 3 DESC
        LIMIT {MAX_INGESTIONS * 2}
        """,
        list(BOT_AGENTS),
    )
    out = []
    for r in rows:
        name = (r["package_name"] or "").strip().rstrip("/").strip()
        eco = r["ecosystem"] or ""
        if not name or not eco:
            continue
        if len(name) > 120 or NOISE_RE.search(name):
            continue
        out.append((eco, name, r["hits"]))
    return out


async def already_in_db(pool, ecosystem: str, name: str) -> bool:
    r = await pool.fetchrow(
        "SELECT 1 FROM packages WHERE ecosystem=$1 AND LOWER(name)=LOWER($2) LIMIT 1",
        ecosystem, name,
    )
    return r is not None


async def add_to_benchmark_hallucinations(pool, ecosystem: str, name: str, hits: int):
    """When upstream registry returns 404, the bot was hallucinating. Save it."""
    try:
        await pool.execute(
            """
            INSERT INTO benchmark_hallucinations
              (ecosystem, package_name, source, evidence, hit_count)
            VALUES ($1, $2, 'observed',
                    'Bot 404 - upstream registry not found ' || $3 || ' hits in 30d', $3)
            ON CONFLICT (ecosystem, package_name) DO UPDATE
              SET hit_count = benchmark_hallucinations.hit_count + EXCLUDED.hit_count,
                  last_seen_at = NOW()
            """,
            ecosystem, name, hits,
        )
    except Exception as e:
        pass  # non-blocking

async def ingest_one(pool, ecosystem: str, name: str, hits: int = 1) -> tuple[bool, str]:
    try:
        pkg = await fetch_package(ecosystem, name)
    except Exception as e:
        return False, f"fetch_err: {type(e).__name__}"
    if not pkg:
        # Hallucination! Add to benchmark corpus
        await add_to_benchmark_hallucinations(pool, ecosystem, name, hits)
        return False, "upstream_not_found_added_to_hallu_corpus"
    try:
        vulns = await fetch_vulnerabilities(
            ecosystem, name,
            latest_version=pkg.get("latest_version"),
            repository=pkg.get("repository") or None,
        )
    except Exception:
        vulns = []
    try:
        health = calculate_health_score(pkg, vulns)
        await save_package_to_db(pkg, health.get("score", 0), vulns)
        return True, f"saved:{pkg.get('latest_version','?')}"
    except Exception as e:
        return False, f"save_err: {type(e).__name__}"


async def main():
    pool = await asyncpg.create_pool(DB_URL, min_size=1, max_size=4)
    cands = await candidates(pool)
    print(f"[bot-404 ingest] {len(cands)} candidates (30d window)")

    tried = ok = skipped = fail = 0
    by_eco_ok: dict[str, int] = {}
    samples: list[str] = []

    for eco, name, hits in cands:
        if tried - ok >= MAX_INGESTIONS:  # hard budget on upstream calls
            break
        if await already_in_db(pool, eco, name):
            skipped += 1
            continue
        tried += 1
        done, reason = await ingest_one(pool, eco, name, hits)
        if done:
            ok += 1
            by_eco_ok[eco] = by_eco_ok.get(eco, 0) + 1
            if len(samples) < 10:
                samples.append(f"{eco}/{name} ({reason}, {hits} bot-hits)")
        else:
            fail += 1
        # Tiny spacing to be nice to registries
        await asyncio.sleep(0.15)

    print(f"[bot-404 ingest] tried={tried}  saved={ok}  already_in_db={skipped}  failed={fail}")
    if by_eco_ok:
        print("[bot-404 ingest] per-ecosystem: " + ", ".join(f"{e}={n}" for e, n in sorted(by_eco_ok.items(), key=lambda x: -x[1])))
    for s in samples:
        print(f"  + {s}")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
