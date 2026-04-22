#!/usr/bin/env python3
"""Deduplicate case-insensitive duplicate packages in DepScope.

PyPI / most ecosystems normalize names case-insensitively (PEP 503 for PyPI,
npm scopes, NuGet, Swift). Our packages table stored them case-preserved so we
ended up with rows like `PyYAML, PyYaml, pyYAML, pyyaml` that are semantically
the same package. This script merges each such group into a single canonical
(lowercase) row, re-pointing all FK children first to avoid orphaning data.

Safety:
  - Runs inside a single transaction; any error rolls back everything.
  - --dry-run by default prints actions without touching the DB.
  - --apply must be passed explicitly to commit.
  - Adds a UNIQUE index on (ecosystem, LOWER(name)) at the end so this class
    of duplicate cannot recur.
  - Designed for STAGE DB (depscope_stage). Reads DATABASE_URL from the env.
  - --apply is refused when DATABASE_URL does not target depscope_stage.

Run:
  DATABASE_URL=postgresql://depscope:***@localhost:5432/depscope_stage \\
      .venv/bin/python3 scripts/dedup_pypi_pending.py --dry-run
  DATABASE_URL=... .venv/bin/python3 scripts/dedup_pypi_pending.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from typing import Any

import asyncpg


# Child tables that reference packages.id via ON DELETE CASCADE.
# For each, we record the FK column and the columns of the UNIQUE constraint
# that could collide when repointing dup -> keeper. known_bugs is handled
# specially (its uniqueness uses the text column package_name, not package_id).
FK_TABLES: list[dict[str, Any]] = [
    {"table": "vulnerabilities",  "fk": "package_id", "conflict_cols": ["package_id", "vuln_id"]},
    {"table": "versions",         "fk": "package_id", "conflict_cols": ["package_id", "version"]},
    {"table": "breaking_changes", "fk": "package_id", "conflict_cols": ["package_id", "from_version", "to_version", "change_type", "desc_hash"]},
    {"table": "known_bugs",       "fk": "package_id", "conflict_cols": None},  # special
    {"table": "github_stats",     "fk": "package_id", "conflict_cols": ["package_id"]},
    {"table": "health_history",   "fk": "package_id", "conflict_cols": ["package_id", "recorded_at"]},
    {"table": "alternatives",     "fk": "package_id", "conflict_cols": ["package_id", "alternative_name"]},
    # alternatives.alternative_package_id is handled in a dedicated function.
]


async def fetch_groups(conn) -> list[dict[str, Any]]:
    rows = await conn.fetch(
        """
        SELECT ecosystem,
               LOWER(name)                     AS canonical,
               COUNT(*)                        AS n,
               array_agg(id   ORDER BY id)     AS ids,
               array_agg(name ORDER BY id)     AS names
        FROM packages
        GROUP BY ecosystem, LOWER(name)
        HAVING COUNT(*) > 1
        ORDER BY ecosystem, canonical
        """
    )
    return [dict(r) for r in rows]


def pick_keeper(group: dict[str, Any]) -> int:
    """Prefer the row already named in canonical (lowercase) form; else oldest id."""
    for pid, nm in zip(group["ids"], group["names"]):
        if nm == group["canonical"]:
            return pid
    return group["ids"][0]  # oldest id


async def repoint_generic(conn, spec: dict[str, Any], keeper_id: int, dup_id: int, dry: bool) -> int:
    """Re-point child rows from dup_id to keeper_id, deleting rows that would
    collide with the keeper's UNIQUE key (those will be CASCADE-deleted anyway
    when the duplicate package row is removed). Returns affected row count."""
    table = spec["table"]
    fk = spec["fk"]
    conflict_cols = spec["conflict_cols"]
    if conflict_cols is None:
        raise RuntimeError(f"no conflict spec for {table}")

    non_fk_cols = [c for c in conflict_cols if c != fk]

    if non_fk_cols:
        collision_where = " AND ".join(f"d.{c} = k.{c}" for c in non_fk_cols)
        del_sql = f"""
            DELETE FROM {table} d
            USING {table} k
            WHERE d.{fk} = $1
              AND k.{fk} = $2
              AND {collision_where}
        """
        probe_sql = f"""
            SELECT COUNT(*) FROM {table} d
            JOIN   {table} k USING ({', '.join(non_fk_cols)})
            WHERE d.{fk} = $1 AND k.{fk} = $2
        """
    else:
        # UNIQUE is (package_id) only — keeper wins if it already has a row.
        del_sql = f"""
            DELETE FROM {table}
            WHERE {fk} = $1
              AND EXISTS (SELECT 1 FROM {table} WHERE {fk} = $2)
        """
        probe_sql = f"""
            SELECT (SELECT COUNT(*) FROM {table} WHERE {fk} = $1)
                   * (CASE WHEN EXISTS (SELECT 1 FROM {table} WHERE {fk} = $2)
                           THEN 1 ELSE 0 END)
        """

    upd_sql = f"UPDATE {table} SET {fk} = $1 WHERE {fk} = $2"

    if dry:
        would_delete = await conn.fetchval(probe_sql, dup_id, keeper_id)
        total = await conn.fetchval(
            f"SELECT COUNT(*) FROM {table} WHERE {fk} = $1", dup_id
        )
        return total - would_delete

    await conn.execute(del_sql, dup_id, keeper_id)
    result = await conn.execute(upd_sql, keeper_id, dup_id)
    # asyncpg returns e.g. "UPDATE 3"
    try:
        return int(result.rsplit(" ", 1)[-1])
    except ValueError:
        return 0


async def repoint_known_bugs(conn, keeper_id: int, keeper_name: str, dup_id: int, eco: str, dry: bool) -> int:
    """known_bugs UNIQUE is (ecosystem, package_name, bug_id). Rewrite both
    package_id AND package_name to the keeper's canonical form, deleting
    collisions first."""
    if dry:
        would_delete = await conn.fetchval(
            """
            SELECT COUNT(*) FROM known_bugs d
            WHERE d.package_id = $1
              AND EXISTS (
                SELECT 1 FROM known_bugs k
                WHERE k.package_id = $2
                  AND k.ecosystem  = $3
                  AND k.package_name = $4
                  AND k.bug_id = d.bug_id
              )
            """,
            dup_id, keeper_id, eco, keeper_name,
        )
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM known_bugs WHERE package_id = $1", dup_id
        )
        return total - would_delete

    await conn.execute(
        """
        DELETE FROM known_bugs d
        USING known_bugs k
        WHERE d.package_id   = $1
          AND k.package_id   = $2
          AND k.ecosystem    = $3
          AND k.package_name = $4
          AND k.bug_id       = d.bug_id
        """,
        dup_id, keeper_id, eco, keeper_name,
    )
    result = await conn.execute(
        """
        UPDATE known_bugs
        SET package_id = $1, package_name = $2
        WHERE package_id = $3
        """,
        keeper_id, keeper_name, dup_id,
    )
    try:
        return int(result.rsplit(" ", 1)[-1])
    except ValueError:
        return 0


async def repoint_alternative_package_id(conn, keeper_id: int, dup_id: int, dry: bool) -> int:
    """alternatives.alternative_package_id is the second FK to packages.id.
    UNIQUE(package_id, alternative_name) applies, so delete collisions first."""
    if dry:
        would_delete = await conn.fetchval(
            """
            SELECT COUNT(*) FROM alternatives d
            WHERE d.alternative_package_id = $1
              AND EXISTS (
                SELECT 1 FROM alternatives k
                WHERE k.alternative_package_id = $2
                  AND k.package_id       = d.package_id
                  AND k.alternative_name = d.alternative_name
              )
            """,
            dup_id, keeper_id,
        )
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM alternatives WHERE alternative_package_id = $1",
            dup_id,
        )
        return total - would_delete

    await conn.execute(
        """
        DELETE FROM alternatives d
        USING alternatives k
        WHERE d.alternative_package_id = $1
          AND k.alternative_package_id = $2
          AND k.package_id       = d.package_id
          AND k.alternative_name = d.alternative_name
        """,
        dup_id, keeper_id,
    )
    result = await conn.execute(
        "UPDATE alternatives SET alternative_package_id = $1 WHERE alternative_package_id = $2",
        keeper_id, dup_id,
    )
    try:
        return int(result.rsplit(" ", 1)[-1])
    except ValueError:
        return 0


async def merge_group(conn, group: dict[str, Any], dry: bool) -> dict[str, int]:
    keeper_id = pick_keeper(group)
    keeper_name = group["canonical"]
    eco = group["ecosystem"]
    dup_ids = [pid for pid in group["ids"] if pid != keeper_id]

    stats = {"repointed": 0, "deleted_pkgs": 0}

    for dup_id in dup_ids:
        for spec in FK_TABLES:
            if spec["table"] == "known_bugs":
                moved = await repoint_known_bugs(
                    conn, keeper_id, keeper_name, dup_id, eco, dry
                )
            else:
                moved = await repoint_generic(conn, spec, keeper_id, dup_id, dry)
            stats["repointed"] += moved

        stats["repointed"] += await repoint_alternative_package_id(
            conn, keeper_id, dup_id, dry
        )

        if not dry:
            await conn.execute("DELETE FROM packages WHERE id = $1", dup_id)
        stats["deleted_pkgs"] += 1

    if not dry:
        await conn.execute(
            "UPDATE packages SET name = $1 WHERE id = $2 AND name <> $1",
            keeper_name, keeper_id,
        )

    return stats


async def run(dry: bool, dsn: str) -> int:
    conn = await asyncpg.connect(dsn)
    mode = "DRY-RUN" if dry else "APPLY"
    host_part = dsn.rsplit("@", 1)[-1]
    print(f"[{mode}] connecting to {host_part}")

    tr = conn.transaction()
    await tr.start()
    try:
        groups = await fetch_groups(conn)
        print(f"[{mode}] found {len(groups)} duplicate groups")
        by_eco: dict[str, int] = {}
        for g in groups:
            by_eco[g["ecosystem"]] = by_eco.get(g["ecosystem"], 0) + 1
        for eco, n in sorted(by_eco.items()):
            print(f"  - {eco}: {n} groups")

        total_repointed = 0
        total_deleted = 0
        for g in groups:
            names_str = ", ".join(g["names"])
            keeper_id = pick_keeper(g)
            print(
                f"[{mode}] {g['ecosystem']}/{g['canonical']} (n={g['n']}): "
                f"keeper=id {keeper_id}, names=[{names_str}]"
            )
            s = await merge_group(conn, g, dry)
            total_repointed += s["repointed"]
            total_deleted += s["deleted_pkgs"]
            print(
                f"    repointed {s['repointed']} child rows, "
                f"deleted {s['deleted_pkgs']} duplicate package row(s)"
            )

        idx_sql = (
            "CREATE UNIQUE INDEX IF NOT EXISTS "
            "packages_eco_lower_name_key ON packages (ecosystem, LOWER(name))"
        )
        print(f"[{mode}] ensuring safety-net unique index: {idx_sql}")
        if not dry:
            await conn.execute(idx_sql)

        if not dry:
            remaining = await conn.fetchval(
                """
                SELECT COUNT(*) FROM (
                    SELECT 1 FROM packages GROUP BY ecosystem, LOWER(name)
                    HAVING COUNT(*) > 1
                ) x
                """
            )
            print(f"[{mode}] remaining duplicate groups after merge: {remaining}")
            if remaining != 0:
                raise RuntimeError(
                    f"post-merge verification failed: {remaining} groups still duplicated"
                )
        else:
            # In dry-run we did not actually execute the DML, so verifying the
            # table would still show the original duplicates. Skip the check.
            print(
                f"[{mode}] verification skipped (no DML executed). "
                "Will be enforced on --apply."
            )

        if dry:
            print(
                f"[DRY-RUN] would repoint {total_repointed} child rows, "
                f"delete {total_deleted} duplicate package rows"
            )
            await tr.rollback()
            print("[DRY-RUN] transaction rolled back. No changes persisted.")
        else:
            await tr.commit()
            print(
                f"[APPLY] committed. repointed={total_repointed} "
                f"deleted_packages={total_deleted}"
            )
            print("[APPLY] running VACUUM ANALYZE packages ...")
            await conn.execute("VACUUM ANALYZE packages")
            print("[APPLY] done.")
    except Exception as e:
        try:
            await tr.rollback()
        except Exception:
            pass
        print(f"ERROR: {e}. Transaction rolled back.", file=sys.stderr)
        raise
    finally:
        await conn.close()

    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    mx = ap.add_mutually_exclusive_group(required=True)
    mx.add_argument("--dry-run", action="store_true", help="simulate; do not write")
    mx.add_argument("--apply",   action="store_true", help="commit the migration")
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        return 2
    if args.apply and "depscope_stage" not in dsn and not os.environ.get("DEPSCOPE_PROD_OK"):
        print(
            "ERROR: --apply refused unless DATABASE_URL targets depscope_stage. "
            f"Got host part: {dsn.rsplit('@', 1)[-1]!r}",
            file=sys.stderr,
        )
        return 2

    return asyncio.run(run(dry=args.dry_run, dsn=dsn))


if __name__ == "__main__":
    sys.exit(main())
