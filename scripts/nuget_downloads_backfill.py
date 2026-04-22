#!/usr/bin/env python3
"""Backfill NuGet downloads via Azure Search API (totalDownloads is cumulative).

Weekly is approximated as totalDownloads / 200 (≈ 4-year average age). Coarse
but sufficient to bucket correctly in the health popularity scorer (>100, >1K,
>10K, >100K, >1M, >10M thresholds).
"""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool

WEEKS_APPROX = 200


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name FROM packages WHERE ecosystem='nuget' AND (downloads_weekly IS NULL OR downloads_weekly = 0)"
        )
    print(f"{len(rows)} nuget packages to backfill", flush=True)

    sem = asyncio.Semaphore(8)
    updated = 0
    missed = 0

    async def process(pkg):
        nonlocal updated, missed
        async with sem:
            try:
                async with aiohttp.ClientSession() as s:
                    async with s.get(
                        f"https://azuresearch-usnc.nuget.org/query?q=PackageId:{pkg['name']}&prerelease=true&take=1",
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as r:
                        if r.status != 200:
                            missed += 1
                            return
                        data = await r.json()
            except Exception:
                missed += 1
                return
            items = data.get("data") or []
            if not items:
                missed += 1
                return
            total = items[0].get("totalDownloads") or 0
            weekly = total // WEEKS_APPROX
            monthly = weekly * 4
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE packages SET downloads_weekly=$2, downloads_monthly=$3 WHERE id=$1",
                    pkg["id"], weekly, monthly,
                )
            updated += 1

    await asyncio.gather(*[process(p) for p in rows])
    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
