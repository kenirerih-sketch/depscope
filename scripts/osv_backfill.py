#!/usr/bin/env python3
from datetime import datetime
"""OSV backfill: query OSV for every package in DB and insert missing vulnerabilities."""
import asyncio
import os
import sys
import time

sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool
from api.registries import fetch_vulnerabilities

CONCURRENCY = 12
PROGRESS_EVERY = 100


async def process(sem, pool, row, counters):
    async with sem:
        pkg_id = row["id"]
        eco = row["ecosystem"]
        name = row["name"]
        latest = row["latest_version"] or None
        try:
            vulns = await fetch_vulnerabilities(eco, name, latest)
        except Exception as e:
            counters["err"] += 1
            return
        inserted = 0
        async with pool.acquire() as conn:
            for v in vulns:
                try:
                    r = await conn.execute(
                        """
                        INSERT INTO vulnerabilities (package_id, vuln_id, severity, summary,
                            affected_versions, fixed_version, source, published_at, updated_at)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
                        ON CONFLICT (package_id, vuln_id) DO NOTHING
                        """,
                        pkg_id,
                        v.get("id") or v.get("vuln_id") or "",
                        v.get("severity") or "UNKNOWN",
                        (v.get("summary") or "")[:4000],
                        v.get("affected_versions") or "",
                        v.get("fixed_version") or "",
                        v.get("source", "osv"),
                        datetime.fromisoformat(v["published_at"].replace("Z","+00:00")) if v.get("published_at") else None,
                    )
                    if r and r.split()[-1] == "1":
                        inserted += 1
                except Exception:
                    continue
        counters["vulns"] += inserted
        counters["ok"] += 1


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, ecosystem, name, latest_version
            FROM packages
            ORDER BY id
            """
        )
    total = len(rows)
    print(f"[osv-backfill] {total} packages to process (concurrency={CONCURRENCY})", flush=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    counters = {"ok": 0, "err": 0, "vulns": 0}
    start = time.time()
    tasks = [asyncio.create_task(process(sem, pool, row, counters)) for row in rows]
    done_count = 0
    for t in asyncio.as_completed(tasks):
        await t
        done_count += 1
        if done_count % PROGRESS_EVERY == 0:
            elapsed = int(time.time() - start)
            rate = done_count / max(elapsed, 1)
            eta_s = int((total - done_count) / max(rate, 0.01))
            print(
                f"[osv-backfill] {done_count}/{total}  ok={counters['ok']}  err={counters['err']}  "
                f"new_vulns={counters['vulns']}  rate={rate:.1f}/s  eta={eta_s}s",
                flush=True,
            )
    print(
        f"[osv-backfill] DONE  ok={counters['ok']}  err={counters['err']}  "
        f"new_vulns={counters['vulns']}  elapsed={int(time.time()-start)}s",
        flush=True,
    )


if __name__ == "__main__":
    asyncio.run(main())
