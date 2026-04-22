#!/usr/bin/env python3
"""Backfill privacy + intelligence columns on api_usage:
  - ip_hash (SHA256 of ip_address + IP_HASH_SALT)
  - agent_client (derived from user_agent)
  - is_hallucination (endpoint IN ('check','package_exists','exists') AND status_code=404)

Run safely: idempotent (WHERE ip_hash IS NULL filters already-processed rows).
Does NOT drop ip_address — that's a separate, explicit action.
"""
import asyncio
import hashlib
import os
import re
import sys

sys.path.insert(0, "/home/deploy/depscope")

import asyncpg

from api.config import DATABASE_URL, IP_HASH_SALT


_AGENT_PATTERNS = [
    ("claude-code",       re.compile(r"claude[- ]?code", re.I)),
    ("claude-desktop",    re.compile(r"claude[- ]?desktop|anthropic[- ]?claude", re.I)),
    ("cursor",            re.compile(r"cursor(?!bot)", re.I)),
    ("windsurf",          re.compile(r"windsurf", re.I)),
    ("continue",          re.compile(r"continue\.dev|continue[- ]?ide", re.I)),
    ("aider",             re.compile(r"aider", re.I)),
    ("devin",             re.compile(r"devin|cognition[- ]?ai", re.I)),
    ("copilot",           re.compile(r"github[- ]?copilot", re.I)),
    ("chatgpt",           re.compile(r"chatgpt|openai[- ]?agent", re.I)),
    ("claude-web",        re.compile(r"^claude$|claude\.ai", re.I)),
    ("replit",            re.compile(r"replit[- ]?agent", re.I)),
    ("cody",              re.compile(r"sourcegraph[- ]?cody", re.I)),
    ("tabnine",           re.compile(r"tabnine", re.I)),
    ("zed",               re.compile(r"zed[- ]?(industries|agent)", re.I)),
    ("mcp-generic",       re.compile(r"mcp[/\-]|model[- ]?context[- ]?protocol", re.I)),
    ("crawler",           re.compile(r"bot|crawl|spider|slurp|mediapartners|googleother|claude_bot|anthropicbot|gptbot|oai-searchbot", re.I)),
    ("python-sdk",        re.compile(r"python-openai-sdk|anthropic-python|python/.*aiohttp", re.I)),
    ("browser",           re.compile(r"mozilla/", re.I)),
    ("curl",              re.compile(r"^curl/", re.I)),
]


def parse_agent_client(ua: str) -> str:
    if not ua:
        return "unknown"
    for label, pat in _AGENT_PATTERNS:
        if pat.search(ua):
            return label
    return "other"


def hash_ip(ip: str) -> str:
    if not ip:
        return ""
    return hashlib.sha256((ip + IP_HASH_SALT).encode()).hexdigest()


_HALLUCINATION_ENDPOINTS = {"check", "package_exists", "exists", "package-exists"}


async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Step 1: ip_hash backfill
        print("Step 1: backfilling ip_hash...")
        total = await conn.fetchval("SELECT COUNT(*) FROM api_usage WHERE ip_hash IS NULL")
        print(f"  rows to process: {total}")
        batch_size = 2000
        processed = 0
        while True:
            rows = await conn.fetch(
                "SELECT id, ip_address FROM api_usage WHERE ip_hash IS NULL LIMIT $1",
                batch_size,
            )
            if not rows:
                break
            updates = [(hash_ip(r["ip_address"] or ""), r["id"]) for r in rows]
            await conn.executemany(
                "UPDATE api_usage SET ip_hash=$1 WHERE id=$2",
                updates,
            )
            processed += len(rows)
            print(f"  ip_hash: {processed}/{total}")

        # Step 2: agent_client backfill
        print("\nStep 2: backfilling agent_client...")
        total = await conn.fetchval("SELECT COUNT(*) FROM api_usage WHERE agent_client IS NULL")
        print(f"  rows to process: {total}")
        processed = 0
        while True:
            rows = await conn.fetch(
                "SELECT id, user_agent FROM api_usage WHERE agent_client IS NULL LIMIT $1",
                batch_size,
            )
            if not rows:
                break
            updates = [(parse_agent_client(r["user_agent"] or ""), r["id"]) for r in rows]
            await conn.executemany(
                "UPDATE api_usage SET agent_client=$1 WHERE id=$2",
                updates,
            )
            processed += len(rows)
            print(f"  agent_client: {processed}/{total}")

        # Step 3: is_hallucination backfill (single UPDATE)
        print("\nStep 3: backfilling is_hallucination...")
        endpoints_sql = "(" + ",".join(f"'{e}'" for e in _HALLUCINATION_ENDPOINTS) + ")"
        result = await conn.execute(
            f"UPDATE api_usage SET is_hallucination = TRUE "
            f"WHERE is_hallucination IS FALSE AND status_code = 404 "
            f"AND endpoint IN {endpoints_sql}"
        )
        print(f"  {result}")

        # Summary
        print("\n=== Post-backfill snapshot ===")
        stats = await conn.fetch(
            "SELECT agent_client, COUNT(*) FROM api_usage GROUP BY agent_client ORDER BY 2 DESC"
        )
        print("agent_client distribution:")
        for r in stats:
            print(f"  {r['agent_client'] or '<null>':<20s} {r['count']:>8d}")

        hall_count = await conn.fetchval(
            "SELECT COUNT(*) FROM api_usage WHERE is_hallucination = TRUE"
        )
        print(f"\nhallucinations logged: {hall_count}")

        top_hallucinated = await conn.fetch(
            "SELECT ecosystem, package_name, COUNT(*) AS n "
            "FROM api_usage WHERE is_hallucination = TRUE "
            "GROUP BY 1,2 ORDER BY 3 DESC LIMIT 15"
        )
        print("top hallucinated packages:")
        for r in top_hallucinated:
            print(f"  {r['ecosystem']:<10s} {r['package_name']:<60s} {r['n']}")

        # Validation: no IP in ip_hash should equal IP
        stale = await conn.fetchval(
            "SELECT COUNT(*) FROM api_usage WHERE ip_hash IS NULL"
        )
        print(f"\nip_hash NULLs remaining: {stale}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
