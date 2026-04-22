#!/usr/bin/env python3
"""Backfill CPAN downloads_weekly from Debian popcon install counts.

Mapping: CPAN dist "Foo::Bar" -> Debian package "libfoo-bar-perl" (primary).
Fallback candidates include the lowercased name directly, and the dash-form
without `lib*perl` wrapping.

Uses `inst` column as a popularity proxy divided by 10 (to roughly align
with npm-style weekly ranges in the health popularity scorer).
"""
import asyncio
import re
import sys
sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool

POPCON_FILE = "/home/deploy/depscope/data/popcon.tsv"


def parse_popcon():
    """Return dict {deb_name: inst_count}."""
    m = {}
    with open(POPCON_FILE, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = re.split(r"\s+", line.strip())
            if len(parts) < 4:
                continue
            try:
                inst = int(parts[2])
            except ValueError:
                continue
            name = parts[1]
            m[name] = inst
    return m


def candidates(cpan_dist: str):
    """Generate probable Debian package names for a CPAN distribution."""
    # CPAN distributions use `-` (Foo-Bar), modules use `::` (Foo::Bar).
    # Our DB stores either — normalize to dash form first.
    base = cpan_dist.replace("::", "-")
    lower = base.lower()
    yield f"lib{lower}-perl"
    yield lower
    yield lower + "-perl"
    # For single-segment names, also try without the lib prefix
    if "-" not in lower:
        yield lower


async def main():
    print("Parsing popcon…", flush=True)
    popcon = parse_popcon()
    print(f"  {len(popcon)} packages in popcon", flush=True)

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name FROM packages WHERE ecosystem='cpan' AND (downloads_weekly IS NULL OR downloads_weekly = 0)"
        )
    print(f"{len(rows)} cpan packages to try", flush=True)

    hits = 0
    updates = 0
    async with pool.acquire() as conn:
        for pkg in rows:
            inst = None
            deb_name = None
            for cand in candidates(pkg["name"]):
                if cand in popcon:
                    inst = popcon[cand]
                    deb_name = cand
                    break
            if inst is None:
                continue
            hits += 1
            # Map Debian installs (~282K max) to weekly download proxy using
            # inst as-is. Top CPAN modules reach 100K+ "weekly" → 14 points
            # popularity, matching npm packages with comparable reach.
            weekly = inst
            r = await conn.execute(
                "UPDATE packages SET downloads_weekly=$2, downloads_monthly=$3 WHERE id=$1",
                pkg["id"], weekly, weekly * 4,
            )
            if r.endswith("1"):
                updates += 1

    print(f"DONE hits={hits} updates={updates} / {len(rows)}", flush=True)


asyncio.run(main())
