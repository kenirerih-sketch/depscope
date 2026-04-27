#!/usr/bin/env python3
"""DepScope v1 contract snapshot tests.

Hits a fixed corpus of endpoints against the live API, normalises out volatile
fields, and diffs against golden snapshots. Fails CI on any v1 contract drift.

Each case declares an expected HTTP status — getting a 4xx where 200 was
expected is treated as a hard failure (otherwise an erroneous 404 baseline
would mask broken endpoints).

Usage:
    python3 tests/snapshot_test.py            # diff mode (CI)
    python3 tests/snapshot_test.py --update   # write/refresh golden files
    python3 tests/snapshot_test.py --base http://127.0.0.1:8000

Exit codes:
    0 = all snapshots match
    1 = at least one drift / unexpected status
    2 = setup error (api unreachable, etc.)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SNAP_DIR = ROOT / "snapshots"
SNAP_DIR.mkdir(exist_ok=True)

DEFAULT_BASE = os.environ.get("DEPSCOPE_BASE", "http://127.0.0.1:8000")

# Each case: (name, method, path, body_or_None, expected_status)
# Path strings MUST match an actual route in /openapi.json.
CASES = [
    # Core check — version handling fixes (bugs #3, #10, #11)
    ("check_npm_react",                 "GET",  "/api/check/npm/react", None, 200),
    ("check_npm_react_hallucinated",    "GET",  "/api/check/npm/react?version=99.99.99", None, 200),
    ("check_npm_react_dist_tag",        "GET",  "/api/check/npm/react?version=latest", None, 200),
    ("check_npm_react_semver_range",    "GET",  "/api/check/npm/react?version=%5E18.0.0", None, 200),

    # Framework hints (bugs #14, #18)
    ("check_swift_swiftui",             "GET",  "/api/check/swift/SwiftUI", None, 200),
    ("check_pub_flutter",               "GET",  "/api/check/pub/flutter", None, 200),

    # Maven groupId:artifactId (bug #4)
    ("check_maven_log4j_core",          "GET",  "/api/check/maven/org.apache.logging.log4j:log4j-core", None, 200),

    # Typosquat — cross-eco + in-eco
    ("typosquat_npm_reqeusts",          "GET",  "/api/typosquat/npm/reqeusts", None, 200),
    ("typosquat_npm_lodsh",             "GET",  "/api/typosquat/npm/lodsh", None, 200),
    ("typosquat_pypi_colorama_cyrillic","GET",  "/api/typosquat/pypi/color%D0%B0ma", None, 200),

    # Stdlib hints (bug #5)
    ("check_pypi_os",                   "GET",  "/api/check/pypi/os", None, 200),
    ("check_npm_fs",                    "GET",  "/api/check/npm/fs", None, 200),

    # Curated alternatives + migration (real path: /api/migration/{eco}/{from_pkg}/{to_pkg})
    ("alternatives_npm_moment",         "GET",  "/api/alternatives/npm/moment", None, 200),
    ("migration_npm_request_to_axios",  "GET",  "/api/migration/npm/request/axios", None, 200),
    ("migration_npm_dayjs_to_moment_ng","GET",  "/api/migration/npm/dayjs/moment", None, 200),

    # Compatibility (bug #9) — POST body
    ("compat_next_react_known_stack",   "POST", "/api/compat",
        {"packages": {"next": "latest", "react": "18.3.1", "react-dom": "18.3.1",
                      "typescript": "5.5.3", "@types/node": "20.14.10",
                      "@types/react": "18.3.3", "@types/react-dom": "18.3.0"}}, 200),

    # Compare (real path: GET /api/compare/{eco}/{packages_csv})
    ("compare_npm_mixed_scoped",        "GET",
        "/api/compare/npm/" + urllib.parse.quote("react,@types/react,express", safe=""),
        None, 200),

    # Bulk including stdlib + typosquat + historical (POST)
    ("bulk_mixed_signals",              "POST", "/api/check_bulk",
        {"items": [
            {"ecosystem": "pypi", "package": "json"},
            {"ecosystem": "npm", "package": "fs"},
            {"ecosystem": "npm", "package": "event-stream"},
            {"ecosystem": "npm", "package": "lodsh"},
            {"ecosystem": "npm", "package": "react"},
        ]}, 200),

    # pin_safe — impossible constraint (bug #15) — real path /api/pin_safe (underscore)
    ("pin_safe_moment_impossible",      "GET",
        "/api/pin_safe/npm/moment?constraint=%5E1.0.0&min_severity=critical", None, 200),

    # Resolve error — context demote (bug #8) — real path /api/error/resolve
    ("resolve_error_tensorflow_demote", "POST", "/api/error/resolve",
        {"error": "ModuleNotFoundError: No module named 'tensorflow.keras'",
         "context": {"ecosystem": "pypi", "package": "tensorflow"}}, 200),

    # Malicious + historical compromise
    ("malicious_npm_flatmap_stream",    "GET",  "/api/malicious/npm/flatmap-stream", None, 200),
    ("check_npm_event_stream_336",      "GET",  "/api/check/npm/event-stream?version=3.3.6", None, 200),

    # Cross-ecosystem coverage smoke
    ("check_cargo_serde",               "GET",  "/api/check/cargo/serde", None, 200),
    ("check_go_logrus",                 "GET",  "/api/check/go/github.com/sirupsen/logrus", None, 200),
    ("check_pypi_fastapi",              "GET",  "/api/check/pypi/fastapi", None, 200),
    ("check_hackage_aeson",             "GET",  "/api/check/hackage/aeson", None, 200),
    ("check_jsr_std_path",              "GET",  "/api/check/jsr/@std/path", None, 200),

    # Full scan_project (real path /api/scan, body: packages as dict {name: constraint})
    ("scan_known_stack",                "POST", "/api/scan",
        {"ecosystem": "npm",
         "packages": {"next": "14.2.0", "react": "18.3.1", "express": "4.17.0"}}, 200),

    # 404 case — verify error envelope shape is also stable
    ("check_npm_hallucinated_pkg_404",  "GET",
        "/api/check/npm/mxyzpltkqi-fakelol-doesnotexist", None, 404),
]

# Keys that MUST disappear before diffing — they vary every call or daily.
VOLATILE_KEYS = {
    "_cache", "_response_ms", "_powered_by", "_source", "_note", "note",
    "generated_at", "updated_at", "created_at", "scorecard_date",
    "last_published", "first_published", "repo_pushed_at", "repo_created_at",
    "last_checked", "downloads_weekly", "downloads_legit", "downloads_suspect",
    "popularity_ratio", "stars", "forks", "open_issues", "owner_account_age_days",
    "active_contributors_12m", "bus_factor_3m", "primary_author",
    "primary_author_ratio", "maintainers_count", "weekly_growth_pct",
    "call_count", "rank", "rank_change", "votes", "hash", "id",
    "latest_version", "latest", "use_version", "fixed_version",
    "version_hint", "score", "scorecard", "tier", "criticality_score",
    "criticality_tier", "criticality_date", "velocity_pct", "velocity_trend",
    "downloads_4w_avg", "publish_security", "publish_detail",
    "breakdown",
    "count", "critical", "high", "medium", "low",
    "actively_exploited_count", "likely_exploited_count",
    "vulnerabilities_count", "vulns_critical", "vulns_high",
    "total_count", "recent", "versions_checked", "known_vuln_count",
    "dependencies", "dependencies_count",
    "size_kb", "gzip_kb",
    "epss_prob", "epss_percentile", "threat_tier", "in_kev",
    "details",
    "similar_stacks", "stack_hash", "reported_count", "match_type",
    "mismatches", "similar_stacks_majors", "requested_major",
    "description", "homepage", "repository", "license",
    "license_risk", "commercial_use_notes",
    "alerts", "issues", "checks", "at_risk_checks",
    "walk",
    "full_message", "pattern", "solution", "source_url", "labels",
    "ecosystem_filter",
    "data_json", "raw",
    "source",
    "types_package", "types_source", "has_types",
    "has_js_module", "has_side_effects", "scoped",
    "affected_version", "affected_versions",
    "vuln_id", "summary", "title", "status_breakdown",
    "bugs_severity", "bugs_count",
    "link", "url", "references", "refs", "scope",
    "entries", "trending", "matches", "results",
    "metadata",
    # error envelope volatile parts
    "did_you_mean", "message", "hint",
}


def fetch(base: str, method: str, path: str, body):
    url = base.rstrip("/") + path
    headers = {"Accept": "application/json", "User-Agent": "DepScope-snapshot-test/1"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, {"_raw_text": raw[:500]}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {"_error": str(e)}
    except Exception as e:
        return 0, {"_unreachable": str(e)}


def shape(obj, depth=0):
    if depth > 8:
        return "<deep>"
    if isinstance(obj, dict):
        out = {}
        for k, v in sorted(obj.items()):
            if k in VOLATILE_KEYS:
                out[k] = f"<{type(v).__name__}>"
                continue
            out[k] = shape(v, depth + 1)
        return out
    if isinstance(obj, list):
        if not obj:
            return []
        return [shape(obj[0], depth + 1), f"<list:{'empty' if len(obj)==0 else 'nonempty'}>"]
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, str):
        if len(obj) <= 32 and not obj.startswith(("http", "/", " ")):
            return obj
        return f"<str:{len(obj)}>"
    if obj is None:
        return None
    return f"<{type(obj).__name__}>"


def load_golden(name):
    p = SNAP_DIR / f"{name}.json"
    return json.loads(p.read_text()) if p.exists() else None


def save_golden(name, status, shape_obj):
    p = SNAP_DIR / f"{name}.json"
    p.write_text(json.dumps({"status": status, "shape": shape_obj},
                            indent=2, sort_keys=True))


def diff(golden, current, path=""):
    if type(golden) is not type(current):
        yield f"{path}: type changed {type(golden).__name__} -> {type(current).__name__}"
        return
    if isinstance(golden, dict):
        gk, ck = set(golden), set(current)
        for k in gk - ck:
            yield f"{path}.{k}: REMOVED (was {golden[k]!r})"
        for k in ck - gk:
            yield f"{path}.{k}: ADDED ({current[k]!r})"
        for k in gk & ck:
            yield from diff(golden[k], current[k], f"{path}.{k}")
    elif isinstance(golden, list):
        if len(golden) != len(current):
            yield f"{path}: list cardinality changed {len(golden)}->{len(current)}"
        elif golden and current:
            yield from diff(golden[0], current[0], f"{path}[0]")
    else:
        if golden != current:
            yield f"{path}: {golden!r} -> {current!r}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--update", action="store_true")
    ap.add_argument("--only", help="substring filter on case names")
    args = ap.parse_args()

    cases = [c for c in CASES if not args.only or args.only in c[0]]
    drifted, new, status_mismatch, ok, unreachable = [], [], [], 0, 0

    for name, method, path, body, expected_status in cases:
        status, payload = fetch(args.base, method, path, body)
        if status == 0:
            print(f"[UNREACH] {name}: {payload.get('_unreachable')}")
            unreachable += 1
            continue
        if status != expected_status:
            print(f"[STATUS]  {name}: expected {expected_status}, got {status}  path={path}")
            status_mismatch.append(name)
            continue

        current_shape = shape(payload)
        current = {"status": status, "shape": current_shape}
        golden = load_golden(name)

        if golden is None:
            if args.update:
                save_golden(name, status, current_shape)
                print(f"[NEW]     {name}: snapshot written")
                new.append(name)
            else:
                print(f"[MISSING] {name}: no golden, run with --update first")
                drifted.append(name)
            continue

        # Also fail if cached golden status mismatches
        if golden.get("status") != status:
            print(f"[STATUS]  {name}: golden status {golden.get('status')} != current {status}")
            status_mismatch.append(name)
            if args.update:
                save_golden(name, status, current_shape)
                print(f"          -> golden refreshed")
            continue

        diffs = list(diff(golden, current))
        if not diffs:
            print(f"[OK]      {name}")
            ok += 1
        else:
            print(f"[DRIFT]   {name}")
            for d in diffs[:15]:
                print(f"          {d}")
            if args.update:
                save_golden(name, status, current_shape)
                print(f"          -> golden refreshed")
            else:
                drifted.append(name)

    total = len(cases)
    print(f"\nsummary: ok={ok} drift={len(drifted)} status_mismatch={len(status_mismatch)} "
          f"new={len(new)} unreachable={unreachable} / {total}")

    if unreachable:
        return 2
    if drifted or status_mismatch:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
