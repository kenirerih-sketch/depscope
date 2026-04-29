#!/usr/bin/env python3
"""Full Maven Central enumeration via solrsearch.

Maven Central has ~500k packages. The default full_populate.py enumerator
doesn't traverse it. This one:
- Paginates through search.maven.org/solrsearch/select?q=*:*&rows=200
- Indexes group:artifact pairs
- Bulk-inserts into our DB via fetch_package + save_package_to_db
- Concurrency-controlled to be polite to Maven Central
"""
import asyncio, sys, os, time, aiohttp, logging
sys.path.insert(0, "/home/deploy/depscope")

from api.registries import fetch_package, fetch_vulnerabilities, save_package_to_db
from api.health import calculate_health_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("maven_enumerate")

CONCURRENCY = int(os.environ.get("CONCURRENCY", "10"))
TARGET = int(os.environ.get("TARGET", "100000"))  # cap
PAGE_SIZE = 200
SEMA = asyncio.Semaphore(CONCURRENCY)


async def enumerate_maven_central(session, max_packages=TARGET):
    """Yield (group:artifact) pairs by paginating through solrsearch."""
    start = 0
    seen = set()
    while start < max_packages:
        url = f"https://search.maven.org/solrsearch/select?q=*:*&rows={PAGE_SIZE}&start={start}&wt=json"
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=20)) as r:
                if r.status != 200:
                    log.warning(f"solrsearch {start}: HTTP {r.status}")
                    break
                d = await r.json()
                docs = d.get("response", {}).get("docs", [])
                if not docs:
                    log.info(f"end of pagination at start={start}")
                    break
                for doc in docs:
                    g = doc.get("g", "")
                    a = doc.get("a", "")
                    if g and a:
                        ga = f"{g}:{a}"
                        if ga not in seen:
                            seen.add(ga)
                            yield ga
        except Exception as e:
            log.warning(f"solrsearch {start} err: {e}")
            break
        start += PAGE_SIZE
        await asyncio.sleep(0.3)  # polite


async def already_in_db(pool, ga):
    r = await pool.fetchrow(
        "SELECT 1 FROM packages WHERE ecosystem='maven' AND LOWER(name)=LOWER($1) LIMIT 1", ga,
    )
    return r is not None


async def ingest_one(ga):
    async with SEMA:
        try:
            pkg = await fetch_package("maven", ga)
        except Exception as e:
            return False, f"fetch_err: {type(e).__name__}"
        if not pkg:
            return False, "upstream_not_found"
        try:
            vulns = await fetch_vulnerabilities("maven", ga, pkg.get("latest_version"))
            health = calculate_health_score(pkg, vulns or [])
            await save_package_to_db(pkg, health.get("score", 0), vulns or [])
            return True, f"saved:{pkg.get('latest_version','?')}"
        except Exception as e:
            return False, f"save_err: {type(e).__name__}"


async def main():
    import asyncpg
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=8)
    log.info(f"START maven full enumeration (target={TARGET}, c={CONCURRENCY})")

    timeout = aiohttp.ClientTimeout(total=30)
    headers = {"User-Agent": "DepScope/1.0 (+https://depscope.dev)"}
    async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
        ok = fail = skipped = 0
        tasks = []
        async for ga in enumerate_maven_central(session, TARGET):
            if await already_in_db(pool, ga):
                skipped += 1
                continue
            tasks.append(asyncio.create_task(ingest_one(ga)))
            if len(tasks) >= CONCURRENCY * 4:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for r in results:
                    if isinstance(r, tuple):
                        if r[0]: ok += 1
                        else: fail += 1
                    else:
                        fail += 1
                if (ok + fail) % 100 == 0 or (ok + fail) % 200 == 0:
                    log.info(f"progress ok={ok} fail={fail} skip={skipped}")
                tasks = []

        # Drain
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, tuple):
                    if r[0]: ok += 1
                    else: fail += 1

    log.info(f"DONE: ok={ok} fail={fail} skipped={skipped}")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
