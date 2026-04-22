#!/usr/bin/env python3
"""Backfill Homebrew first_published / last_published via GitHub commits API
on the Homebrew/homebrew-core repo, path Formula/{name}.rb.

Uses GH_TOKEN (5000 req/h) to get 1st + latest commit date for each formula.
For casks we use homebrew-cask (path Casks/{name}.rb)."""
import asyncio
import os
import sys
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool
from api.registries import _parse_dt

TOKEN = os.environ.get("GH_TOKEN", "")
HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "DepScope/0.1 (https://depscope.dev)",
}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"


async def fetch_dates(session, name):
    """Return (first_commit_iso, last_commit_iso) for formula / cask, or (None, None)."""
    for repo, subdir in [
        ("Homebrew/homebrew-core", "Formula"),
        ("Homebrew/homebrew-cask", "Casks"),
    ]:
        # Homebrew-core uses /Formula/<prefix>/<name>.rb (sharded on first letter)
        # homebrew-cask uses /Casks/<prefix>/<name>.rb (sharded on first letter)
        path_v1 = f"{subdir}/{name}.rb"
        path_v2 = f"{subdir}/{name[0].lower()}/{name}.rb"
        for path in (path_v2, path_v1):
            # Latest commit
            try:
                url = f"https://api.github.com/repos/{repo}/commits?path={path}&per_page=1"
                async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=10)) as r:
                    if r.status != 200:
                        continue
                    data = await r.json()
                    if not data:
                        continue
                    last = data[0].get("commit", {}).get("author", {}).get("date")
                # First commit — paginate backward via "last" link
                url = f"https://api.github.com/repos/{repo}/commits?path={path}&per_page=100&page=99"
                async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=10)) as r:
                    first = None
                    if r.status == 200:
                        rd = await r.json()
                        if rd:
                            first = rd[-1].get("commit", {}).get("author", {}).get("date")
                if not first:
                    first = last
                return first, last
            except Exception:
                continue
    return None, None


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name FROM packages WHERE ecosystem='homebrew' AND last_published IS NULL ORDER BY name"
        )
    print(f"{len(rows)} homebrew packages to backfill", flush=True)

    sem = asyncio.Semaphore(6)
    updated = 0
    missed = 0
    done = 0

    async with aiohttp.ClientSession() as session:
        async def one(pkg):
            nonlocal updated, missed, done
            async with sem:
                first, last = await fetch_dates(session, pkg["name"])
                done += 1
                if not last:
                    missed += 1
                    if done % 50 == 0:
                        print(f"  {done}/{len(rows)} updated={updated} missed={missed}", flush=True)
                    return
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE packages SET first_published=$2, last_published=$3 WHERE id=$1",
                        pkg["id"], _parse_dt(first), _parse_dt(last),
                    )
                updated += 1
                if done % 50 == 0:
                    print(f"  {done}/{len(rows)} updated={updated} missed={missed}", flush=True)

        await asyncio.gather(*[one(p) for p in rows])

    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
