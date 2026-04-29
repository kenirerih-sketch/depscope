#!/usr/bin/env python3
"""Master script - regenerate all static manifests + push freshness signals.

Runs hourly via cron. Reads /api/stats DB-truth, renders all manifests,
commits to git, republishes MCP Registry on significant change, pings IndexNow.

Outputs:
- frontend/public/llms.txt
- frontend/public/llms-full.txt
- frontend/public/stats.json (consumed by frontend dynamic numbers)
- mcp-server/server.json (versioned)
- README.md (numbers section)
- /tmp/freshness_signals.log
"""
import os, sys, re, json, hashlib, subprocess, datetime, urllib.request, urllib.parse
sys.path.insert(0, "/home/deploy/depscope")

ROOT = "/home/deploy/depscope"
NOW_ISO = datetime.datetime.now(datetime.timezone.utc).isoformat()
NOW_DATE = datetime.date.today().isoformat()


def db_stats():
    """Pull live numbers from the API."""
    try:
        r = urllib.request.urlopen("http://127.0.0.1:8000/api/stats", timeout=15)
        d = json.loads(r.read())
        # /api/stats returns packages_indexed/vulnerabilities_tracked — normalize
        return {
            "packages": d.get("packages_indexed", 0),
            "vulnerabilities": d.get("vulnerabilities_tracked", 0),
            "ecosystems": len(d.get("ecosystems", [])) if isinstance(d.get("ecosystems"), list) else 19,
            "alternatives": d.get("alternatives_curated", 724),
        }
    except Exception as e:
        print(f"  WARN: /api/stats fetch failed ({e}) — fallback to hardcoded", file=sys.stderr)
        return {"packages": 907000, "vulnerabilities": 19060, "ecosystems": 19, "alternatives": 724}


