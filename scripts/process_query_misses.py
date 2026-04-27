#!/usr/bin/env python3
"""Process query_misses queue: dequeue pending rows, run compute_*/ingest_*, mark done."""
import asyncio, asyncpg, os, sys, subprocess
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://depscope:KaPCuLVgj2YQ9K3C77x3S3jQdKp82bKR@127.0.0.1:5432/depscope")
BATCH = int(os.environ.get("BATCH", "20"))


async def ingest_package(eco: str, pkg: str) -> tuple[bool, str | None]:
    """Auto-ingest: fetch from registry, save to DB. Returns (ok, error)."""
    sys.path.insert(0, "/home/deploy/depscope")
    try:
        from api.registries import fetch_package, save_package_to_db
        from api.database import get_pool
        data = await fetch_package(eco, pkg)
        if not data:
            return (False, "registry returned no data — confirmed not exists")
        pool = await get_pool()
        async with pool.acquire() as conn:
            await save_package_to_db(conn, eco, pkg, data)
        return (True, None)
    except Exception as e:
        return (False, str(e)[:300])


async def main():
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, ecosystem, package_name, miss_type, miss_count
            FROM query_misses
            WHERE status = 'pending'
            ORDER BY miss_count DESC, last_seen DESC
            LIMIT $1
            """,
            BATCH,
        )
    print(f"[{datetime.now().isoformat()}] picked {len(rows)} pending misses")

    for r in rows:
        eco, pkg, mtype, mid = r["ecosystem"], r["package_name"], r["miss_type"], r["id"]
        async with pool.acquire() as conn:
            await conn.execute("UPDATE query_misses SET status='computing' WHERE id=$1", mid)

        ok, err = False, None
        try:
            if mtype == "ingest":
                print(f"  -> ingest {eco}/{pkg} (count={r['miss_count']})")
                ok, err = await ingest_package(eco, pkg)
            elif mtype == "maintainers":
                print(f"  -> maintainers {eco}/{pkg} (count={r['miss_count']})")
                cmd = ["/home/deploy/depscope/.venv/bin/python3",
                       "/home/deploy/depscope/scripts/compute_maintainer_signals.py"]
                env = {**os.environ, "ONLY_ECOSYSTEM": eco, "ONLY_PACKAGE": pkg, "PER_ECO": "1"}
                res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=180)
                ok = res.returncode == 0
                err = (res.stderr or "")[:500] if not ok else None
            elif mtype == "quality":
                print(f"  -> quality {eco}/{pkg} (count={r['miss_count']})")
                cmd = ["/home/deploy/depscope/.venv/bin/python3",
                       "/home/deploy/depscope/scripts/ingest_quality_signals.py"]
                env = {**os.environ, "ONLY_ECOSYSTEM": eco, "ONLY_PACKAGE": pkg, "PER_ECO": "1"}
                res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=180)
                ok = res.returncode == 0
                err = (res.stderr or "")[:500] if not ok else None
            else:
                err = f"unknown miss_type: {mtype}"
        except Exception as e:
            err = str(e)[:500]

        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE query_misses
                SET status=$1, computed_at=NOW(), error=$2
                WHERE id=$3
                """,
                "done" if ok else "failed", err, mid,
            )
        print(f"     {'OK' if ok else 'FAIL: ' + (err or '')[:100]}")

    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
