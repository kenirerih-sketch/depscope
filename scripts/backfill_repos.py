#!/usr/bin/env python3
"""Backfill repository field from homepage when homepage contains github.com.

42% of packages have repository=NULL but many have homepage pointing to
GitHub. This recovers ~30-40% of them in one DB pass.
"""
import asyncio, sys, os, re, logging
sys.path.insert(0, "/home/deploy/depscope")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("backfill_repos")

GH_RE = re.compile(r"https?://(?:www\.)?github\.com/([\w.-]+)/([\w.-]+?)(?:\.git|/|$|#)", re.I)
GL_RE = re.compile(r"https?://(?:www\.)?gitlab\.com/([\w.-]+)/([\w.-]+?)(?:\.git|/|$|#)", re.I)
BB_RE = re.compile(r"https?://(?:www\.)?bitbucket\.org/([\w.-]+)/([\w.-]+?)(?:\.git|/|$|#)", re.I)
CODEBERG_RE = re.compile(r"https?://(?:www\.)?codeberg\.org/([\w.-]+)/([\w.-]+?)(?:\.git|/|$|#)", re.I)

PATTERNS = [
    ("github.com", GH_RE),
    ("gitlab.com", GL_RE),
    ("bitbucket.org", BB_RE),
    ("codeberg.org", CODEBERG_RE),
]


def extract_repo(homepage: str) -> str | None:
    if not homepage:
        return None
    h = homepage.strip()
    for host, pat in PATTERNS:
        if host in h:
            m = pat.search(h)
            if m:
                return f"https://{host}/{m.group(1)}/{m.group(2)}"
    return None


async def main():
    import asyncpg
    pool = await asyncpg.create_pool(os.environ["DATABASE_URL"], min_size=1, max_size=4)

    log.info("Querying packages with empty repository but homepage with github/gitlab/etc...")
    rows = await pool.fetch("""
        SELECT id, ecosystem, name, homepage
        FROM packages
        WHERE (repository IS NULL OR repository = '')
          AND homepage IS NOT NULL AND homepage <> ''
          AND (homepage ILIKE '%github.com%' OR homepage ILIKE '%gitlab.com%'
               OR homepage ILIKE '%bitbucket.org%' OR homepage ILIKE '%codeberg.org%')
    """)
    log.info(f"Found {len(rows)} candidates")

    updated = 0
    skipped = 0
    BATCH = 500
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i+BATCH]
        updates = []
        for r in chunk:
            repo = extract_repo(r["homepage"])
            if repo:
                updates.append((r["id"], repo))
            else:
                skipped += 1
        if updates:
            async with pool.acquire() as conn:
                await conn.executemany(
                    "UPDATE packages SET repository=$2, updated_at=NOW() WHERE id=$1",
                    updates,
                )
            updated += len(updates)
        if (i // BATCH) % 5 == 0:
            log.info(f"progress: {i+BATCH}/{len(rows)}  updated={updated} skipped={skipped}")

    log.info(f"DONE: updated={updated} skipped={skipped}")

    # Verify
    new_count = await pool.fetchval(
        "SELECT count(*) FROM packages WHERE repository IS NOT NULL AND repository <> ''"
    )
    total = await pool.fetchval("SELECT count(*) FROM packages")
    log.info(f"Coverage: {new_count}/{total} ({100*new_count/total:.1f}%)")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
