#!/usr/bin/env python3
"""Backfill Maven + CocoaPods downloads using GitHub stars × 10 as a
popularity proxy (same approach as Swift — no native download metric).

Only processes packages with a github.com repository URL."""
import asyncio
import os
import re
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

GH_RE = re.compile(r"github\.com[/:]([^/#?.\s]+)/([^/#?.\s]+?)(?:\.git)?/?$")


def owner_repo(url):
    if not url:
        return None
    m = GH_RE.search(url.strip())
    return f"{m.group(1)}/{m.group(2)}" if m else None


async def main():
    ecosystems = sys.argv[1:] or ["maven", "cocoapods"]
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, ecosystem, name, repository FROM packages "
            "WHERE ecosystem = ANY($1::text[]) AND (downloads_weekly IS NULL OR downloads_weekly = 0) "
            "  AND repository LIKE '%github.com%'",
            ecosystems,
        )
    print(f"{len(rows)} packages across {ecosystems}", flush=True)

    sem = asyncio.Semaphore(8)
    updated = 0
    missed = 0
    done = 0

    async with aiohttp.ClientSession() as session:
        async def one(p):
            nonlocal updated, missed, done
            async with sem:
                slug = owner_repo(p["repository"])
                if not slug:
                    missed += 1
                    done += 1
                    return
                try:
                    async with session.get(
                        f"https://api.github.com/repos/{slug}",
                        headers=HEADERS, timeout=aiohttp.ClientTimeout(total=10),
                    ) as r:
                        if r.status != 200:
                            missed += 1
                            done += 1
                            return
                        data = await r.json()
                except Exception:
                    missed += 1
                    done += 1
                    return
                stars = int(data.get("stargazers_count") or 0)
                weekly = stars * 10
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE packages SET downloads_weekly=$2, downloads_monthly=$3 WHERE id=$1",
                        p["id"], weekly, weekly * 4,
                    )
                updated += 1
                done += 1
                if done % 50 == 0:
                    print(f"  {done}/{len(rows)} updated={updated} missed={missed}", flush=True)

        await asyncio.gather(*[one(p) for p in rows])

    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
