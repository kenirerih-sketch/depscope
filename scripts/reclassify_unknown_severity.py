#!/usr/bin/env python3
"""Re-query OSV.dev for each vulnerability currently marked severity=unknown
and reclassify using the latest data + our _derive_severity cascade."""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool
from api.registries import _derive_severity


async def fetch_osv(session, vuln_id):
    try:
        async with session.get(
            f"https://api.osv.dev/v1/vulns/{vuln_id}",
            timeout=aiohttp.ClientTimeout(total=10),
        ) as r:
            if r.status != 200:
                return None
            return await r.json()
    except Exception:
        return None


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, vuln_id FROM vulnerabilities WHERE severity = 'unknown' ORDER BY id"
        )
    print(f"{len(rows)} unknown-severity vulns to re-query", flush=True)

    sem = asyncio.Semaphore(10)
    counters = {"updated": 0, "still_unknown": 0, "not_found": 0, "err": 0}
    updates_by_sev = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    async with aiohttp.ClientSession() as session:
        async def process(row):
            async with sem:
                data = await fetch_osv(session, row["vuln_id"])
                if not data:
                    counters["not_found"] += 1
                    return
                try:
                    new_sev = _derive_severity(data)
                except Exception:
                    counters["err"] += 1
                    return
                if new_sev == "unknown":
                    counters["still_unknown"] += 1
                    return
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE vulnerabilities SET severity=$2, updated_at=NOW() WHERE id=$1",
                        row["id"], new_sev,
                    )
                counters["updated"] += 1
                updates_by_sev[new_sev] = updates_by_sev.get(new_sev, 0) + 1

        await asyncio.gather(*[process(r) for r in rows])

    print(f"DONE {counters} by_sev={updates_by_sev}", flush=True)


asyncio.run(main())
