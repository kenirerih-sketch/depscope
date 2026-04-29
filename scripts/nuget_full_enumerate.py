#!/usr/bin/env python3
"""Full NuGet enumeration via catalog API.

NuGet has a public catalog API at https://api.nuget.org/v3/catalog0/index.json
that lists every published package. Much friendlier than Maven Central.
"""
import asyncio, sys, os, aiohttp, logging
sys.path.insert(0, "/home/deploy/depscope")
from api.registries import fetch_package, fetch_vulnerabilities, save_package_to_db
from api.health import calculate_health_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("nuget_enumerate")

CONCURRENCY = int(os.environ.get("CONCURRENCY", "10"))
TARGET = int(os.environ.get("TARGET", "20000"))
SEMA = asyncio.Semaphore(CONCURRENCY)
HEADERS = {"User-Agent": "DepScope/1.0 (+https://depscope.dev)"}


async def enumerate_nuget(session, max_packages=TARGET):
    """Pull most-recent N package names from NuGet catalog."""
    log.info("Fetching catalog index...")
    async with session.get("https://api.nuget.org/v3/catalog0/index.json", timeout=aiohttp.ClientTimeout(total=20)) as r:
        idx = await r.json(content_type=None)
    items = idx.get("items", [])
    # Use most-recent pages first (last items in list)
    items.sort(key=lambda x: x.get("commitTimeStamp", ""), reverse=True)
    log.info(f"Catalog has {len(items)} pages, using newest first")

    seen = set()
    for page in items:
        if len(seen) >= max_packages:
            break
        try:
            async with session.get(page["@id"], timeout=aiohttp.ClientTimeout(total=20)) as r:
                if r.status != 200:
                    continue
                p = await r.json(content_type=None)
                for entry in p.get("items", []):
                    pkg_id = entry.get("nuget:id")
                    if pkg_id and pkg_id.lower() not in seen:
                        seen.add(pkg_id.lower())
                        yield pkg_id
                        if len(seen) >= max_packages:
                            break
        except Exception as e:
            log.warning(f"page error: {e}")
        await asyncio.sleep(0.2)


async def already_in_db(pool, name):
    r = await pool.fetchrow(
        "SELECT 1 FROM packages WHERE ecosystem='nuget' AND LOWER(name)=LOWER($1) LIMIT 1", name,
    )
    return r is not None


async def ingest_one(name):
    async with SEMA:
        try:
            pkg = await fetch_package("nuget", name)
        except Exception as e:
            return False
        if not pkg:
            return False
        try:
            vulns = await fetch_vulnerabilities("nuget", name, pkg.get("latest_version"))
            health = calculate_health_score(pkg, vulns or [])
            await save_package_to_db(pkg, health.get("score", 0), vulns or [])
            return True
        except Exception:
            return False


async def main():
    import asyncpg
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=8)
    log.info(f"START nuget enum target={TARGET} c={CONCURRENCY}")
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:
        ok = fail = skipped = 0
        tasks = []
        async for name in enumerate_nuget(session, TARGET):
            if await already_in_db(pool, name):
                skipped += 1
                continue
            tasks.append(asyncio.create_task(ingest_one(name)))
            if len(tasks) >= CONCURRENCY * 4:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for r in results:
                    if r is True: ok += 1
                    else: fail += 1
                if (ok + fail) % 100 == 0:
                    log.info(f"progress ok={ok} fail={fail} skip={skipped}")
                tasks = []
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if r is True: ok += 1
                else: fail += 1
    log.info(f"DONE ok={ok} fail={fail} skipped={skipped}")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
