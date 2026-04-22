#!/usr/bin/env python3
"""Backfill Swift packages' downloads_weekly using GitHub stars × 10 as a
popularity proxy (since SPM has no central download metric)."""
import asyncio
import os
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool

TOKEN = os.environ.get("GH_TOKEN", "")
HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "DepScope/0.1 (https://depscope.dev)",
}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"


def owner_repo(url: str):
    if not url:
        return None
    for prefix in ("https://github.com/", "http://github.com/", "github.com/"):
        if url.startswith(prefix):
            rest = url[len(prefix):].rstrip("/")
            parts = rest.split("/")
            if len(parts) >= 2:
                return f"{parts[0]}/{parts[1]}"
    return None


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, repository FROM packages WHERE ecosystem='swift'"
        )
    print(f"{len(rows)} swift packages", flush=True)

    sem = asyncio.Semaphore(6)
    updated = 0
    missed = 0

    async with aiohttp.ClientSession() as session:
        async def one(pkg):
            nonlocal updated, missed
            async with sem:
                slug = owner_repo(pkg["repository"])
                if not slug:
                    missed += 1
                    return
                try:
                    async with session.get(
                        f"https://api.github.com/repos/{slug}",
                        headers=HEADERS, timeout=aiohttp.ClientTimeout(total=10),
                    ) as r:
                        if r.status != 200:
                            missed += 1
                            return
                        data = await r.json()
                except Exception:
                    missed += 1
                    return
                stars = int(data.get("stargazers_count") or 0)
                weekly = stars * 10
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE packages SET downloads_weekly=$2, downloads_monthly=$3 WHERE id=$1",
                        pkg["id"], weekly, weekly * 4,
                    )
                updated += 1

        await asyncio.gather(*[one(p) for p in rows])

    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
