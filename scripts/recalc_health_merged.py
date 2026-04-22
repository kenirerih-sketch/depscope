#!/usr/bin/env python3
"""Full health_score recalculation — merges row columns into pkg_data so the
health formula sees the authoritative downloads/deprecated/etc values rather
than whatever was in data_json at ingestion time.

Recalc path: for every package, build pkg_data from column values + data_json,
fetch vulns from OSV (reuses Redis cache), run calculate_health_score, write
new score back.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool
from api.registries import fetch_vulnerabilities
from api.health import calculate_health_score

CONCURRENCY = 12


def build_pkg_data(row: dict) -> dict:
    """Merge columns into pkg_data. Columns win over data_json."""
    data_json = row.get("data_json") or {}
    if isinstance(data_json, str):
        try:
            data_json = json.loads(data_json)
        except Exception:
            data_json = {}
    if not isinstance(data_json, dict):
        data_json = {}

    for k in [
        "ecosystem", "name", "latest_version", "description", "license",
        "homepage", "repository", "downloads_weekly", "downloads_monthly",
        "maintainers_count", "deprecated", "deprecated_message",
        "first_published", "last_published",
    ]:
        v = row.get(k)
        if v is not None and v != "":
            data_json[k] = v
    return data_json


async def process(sem, pool, row, counters):
    async with sem:
        pkg_data = build_pkg_data(dict(row))
        try:
            vulns = await fetch_vulnerabilities(
                row["ecosystem"], row["name"], latest_version=row["latest_version"],
                repository=row.get("repository") or None,
            )
        except Exception:
            vulns = []
            counters["vuln_err"] += 1
        try:
            health = calculate_health_score(pkg_data, vulns)
            new_score = health["score"]
        except Exception as e:
            counters["calc_err"] += 1
            return
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE packages SET health_score=$1, updated_at=NOW() WHERE id=$2 AND health_score IS DISTINCT FROM $1",
                new_score, row["id"],
            )
        counters["ok"] += 1
        counters["sum_before"] += row["health_score"] or 0
        counters["sum_after"] += new_score


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, ecosystem, name, latest_version, description, license,
                      homepage, repository, downloads_weekly, downloads_monthly,
                      maintainers_count, deprecated, deprecated_message,
                      first_published, last_published, data_json, health_score
               FROM packages"""
        )
    total = len(rows)
    print(f"[recalc] {total} packages (concurrency={CONCURRENCY})", flush=True)

    sem = asyncio.Semaphore(CONCURRENCY)
    counters = {"ok": 0, "vuln_err": 0, "calc_err": 0, "sum_before": 0, "sum_after": 0}
    import time
    start = time.time()
    tasks = [asyncio.create_task(process(sem, pool, r, counters)) for r in rows]
    done = 0
    for t in asyncio.as_completed(tasks):
        await t
        done += 1
        if done % 500 == 0:
            el = max(int(time.time() - start), 1)
            avg_before = counters["sum_before"] / max(counters["ok"], 1)
            avg_after = counters["sum_after"] / max(counters["ok"], 1)
            print(
                f"[recalc] {done}/{total}  avg_before={avg_before:.1f}  avg_after={avg_after:.1f}  "
                f"vuln_err={counters['vuln_err']}  calc_err={counters['calc_err']}  eta={int((total-done)/(done/el))}s",
                flush=True,
            )

    avg_before = counters["sum_before"] / max(counters["ok"], 1)
    avg_after = counters["sum_after"] / max(counters["ok"], 1)
    print(
        f"[recalc] DONE ok={counters['ok']} vuln_err={counters['vuln_err']} calc_err={counters['calc_err']} "
        f"avg_before={avg_before:.1f} avg_after={avg_after:.1f} elapsed={int(time.time()-start)}s",
        flush=True,
    )


if __name__ == "__main__":
    asyncio.run(main())