def fmt_pkg(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M+"
    if n >= 1_000:
        return f"{n//1000:,}k+"
    return str(n)


def write_stats_json(stats):
    """Write /public/stats.json — consumed by frontend dynamic component."""
    p = f"{ROOT}/frontend/public/stats.json"
    out = {
        "generated_at": NOW_ISO,
        "generated_date": NOW_DATE,
        "packages": stats.get("packages", 0),
        "packages_pretty": fmt_pkg(stats.get("packages", 0)),
        "vulnerabilities": stats.get("vulnerabilities", 0),
        "vulnerabilities_pretty": fmt_pkg(stats.get("vulnerabilities", 0)),
        "ecosystems": stats.get("ecosystems", 19),
        "alternatives": stats.get("alternatives", 0),
        "tools_mcp": 22,
    }
    open(p, "w").write(json.dumps(out, indent=2))
    return out


def update_llms_txt(stats):
    """Update llms.txt header line with current numbers + last-updated date."""
    p = f"{ROOT}/frontend/public/llms.txt"
    if not os.path.exists(p):
        return False
    c = open(p).read()
    # Update stats line: "X packages · Y ecosystems · Z CVEs"
    pkg_str = fmt_pkg(stats["packages"])
    cve_str = f"{stats['vulnerabilities']:,}"
    eco = stats.get("ecosystems", 19)
    new_stats_line = f"{pkg_str} packages · {eco} ecosystems · {cve_str} CVEs"
    c = re.sub(r"\d[\d,.]*[kKM]?\+?\s+packages\s*·\s*\d+\s*ecosystems\s*·\s*[\d,]+\s*CVEs", new_stats_line, c)
    c = re.sub(r"Last updated:\s*\d{4}-\d{2}-\d{2}", f"Last updated: {NOW_DATE}", c)
    open(p, "w").write(c)
    return True


def update_llms_full(stats):
    p = f"{ROOT}/frontend/public/llms-full.txt"
    if not os.path.exists(p):
        return False
    c = open(p).read()
    pkg_str = fmt_pkg(stats["packages"])
    eco = stats.get("ecosystems", 19)
    c = re.sub(r"\d[\d,.]*[kKM]?\+?\s+packages\s+across\s+\d+\s+ecosystems", f"{pkg_str} packages across {eco} ecosystems", c)
    open(p, "w").write(c)
    return True


def update_mcp_server_json(stats):
    """Bump version + update description. Two files: mcp-server/server.json + /tmp/server_v2.json."""
    targets = [f"{ROOT}/mcp-server/server.json", "/tmp/server_v2.json"]
    pkg_str = fmt_pkg(stats["packages"])
    cve_str = f"{stats['vulnerabilities']:,}"
    eco = stats.get("ecosystems", 19)
    new_desc = f"Saves tokens, energy & blocks unsafe packages — 22 tools, {eco} ecosystems, {pkg_str} pkgs, MIT."
    for p in targets:
        if not os.path.exists(p):
            continue
        try:
            d = json.load(open(p))
        except Exception:
            continue
        d["description"] = new_desc[:100]
        # Bump patch version
        v = d.get("version", "0.0.1")
        try:
            parts = [int(x) for x in v.split(".")]
            parts[-1] += 1
            d["version"] = ".".join(str(x) for x in parts)
        except Exception:
            pass
        try:
            open(p, "w").write(json.dumps(d, indent=2))
        except PermissionError:
            print(f"  WARN: skip {p} (no perm)", file=sys.stderr)
    return new_desc


def update_readme_numbers(stats):
    """Update README badges + numeric mentions."""
    p = f"{ROOT}/README.md"
    if not os.path.exists(p):
        return False
    c = open(p).read()
    pkg_str = fmt_pkg(stats["packages"])
    cve_str = f"{stats['vulnerabilities']:,}"
    eco = stats.get("ecosystems", 19)
    # Replace any "X+ packages" pattern in head section
    c = re.sub(r"\*\*\d[\d,.]*[kKM]?\+?\s+packages\*\*", f"**{pkg_str} packages**", c)
    c = re.sub(r"\*\*[\d,]+\+?\s+CVEs?\*\*", f"**{cve_str} CVEs**", c)
    c = re.sub(r"\*\*\d+\s+ecosystems\*\*", f"**{eco} ecosystems**", c)
    open(p, "w").write(c)
    return True


def git_commit_push():
    """Commit any changes from above to GitHub."""
    os.chdir(ROOT)
    r = subprocess.run(["git", "status", "-s"], capture_output=True, text=True)
    if not r.stdout.strip():
        print("  no changes to commit")
        return False
    subprocess.run(["git", "add",
        "frontend/public/llms.txt", "frontend/public/llms-full.txt",
        "frontend/public/stats.json", "mcp-server/server.json",
        "README.md"], capture_output=True)
    subprocess.run([
        "git", "-c", "user.email=info@ideatagliolaser.it",
        "-c", "user.name=Vincenzo",
        "commit", "-m",
        f"chore: hourly numbers refresh ({NOW_DATE})"
    ], capture_output=True)
    r = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
    return r.returncode == 0


def republish_mcp_registry():
    """Re-publish to MCP Registry with bumped version."""
    if not os.path.exists("/tmp/server_v2.json"):
        return False
    if not os.path.exists("/tmp/mcp-publisher"):
        return False
    # Login refreshes token
    subprocess.run([
        "/tmp/mcp-publisher", "login", "dns",
        "--domain=depscope.dev",
        "--private-key=3c649ff52c26a8b6fd1fac76fd74b2539d3b6495bfe499f693dfba72a2bd3ab8",
    ], capture_output=True, timeout=15)
    r = subprocess.run([
        "/tmp/mcp-publisher", "publish", "/tmp/server_v2.json",
    ], capture_output=True, text=True, timeout=20)
    return "Successfully published" in r.stdout


def ping_indexnow(urls):
    """Ping IndexNow API (Bing + Yandex)."""
    KEY = "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"  # placeholder; should match /KEY.txt on site
    body = json.dumps({
        "host": "depscope.dev",
        "key": KEY,
        "keyLocation": f"https://depscope.dev/{KEY}.txt",
        "urlList": urls,
    }).encode()
    try:
        req = urllib.request.Request(
            "https://api.indexnow.org/indexnow",
            data=body, method="POST",
            headers={"Content-Type": "application/json"}
        )
        r = urllib.request.urlopen(req, timeout=10)
        return r.status in (200, 202)
    except Exception as e:
        print(f"  IndexNow ping failed: {e}", file=sys.stderr)
        return False


def main():
    print(f"[{NOW_ISO}] regenerate_static_manifests")
    stats = db_stats()
    print(f"  pkg={stats.get('packages')} cve={stats.get('vulnerabilities')} eco={stats.get('ecosystems')}")

    out = write_stats_json(stats)
    print(f"  [1] /public/stats.json written: {out['packages_pretty']}")

    if update_llms_txt(stats):
        print(f"  [2] llms.txt updated")
    if update_llms_full(stats):
        print(f"  [3] llms-full.txt updated")

    new_desc = update_mcp_server_json(stats)
    print(f"  [4] mcp server.json updated: {new_desc[:60]}...")

    if update_readme_numbers(stats):
        print(f"  [5] README.md updated")

    pushed = git_commit_push()
    print(f"  [6] git push: {'OK' if pushed else 'no-op'}")

    # Re-publish to MCP Registry only if push succeeded (means real change)
    if pushed:
        rp = republish_mcp_registry()
        print(f"  [7] MCP Registry republish: {'OK' if rp else 'skip/fail'}")

        # Ping IndexNow with key URLs
        urls = [
            "https://depscope.dev/",
            "https://depscope.dev/stats",
            "https://depscope.dev/api-docs",
            "https://depscope.dev/integrate",
            "https://depscope.dev/llms.txt",
            "https://depscope.dev/llms-full.txt",
        ]
        ok = ping_indexnow(urls)
        print(f"  [8] IndexNow ping: {'OK' if ok else 'fail'}")
    else:
        print(f"  [7-8] skip (no real change)")


if __name__ == "__main__":
    main()
