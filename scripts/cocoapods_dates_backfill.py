#!/usr/bin/env python3
"""Backfill cocoapods first_published/last_published from data_json using the
newly-fixed _parse_dt (which now handles "2020-04-20 02:25:51 UTC" format)."""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool
from api.registries import _parse_dt


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id,
                      data_json->>'last_published'  AS lp,
                      data_json->>'first_published' AS fp
               FROM packages
               WHERE ecosystem='cocoapods'
                 AND last_published IS NULL
                 AND data_json ? 'last_published'"""
        )
        updated = 0
        for r in rows:
            lp = _parse_dt(r["lp"])
            fp = _parse_dt(r["fp"])
            if lp or fp:
                await conn.execute(
                    "UPDATE packages SET last_published=$2, first_published=$3 WHERE id=$1",
                    r["id"], lp, fp,
                )
                updated += 1
        print(f"cocoapods updated={updated}")


asyncio.run(main())
