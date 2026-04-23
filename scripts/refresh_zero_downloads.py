"""One-off: refresh downloads_weekly for packages with zero value but high health.
Affects mainly npm where bulk ingest raced. Caps 500 pkgs per ecosystem."""
import asyncio, os, sys
sys.path.insert(0, "/home/deploy/depscope")
import asyncpg
from api.registries import fetch_npm_downloads, fetch_pypi_downloads


async def main():
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=4)

    # npm: high health score + zero downloads = likely ingest race
    npm_rows = await pool.fetch(
        "SELECT name FROM packages WHERE ecosystem=$1 AND downloads_weekly = 0 AND health_score >= 60 LIMIT 500",
        "npm",
    )
    fixed = 0
    for r in npm_rows:
        try:
            dl = await fetch_npm_downloads(r["name"])
            if dl and dl > 0:
                await pool.execute(
                    "UPDATE packages SET downloads_weekly=$1 WHERE ecosystem=$2 AND name=$3",
                    dl, "npm", r["name"],
                )
                fixed += 1
        except Exception:
            pass
        await asyncio.sleep(0.15)
    print(f"npm refreshed: {fixed}/{len(npm_rows)}")

    # pypi: same
    pypi_rows = await pool.fetch(
        "SELECT name FROM packages WHERE ecosystem=$1 AND downloads_weekly = 0 AND health_score >= 60 LIMIT 500",
        "pypi",
    )
    fixed2 = 0
    for r in pypi_rows:
        try:
            dl = await fetch_pypi_downloads(r["name"])
            if dl and dl > 0:
                await pool.execute(
                    "UPDATE packages SET downloads_weekly=$1 WHERE ecosystem=$2 AND name=$3",
                    dl, "pypi", r["name"],
                )
                fixed2 += 1
        except Exception:
            pass
        await asyncio.sleep(0.15)
    print(f"pypi refreshed: {fixed2}/{len(pypi_rows)}")
    await pool.close()


asyncio.run(main())
