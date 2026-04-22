#!/usr/bin/env python3
"""Backfill Swift vulnerabilities via OSV SwiftURL using each package's
repository URL (github.com/<org>/<repo>)."""
import asyncio
import sys
sys.path.insert(0, "/home/deploy/depscope")

from api.database import get_pool
from api.registries import fetch_vulnerabilities


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, repository FROM packages WHERE ecosystem='swift'"
        )
    print(f"{len(rows)} swift packages", flush=True)

    new_vulns = 0
    sem = asyncio.Semaphore(8)

    async def process(pkg):
        nonlocal new_vulns
        async with sem:
            try:
                vulns = await fetch_vulnerabilities(
                    "swift", pkg["name"], latest_version=None, repository=pkg["repository"]
                )
            except Exception as e:
                print(f"  ERR {pkg['name']}: {e}", flush=True)
                return
            if not vulns:
                return
            inserted = 0
            async with pool.acquire() as conn:
                for v in vulns:
                    r = await conn.execute(
                        """INSERT INTO vulnerabilities
                           (package_id, vuln_id, severity, summary,
                            affected_versions, fixed_version, source, updated_at)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
                           ON CONFLICT (package_id, vuln_id) DO UPDATE
                           SET severity = EXCLUDED.severity,
                               fixed_version = EXCLUDED.fixed_version,
                               updated_at = NOW()""",
                        pkg["id"],
                        v.get("vuln_id") or v.get("id") or "",
                        v.get("severity") or "unknown",
                        (v.get("summary") or "")[:4000],
                        v.get("affected_versions") or "",
                        v.get("fixed_version") or "",
                        v.get("source", "osv"),
                    )
                    if r and r.split()[-1] == "1":
                        inserted += 1
            print(f"  {pkg['name']:30} +{inserted}", flush=True)
            new_vulns += inserted

    await asyncio.gather(*[process(p) for p in rows])
    print(f"DONE — {new_vulns} new/updated vulns", flush=True)


asyncio.run(main())
