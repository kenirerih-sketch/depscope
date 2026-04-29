#!/usr/bin/env python3
"""Full Go modules enumeration via index.golang.org.

The Go module proxy (proxy.golang.org) maintains an immutable index at:
  https://index.golang.org/index?since=<timestamp>
which streams JSON Lines of every published module.
"""
import asyncio, sys, os, aiohttp, logging, json
sys.path.insert(0, "/home/deploy/depscope")
from api.registries import fetch_package, fetch_vulnerabilities, save_package_to_db
from api.health import calculate_health_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("go_enumerate")

CONCURRENCY = int(os.environ.get("CONCURRENCY", "10"))
TARGET = int(os.environ.get("TARGET", "30000"))
SEMA = asyncio.Semaphore(CONCURRENCY)
HEADERS = {"User-Agent": "DepScope/1.0 (+https://depscope.dev)"}


async def enumerate_go(session, max_pkgs=TARGET):
    """Stream JSONL from index.golang.org until cap."""
    seen = set()
    since = "2019-04-10T19:08:52.997264Z"  # roughly the start of go.mod
    while len(seen) < max_pkgs:
        url = f"https://index.golang.org/index?since={since}&limit=2000"
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as r:
                if r.status != 200:
                    log.warning(f"index status {r.status}")
                    break
                text = await r.text()
                lines = text.strip().split("\n")
                if not lines or not lines[0]:
                    break
                last_ts = since
                for line in lines:
                    if not line.strip(): continue
                    try:
                        d = json.loads(line)
                    except Exception:
                        continue
                    name = d.get("Path")
                    last_ts = d.get("Timestamp", last_ts)
                    if name and name not in seen:
                        seen.add(name)
                        yield name
                        if len(seen) >= max_pkgs:
                            return
                if last_ts == since:
                    log.info("no progress, stopping")
                    break
                since = last_ts
        except Exception as e:
            log.warning(f"fetch err: {e}")
            break
        await asyncio.sleep(0.5)


async def already_in_db(pool, name):
    r = await pool.fetchrow(
        "SELECT 1 FROM packages WHERE ecosystem='go' AND LOWER(name)=LOWER($1) LIMIT 1", name,
    )
    return r is not None


async def ingest_one(name):
    async with SEMA:
        try:
            pkg = await fetch_package("go", name)
        except Exception:
            return False
        if not pkg:
            return False
        try:
            vulns = await fetch_vulnerabilities("go", name, pkg.get("latest_version"))
            health = calculate_health_score(pkg, vulns or [])
            await save_package_to_db(pkg, health.get("score", 0), vulns or [])
            return True
        except Exception:
            return False


async def main():
    import asyncpg
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=8)
    log.info(f"START go enum target={TARGET} c={CONCURRENCY}")
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:
        ok = fail = skipped = 0
        tasks = []
        async for name in enumerate_go(session, TARGET):
            if await already_in_db(pool, name):
                skipped += 1
                continue
            tasks.append(asyncio.create_task(ingest_one(name)))
            if len(tasks) >= CONCURRENCY * 4:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for r in results:
                    if r is True: ok += 1
                    else: fail += 1
                if (ok + fail) % 200 == 0:
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
