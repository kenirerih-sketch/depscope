#!/usr/bin/env python3
"""Backfill CPAN first_published + all_version_count via MetaCPAN search API.

For each CPAN package, aggregate all releases (ASC by date) — take the first
release date as first_published and the release count as all_version_count.
Writes both into the packages column and into data_json for future recalc."""
import asyncio
import json
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool
from api.registries import _parse_dt

CONCURRENCY = 10


async def fetch_meta(session, name):
    """Return (first_date_iso, count) for distribution name.

    CPAN module names use `::` separators (Foo::Bar); MetaCPAN's distribution
    field uses `-` (Foo-Bar). Normalize before querying."""
    dist = name.replace("::", "-")
    params = {
        "q": f"distribution:{dist}",
        "size": "1",
        "sort": "date:asc",
        "_source": "date,version",
    }
    try:
        async with session.get(
            "https://fastapi.metacpan.org/v1/release/_search",
            params=params, timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status != 200:
                return None, 0
            data = await r.json()
    except Exception:
        return None, 0
    hits = (data.get("hits") or {}).get("hits") or []
    total_block = (data.get("hits") or {}).get("total")
    count = total_block.get("value") if isinstance(total_block, dict) else (total_block or 0)
    if not hits:
        return None, count or 0
    first = hits[0].get("_source", {}).get("date")
    return first, count or 0


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, data_json FROM packages WHERE ecosystem='cpan' AND first_published IS NULL"
        )
    print(f"{len(rows)} cpan packages to backfill", flush=True)

    sem = asyncio.Semaphore(CONCURRENCY)
    updated = 0
    missed = 0
    done = 0

    async with aiohttp.ClientSession() as session:
        async def one(pkg):
            nonlocal updated, missed, done
            async with sem:
                first, count = await fetch_meta(session, pkg["name"])
                done += 1
                if not first and not count:
                    missed += 1
                    if done % 200 == 0:
                        print(f"  {done}/{len(rows)} updated={updated} missed={missed}", flush=True)
                    return

                # DB encoding is SQL_ASCII — avoid writing unicode JSON.
                # Update first_published column directly and jsonb_set the
                # all_version_count key (which is always an int, so safe).
                async with pool.acquire() as conn:
                    await conn.execute(
                        """UPDATE packages
                           SET first_published = $2,
                               data_json = jsonb_set(
                                   COALESCE(data_json, '{}'::jsonb),
                                   '{all_version_count}',
                                   to_jsonb($3::int)
                               ),
                               updated_at = NOW()
                           WHERE id = $1""",
                        pkg["id"], _parse_dt(first), int(count or 0),
                    )
                updated += 1
                if done % 200 == 0:
                    print(f"  {done}/{len(rows)} updated={updated} missed={missed}", flush=True)

        await asyncio.gather(*[one(p) for p in rows])

    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
