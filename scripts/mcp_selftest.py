#!/usr/bin/env python3
"""DepScope MCP live self-test via streamable HTTP transport.

Initializes a session, lists tools, calls several of them, verifies
the responses match expectations (real data from the DepScope API).
"""
import json
import sys
import uuid

import requests

BASE = "https://depscope.dev/mcp"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}

GREEN = "\033[32m"
RED = "\033[31m"
DIM = "\033[2m"
RESET = "\033[0m"

results = []


def log(name, ok, msg=""):
    mark = f"{GREEN}✓{RESET}" if ok else f"{RED}✗{RESET}"
    print(f"  {mark} {name:48} {DIM}{msg}{RESET}")
    results.append((name, ok, msg))


def parse_sse(text):
    """SSE response: extract JSON payload from `data: {...}` line."""
    for line in text.splitlines():
        if line.startswith("data: "):
            try:
                return json.loads(line[6:])
            except Exception:
                pass
    try:
        return json.loads(text)
    except Exception:
        return None


def rpc(session, method, params=None, session_id=None, _id=None):
    """Send one JSON-RPC request and return the parsed response."""
    headers = dict(HEADERS)
    if session_id:
        headers["mcp-session-id"] = session_id
    body = {"jsonrpc": "2.0", "method": method}
    if _id is not None:
        body["id"] = _id
    if params is not None:
        body["params"] = params
    r = session.post(BASE, headers=headers, json=body, timeout=20)
    if r.status_code >= 400:
        raise RuntimeError(f"http {r.status_code}: {r.text[:300]}")
    sid = r.headers.get("mcp-session-id")
    return parse_sse(r.text), sid


def main():
    s = requests.Session()

    # --- 1. initialize ---
    res, sid = rpc(s, "initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "depscope-selftest", "version": "1.0"},
    }, _id=1)
    server_info = (res or {}).get("result", {}).get("serverInfo", {})
    log("initialize", bool(server_info.get("name")), f"server={server_info.get('name')} v{server_info.get('version')} session={sid[:8] if sid else '-'}…")

    # Notify initialized (required by MCP spec)
    rpc(s, "notifications/initialized", {}, session_id=sid)

    # --- 2. tools/list ---
    res, _ = rpc(s, "tools/list", {}, session_id=sid, _id=2)
    tools = (res or {}).get("result", {}).get("tools", [])
    log("tools/list returns tools", len(tools) > 0, f"n={len(tools)}")

    tool_names = {t["name"] for t in tools}
    expected_tools = {
        "check_package",
        "get_latest_version",
        "find_alternatives",
        "get_vulnerabilities",
        "get_health_score",
    }
    missing = expected_tools - tool_names
    log("core tools present", not missing, f"missing={sorted(missing) if missing else 'none'}")

    # --- 3. tools/call: check_package lodash ---
    def call(tool, args, check_fn, label):
        try:
            res, _ = rpc(s, "tools/call", {"name": tool, "arguments": args}, session_id=sid, _id=100)
            if (res or {}).get("error"):
                log(label, False, f"error={res['error']}")
                return None
            content = (res or {}).get("result", {}).get("content", [])
            text = content[0].get("text", "") if content else ""
            try:
                data = json.loads(text)
            except Exception:
                data = text
            ok, detail = check_fn(data)
            log(label, ok, detail)
            return data
        except Exception as e:
            log(label, False, str(e))
            return None

    call("check_package",
         {"ecosystem": "npm", "package": "lodash"},
         lambda d: (isinstance(d, dict) and d.get("package") == "lodash" and "health" in d,
                    f"health={d.get('health', {}).get('score') if isinstance(d, dict) else '?'}"),
         "check_package(npm/lodash)")

    call("check_package",
         {"ecosystem": "npm", "package": "moment"},
         lambda d: (
             isinstance(d, dict) and any(
                 a.get("name") == "dayjs"
                 for a in (d.get("recommendation") or {}).get("alternatives", [])
             ),
             "recommendation.alternatives includes dayjs" if isinstance(d, dict) and any(
                 a.get("name") == "dayjs"
                 for a in (d.get("recommendation") or {}).get("alternatives", [])
             ) else f"alts={(d.get('recommendation') or {}).get('alternatives') if isinstance(d, dict) else None}",
         ),
         "check_package(npm/moment) with alternatives")

    call("get_latest_version",
         {"ecosystem": "pypi", "package": "requests"},
         lambda d: (isinstance(d, dict) and d.get("latest"),
                    f"latest={d.get('latest') if isinstance(d, dict) else '?'}"),
         "get_latest_version(pypi/requests)")

    call("find_alternatives",
         {"ecosystem": "npm", "package": "request"},
         lambda d: (isinstance(d, dict) and len(d.get("alternatives") or []) >= 3,
                    f"n={len(d.get('alternatives') or []) if isinstance(d, dict) else 0}"),
         "find_alternatives(npm/request)")

    call("get_vulnerabilities",
         {"ecosystem": "npm", "package": "lodash"},
         lambda d: (isinstance(d, dict) and d.get("vulnerability_count", 0) >= 0,
                    f"count={d.get('vulnerability_count') if isinstance(d, dict) else '?'}"),
         "get_vulnerabilities(npm/lodash)")

    # 404-ish unknown package
    call("check_package",
         {"ecosystem": "npm", "package": "this-pkg-does-not-exist-xyz-12345"},
         lambda d: (
             (isinstance(d, dict) and d.get("error"))
             or (isinstance(d, str) and ("not found" in d.lower() or "error" in d.lower()))
             or (isinstance(d, dict) and d.get("exists") is False),
             f"handled={repr(d)[:80] if d else 'none'}",
         ),
         "check_package unknown handled")

    # --- Summary ---
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed
    color = GREEN if failed == 0 else RED
    print(f"\n  {color}{passed}/{total} MCP checks passed{RESET}")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
