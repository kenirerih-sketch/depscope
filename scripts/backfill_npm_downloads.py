#!/usr/bin/env python3
"""Backfill npm downloads_weekly via api.npmjs.org/downloads.

npm-stat supports bulk fetch up to ~128 packages per call:
  GET https://api.npmjs.org/downloads/point/last-week/pkg1,pkg2,...
Returns {pkg1: {downloads: N, ...}, pkg2: {...}}
"""
import asyncio, sys, os, aiohttp, logging
sys.path.insert(0, "/home/deploy/depscope")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("backfill_npm_dl")

CONCURRENCY = int(os.environ.get("CONCURRENCY", "5"))
BATCH = 100  # npm-stat allows up to 128 per call
SEMA = asyncio.Semaphore(CONCURRENCY)
HEADERS = {"User-Agent": "DepScope/1.0 (+https://depscope.dev)"}


async def fetch_batch(session, names):
    """Fetch downloads for a batch. Returns dict {name: downloads}."""
    if not names:
        return {}
    encoded = ",".join(names)
    url = f"https://api.npmjs.org/downloads/point/last-week/{encoded}"
    async with SEMA:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as r:
                if r.status != 200:
                    return {}
                d = await r.json()
                # npm returns {pkg: {downloads, package, start, end}} for each
                out = {}
                for k, v in d.items():
                    if isinstance(v, dict) and "downloads" in v:
                        out[k] = v["downloads"]
                return out
        except Exception as e:
            log.warning(f"batch err: {e}")
            return {}


async def main():
    import asyncpg
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=4)

    log.info("Fetching npm packages with NULL/zero downloads...")
    rows = await pool.fetch("""
        SELECT id, name FROM packages
        WHERE ecosystem='npm' AND (downloads_weekly IS NULL OR downloads_weekly = 0)
        ORDER BY id
    """)
    log.info(f"Candidates: {len(rows)}")

    updated = 0
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i:i+BATCH]
            # npm-stat doesn't accept scoped names in batch (must fetch one-by-one)
            non_scoped = [r for r in chunk if not r["name"].startswith("@")]
            scoped = [r for r in chunk if r["name"].startswith("@")]

            results = {}
            if non_scoped:
                names = [r["name"] for r in non_scoped]
                results = await fetch_batch(session, names)
            # Scoped: fetch individually (slower)
            for sr in scoped[:30]:  # cap to 30 scoped per batch to keep moving
                async with SEMA:
                    url = f"https://api.npmjs.org/downloads/point/last-week/{sr['name']}"
                    try:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
                            if r.status == 200:
                                d = await r.json()
                                if "downloads" in d:
                                    results[sr["name"]] = d["downloads"]
                    except Exception:
                        pass

            updates = []
            for r in chunk:
                dl = results.get(r["name"])
                if dl is not None:
                    updates.append((r["id"], dl))

            if updates:
                async with pool.acquire() as conn:
                    await conn.executemany(
                        "UPDATE packages SET downloads_weekly=$2, updated_at=NOW() WHERE id=$1",
                        updates,
                    )
                updated += len(updates)

            if (i // BATCH) % 10 == 0:
                log.info(f"progress: {i+BATCH}/{len(rows)}  updated_total={updated}")
            # Throttle
            await asyncio.sleep(0.5)

    new_count = await pool.fetchval(
        "SELECT count(*) FROM packages WHERE ecosystem='npm' AND downloads_weekly > 0"
    )
    total = await pool.fetchval("SELECT count(*) FROM packages WHERE ecosystem='npm'")
    log.info(f"DONE: updated={updated}. npm coverage: {new_count}/{total} ({100*new_count/total:.1f}%)")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
