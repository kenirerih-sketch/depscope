#!/usr/bin/env python3
"""Backfill CRAN first_published / last_published / all_version_count via
https://crandb.r-pkg.org/<pkg>/all — returns a `timeline` dict of version→date."""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool
from api.registries import _parse_dt


async def one(session, pool, pkg, counters):
    try:
        async with session.get(
            f"https://crandb.r-pkg.org/{pkg['name']}/all",
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status != 200:
                counters["http_err"] += 1
                return
            data = await r.json()
    except Exception:
        counters["http_err"] += 1
        return
    timeline = data.get("timeline") or {}
    if not timeline:
        counters["empty"] += 1
        return
    items = sorted(timeline.items(), key=lambda kv: kv[1])
    first = _parse_dt(items[0][1])
    last = _parse_dt(items[-1][1])
    count = len(items)
    if not first:
        counters["parse_err"] += 1
        return
    async with pool.acquire() as conn:
        await conn.execute(
            """UPDATE packages
               SET first_published = $2,
                   last_published = COALESCE(last_published, $3),
                   data_json = jsonb_set(
                       COALESCE(data_json, '{}'::jsonb),
                       '{all_version_count}',
                       to_jsonb($4::int)
                   ),
                   updated_at = NOW()
               WHERE id = $1""",
            pkg["id"], first, last, count,
        )
    counters["ok"] += 1


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name FROM packages WHERE ecosystem='cran' AND first_published IS NULL"
        )
    print(f"{len(rows)} cran packages to backfill", flush=True)

    counters = {"ok": 0, "http_err": 0, "empty": 0, "parse_err": 0}
    sem = asyncio.Semaphore(10)

    async with aiohttp.ClientSession() as session:
        async def guarded(p):
            async with sem:
                await one(session, pool, p, counters)
        await asyncio.gather(*[guarded(p) for p in rows])

    print(f"DONE {counters}", flush=True)


asyncio.run(main())
