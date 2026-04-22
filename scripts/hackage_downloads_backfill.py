#!/usr/bin/env python3
"""Backfill Hackage downloads via /packages/top ranking.

Hackage publishes recent-downloads per package. Values here represent recent
activity, not cumulative totals — good enough for the popularity scorer."""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool


async def main():
    async with aiohttp.ClientSession() as s:
        async with s.get(
            "https://hackage.haskell.org/packages/top",
            headers={"Accept": "application/json"},
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status != 200:
                print(f"FAIL: http {r.status}")
                return
            ranking = await r.json()
    print(f"{len(ranking)} hackage packages in top ranking", flush=True)

    rank_map = {row["packageName"]: int(row.get("downloads") or 0) for row in ranking}

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name FROM packages WHERE ecosystem='hackage' AND (downloads_weekly IS NULL OR downloads_weekly = 0)"
        )
    print(f"{len(rows)} hackage packages to backfill", flush=True)

    updated = 0
    missed = 0
    async with pool.acquire() as conn:
        for pkg in rows:
            dl = rank_map.get(pkg["name"])
            if not dl:
                missed += 1
                continue
            await conn.execute(
                "UPDATE packages SET downloads_weekly=$2, downloads_monthly=$3 WHERE id=$1",
                pkg["id"], dl, dl * 4,
            )
            updated += 1

    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
