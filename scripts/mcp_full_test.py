#!/usr/bin/env python3
"""Full MCP 22-tool matrix test with correct arg schemas.

Previous audit used wrong args for check_compatibility + resolve_error.
This script derives the correct args from tools.js inputSchema and
tests every single tool end-to-end via HTTP MCP transport.
"""
import asyncio
import json
import random
import re
import sys

sys.path.insert(0, "/home/deploy/depscope")

import aiohttp

MCP = "http://127.0.0.1:8001/mcp"

TESTS = [
    # (tool, args)
    ("check_package",       {"ecosystem": "npm", "package": "react"}),
    ("package_exists",      {"ecosystem": "pypi", "package": "requests"}),
    ("package_exists",      {"ecosystem": "npm", "package": "this-fake-pkg-9999"}),
    ("get_latest_version",  {"ecosystem": "cargo", "package": "tokio"}),
    ("get_health_score",    {"ecosystem": "pypi", "package": "django"}),
    ("get_vulnerabilities", {"ecosystem": "npm", "package": "lodash"}),
    ("find_alternatives",   {"ecosystem": "npm", "package": "request"}),
    ("check_typosquat",     {"ecosystem": "npm", "package": "reqeusts"}),
    ("check_malicious",     {"ecosystem": "pypi", "package": "colorama"}),
    ("check_compatibility", {"packages": {"next": "15", "react": "19"}}),
    ("compare_packages",    {"ecosystem": "npm", "packages": ["lodash", "underscore"]}),
    ("get_breaking_changes", {"ecosystem": "cargo", "package": "tokio"}),
    ("get_known_bugs",      {"ecosystem": "npm", "package": "moment"}),
    ("get_quality",         {"ecosystem": "npm", "package": "react"}),
    ("resolve_error",       {"error": "ModuleNotFoundError: No module named 'pands'"}),
    ("install_command",     {"ecosystem": "npm", "package": "react"}),
    ("check_bulk",          {"items": [{"ecosystem": "npm", "package": "react"},
                                       {"ecosystem": "pypi", "package": "requests"}]}),
    ("scan_project",        {"ecosystem": "npm",
                             "packages": ["react", "lodash@4.17.0", "axios"]}),
    ("contact_depscope",    {"kind": "bug", "email": "test@depscope.dev",
                             "subject": "smoke test ping",
                             "body": "Automated MCP test message - please ignore. Ten plus chars."}),
    ("get_migration_path",  {"ecosystem": "npm", "package": "request"}),
    ("get_package_prompt",  {"ecosystem": "npm", "package": "react"}),
    ("get_trending",        {"ecosystem": "npm", "limit": 5}),
    ("get_trust_signals",   {"ecosystem": "npm", "package": "react"}),
    ("pin_safe",            {"ecosystem": "npm", "package": "lodash", "current_version": "4.17.0"}),
]


async def call(session, sid, tool, args):
    body = {
        "jsonrpc": "2.0",
        "id": random.randint(2, 10**9),
        "method": "tools/call",
        "params": {"name": tool, "arguments": args},
    }
    h = {"Accept": "application/json, text/event-stream",
         "Content-Type": "application/json", "Mcp-Session-Id": sid}
    try:
        async with session.post(MCP, json=body, headers=h,
                                timeout=aiohttp.ClientTimeout(total=30)) as r:
            txt = await r.text()
            for ln in txt.split("\n"):
                if ln.startswith("data:"):
                    return json.loads(ln[5:].strip())
            return json.loads(txt) if txt else None
    except Exception as e:
        return {"error": {"message": str(e)}}


async def main():
    async with aiohttp.ClientSession() as session:
        init_body = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
                     "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                                "clientInfo": {"name": "full-audit", "version": "1.0"}}}
        async with session.post(
            MCP, json=init_body,
            headers={"Accept": "application/json, text/event-stream",
                     "Content-Type": "application/json"},
        ) as r:
            sid = r.headers.get("Mcp-Session-Id")

        print(f"MCP session: {sid}\n")
        ok = err = 0
        for tool, args in TESTS:
            res = await call(session, sid, tool, args)
            if not res:
                print(f"  ✗ {tool:<22s}  no response")
                err += 1
                continue
            if "error" in res and not res.get("result"):
                print(f"  ✗ {tool:<22s}  jsonrpc err: {str(res['error'])[:70]}")
                err += 1
                continue
            result = res.get("result") or {}
            if result.get("isError"):
                content = result.get("content") or []
                preview = content[0].get("text", "")[:60] if content else ""
                print(f"  ⚠ {tool:<22s}  isError=true · {preview}")
                err += 1
            else:
                content = result.get("content") or []
                if content:
                    txt = content[0].get("text", "")
                    # Try to parse JSON or show preview
                    try:
                        inner = json.loads(txt)
                        hint = ", ".join(list(inner.keys())[:5]) if isinstance(inner, dict) else f"{len(inner)} items"
                    except Exception:
                        hint = txt.split("\n")[0][:70]
                    print(f"  ✓ {tool:<22s}  {hint}")
                else:
                    print(f"  ✓ {tool:<22s}  (empty content)")
                ok += 1

        print(f"\n=== {ok}/{ok+err} tools OK ===")
        if err:
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
