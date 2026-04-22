#!/usr/bin/env python3
"""Re-derive severity for all existing vulnerabilities by re-querying OSV.

Uses the fixed fetch_vulnerabilities() which now handles GHSA database_specific
severity + CVSS vector parsing. Updates DB in place.
"""
import asyncio
import sys
import time

sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool
from api.registries import fetch_vulnerabilities

CONCURRENCY = 16


async def process(sem, pool, row, counters):
    async with sem:
        pkg_id = row["id"]
        eco = row["ecosystem"]
        name = row["name"]
        try:
            vulns = await fetch_vulnerabilities(eco, name, latest_version=None)
        except Exception:
            counters["err"] += 1
            return
        updated = 0
        async with pool.acquire() as conn:
            for v in vulns:
                try:
                    r = await conn.execute(
                        """UPDATE vulnerabilities
                           SET severity = $3, updated_at = NOW()
                           WHERE package_id = $1 AND vuln_id = $2
                             AND severity IS DISTINCT FROM $3""",
                        pkg_id,
                        v.get("vuln_id") or v.get("id") or "",
                        v.get("severity") or "unknown",
                    )
                    if r and r.split()[-1] == "1":
                        updated += 1
                except Exception:
                    continue
        counters["updated"] += updated
        counters["ok"] += 1


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT DISTINCT p.id, p.ecosystem, p.name
               FROM packages p
               JOIN vulnerabilities v ON v.package_id = p.id
               ORDER BY p.id"""
        )
    total = len(rows)
    print(f"[reseverity] {total} packages with vulns (concurrency={CONCURRENCY})", flush=True)

    sem = asyncio.Semaphore(CONCURRENCY)
    counters = {"ok": 0, "err": 0, "updated": 0}
    start = time.time()
    tasks = [asyncio.create_task(process(sem, pool, row, counters)) for row in rows]
    done = 0
    for t in asyncio.as_completed(tasks):
        await t
        done += 1
        if done % 50 == 0:
            el = max(int(time.time() - start), 1)
            print(f"[reseverity] {done}/{total}  ok={counters['ok']}  err={counters['err']}  updated={counters['updated']}  eta={int((total-done)/(done/el))}s", flush=True)

    print(f"[reseverity] DONE updated={counters['updated']} ok={counters['ok']} err={counters['err']} elapsed={int(time.time()-start)}s", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
