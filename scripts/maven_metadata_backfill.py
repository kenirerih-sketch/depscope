#!/usr/bin/env python3
"""Backfill Maven first_published / last_published / all_version_count from
Maven Central Search API. Package name format in DB is `groupId:artifactId`."""
import asyncio
import sys
from datetime import datetime, timezone
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool


async def one(session, pool, pkg, counters):
    name = pkg["name"]
    if ":" not in name:
        counters["skip_format"] += 1
        return
    gid, aid = name.split(":", 1)
    try:
        async with session.get(
            f"https://search.maven.org/solrsearch/select?q=g:{gid}+AND+a:{aid}&core=gav&rows=200&wt=json",
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            if r.status != 200:
                counters["http_err"] += 1
                return
            data = await r.json()
    except Exception:
        counters["http_err"] += 1
        return
    docs = (data.get("response") or {}).get("docs") or []
    if not docs:
        counters["empty"] += 1
        return
    ts_list = [d.get("timestamp") for d in docs if d.get("timestamp")]
    if not ts_list:
        counters["no_ts"] += 1
        return
    first_ts = min(ts_list) / 1000.0
    last_ts = max(ts_list) / 1000.0
    first_dt = datetime.fromtimestamp(first_ts, tz=timezone.utc)
    last_dt = datetime.fromtimestamp(last_ts, tz=timezone.utc)
    count = len(docs)

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
            pkg["id"], first_dt, last_dt, count,
        )
    counters["ok"] += 1


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name FROM packages WHERE ecosystem='maven' AND first_published IS NULL"
        )
    print(f"{len(rows)} maven packages to backfill", flush=True)

    counters = {"ok": 0, "http_err": 0, "empty": 0, "no_ts": 0, "skip_format": 0}
    sem = asyncio.Semaphore(10)

    async with aiohttp.ClientSession() as session:
        async def guarded(p):
            async with sem:
                await one(session, pool, p, counters)
        await asyncio.gather(*[guarded(p) for p in rows])

    print(f"DONE {counters}", flush=True)


asyncio.run(main())
