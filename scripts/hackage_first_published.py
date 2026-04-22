#!/usr/bin/env python3
"""Backfill Hackage first_published via /package/<name>-<version>/upload-time.

Reads the `versions` list from data_json, sorts semver-ish, takes the earliest
version, and fetches its upload-time endpoint (returns ISO-8601)."""
import asyncio
import json
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool
from api.registries import _parse_dt


def earliest(versions):
    """Sort Hackage-style versions (1.2.3.4) and return the smallest."""
    if not versions:
        return None
    def key(v):
        try:
            return tuple(int(x) for x in str(v).split("."))
        except Exception:
            return (0,)
    try:
        return sorted(versions, key=key)[0]
    except Exception:
        return versions[0]


async def one(session, pool, pkg, counters):
    dj = pkg["data_json"]
    if isinstance(dj, str):
        try:
            dj = json.loads(dj)
        except Exception:
            dj = {}
    if not isinstance(dj, dict):
        dj = {}
    vers = dj.get("versions") or []
    if not vers:
        counters["skip_no_vers"] += 1
        return
    first_v = earliest(vers)
    try:
        async with session.get(
            f"https://hackage.haskell.org/package/{pkg['name']}-{first_v}/upload-time",
            timeout=aiohttp.ClientTimeout(total=10),
        ) as r:
            if r.status != 200:
                counters["http_err"] += 1
                return
            txt = (await r.text()).strip()
    except Exception:
        counters["http_err"] += 1
        return
    dt = _parse_dt(txt)
    if not dt:
        counters["parse_err"] += 1
        return
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE packages SET first_published=$2, updated_at=NOW() WHERE id=$1",
            pkg["id"], dt,
        )
    counters["ok"] += 1


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, data_json FROM packages WHERE ecosystem='hackage' AND first_published IS NULL"
        )
    print(f"{len(rows)} hackage packages to backfill", flush=True)

    counters = {"ok": 0, "http_err": 0, "parse_err": 0, "skip_no_vers": 0}
    sem = asyncio.Semaphore(8)

    async with aiohttp.ClientSession() as session:
        async def guarded(p):
            async with sem:
                await one(session, pool, p, counters)

        await asyncio.gather(*[guarded(p) for p in rows])

    print(f"DONE {counters}", flush=True)


asyncio.run(main())
