#!/usr/bin/env python3
"""
Full registry enumeration for DepScope long-tail ecosystems.
Usage: ECOSYSTEM=homebrew python3 scripts/full_populate.py [LIMIT=0] [CONCURRENCY=8]
Runs enumerate_<eco>() to get ALL upstream names, then fetch_package + save_package_to_db for each.
Idempotent: ON CONFLICT UPDATE in save_package_to_db. Resume via ecosystem existing-rows skip.
Log: /var/log/depscope/full_populate_<eco>.log
"""
import asyncio
import aiohttp
import asyncpg
import sys
import os
import time
import logging
import gzip
import io
import re

sys.path.insert(0, "/home/deploy/depscope")

from api.registries import fetch_package, fetch_vulnerabilities, save_package_to_db
from api.health import calculate_health_score
from api.cache import cache_set

ECOSYSTEM = os.environ.get("ECOSYSTEM", "").strip().lower()
if not ECOSYSTEM:
    print("ERROR: set ECOSYSTEM env var (homebrew|cran|conda|hackage|hex|pub|swift|cpan|cocoapods)", file=sys.stderr)
    sys.exit(1)

DATABASE_URL = os.environ["DATABASE_URL"]
LIMIT = int(os.environ.get("LIMIT", "0"))  # 0 = no cap
CONCURRENCY = int(os.environ.get("CONCURRENCY", "8"))
SKIP_EXISTING = os.environ.get("SKIP_EXISTING", "1") == "1"

LOG_DIR = "/var/log/depscope"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = f"{LOG_DIR}/full_populate_{ECOSYSTEM}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
)
log = logging.getLogger(f"full_populate.{ECOSYSTEM}")

HTTP_TIMEOUT = aiohttp.ClientTimeout(total=90)
HEADERS = {"User-Agent": "DepScope/1.0 (+https://depscope.dev)"}


# ═══════════════════════════════════════════════════════════════
# FULL ENUMERATORS (one per ecosystem)
# ═══════════════════════════════════════════════════════════════

async def enumerate_homebrew(session) -> list[str]:
    async with session.get("https://formulae.brew.sh/api/formula.json",
                           headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
        r.raise_for_status()
        data = await r.json(content_type=None)
    names = [f["name"] for f in data if f.get("name")]
    return sorted(set(names))


async def enumerate_cran(session) -> list[str]:
    # Try crandb API first (if it works), else fall back to CRAN PACKAGES file.
    for url in ("https://crandb.r-pkg.org/-/allnames",
                "https://crandb.r-pkg.org/-/desc"):
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    continue
                data = await r.json(content_type=None)
            if isinstance(data, list) and data:
                return sorted(set(str(x) for x in data if x))
            if isinstance(data, dict) and data:
                return sorted(set(data.keys()))
        except Exception as e:
            log.warning(f"cran {url}: {e}")
    # Authoritative fallback: CRAN PACKAGES file (plain text, one record per pkg)
    async with session.get("https://cran.r-project.org/src/contrib/PACKAGES",
                           headers=HEADERS, timeout=aiohttp.ClientTimeout(total=180)) as r:
        r.raise_for_status()
        txt = await r.text()
    names = re.findall(r"^Package:\s*(\S+)", txt, re.MULTILINE)
    return sorted(set(names))


async def enumerate_hackage(session) -> list[str]:
    async with session.get("https://hackage.haskell.org/packages/",
                           headers={**HEADERS, "Accept": "application/json"},
                           timeout=HTTP_TIMEOUT) as r:
        r.raise_for_status()
        data = await r.json(content_type=None)
    names = [p.get("packageName") for p in data if isinstance(p, dict)]
    return sorted(set(n for n in names if n))


async def enumerate_hex(session) -> list[str]:
    """Hex.pm /api/packages pagination with 429 backoff and slow pacing."""
    names: list[str] = []
    page = 1
    backoff = 0.0
    while True:
        url = f"https://hex.pm/api/packages?sort=name&per_page=100&page={page}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status == 429:
                    backoff = max(backoff * 2, 10)
                    log.warning(f"hex page {page}: 429, sleeping {backoff}s")
                    await asyncio.sleep(backoff)
                    continue
                if r.status != 200:
                    log.warning(f"hex page {page}: status={r.status}")
                    break
                backoff = 0
                data = await r.json(content_type=None)
                if not data:
                    break
                for p in data:
                    n = p.get("name")
                    if n:
                        names.append(n)
                if len(data) < 100:
                    break
        except Exception as e:
            log.warning(f"hex page {page}: {e}")
            await asyncio.sleep(5)
            continue
        page += 1
        await asyncio.sleep(1.0)  # ~1 req/s to respect hex.pm rate limit
        if page % 20 == 0:
            log.info(f"[enumerate_hex] page={page} names={len(names)}")
    return sorted(set(names))


async def enumerate_pub(session) -> list[str]:
    # pub.dev /api/package-names endpoint (undocumented but exists)
    # Fallback to sitemap if that fails.
    try:
        async with session.get("https://pub.dev/api/package-names",
                               headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
            if r.status == 200:
                data = await r.json(content_type=None)
                names = data.get("packages") if isinstance(data, dict) else data
                if isinstance(names, list) and names:
                    return sorted(set(str(x) for x in names if x))
    except Exception as e:
        log.warning(f"pub package-names: {e}")

    # Fallback: paginate search
    names: list[str] = []
    for page in range(1, 1500):
        url = f"https://pub.dev/api/search?q=&sort=listed&page={page}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                pkgs = data.get("packages", [])
                if not pkgs:
                    break
                for p in pkgs:
                    n = p.get("package") if isinstance(p, dict) else p
                    if n:
                        names.append(n)
        except Exception as e:
            log.warning(f"pub page {page}: {e}")
            break
        await asyncio.sleep(0.4)
        if page % 50 == 0:
            log.info(f"[enumerate_pub] page={page} names={len(names)}")
    return sorted(set(names))


async def enumerate_conda(session) -> list[str]:
    # conda-forge repodata has ALL packages. Merge noarch + linux-64 for completeness.
    names: set[str] = set()
    for subdir in ("noarch", "linux-64"):
        url = f"https://conda.anaconda.org/conda-forge/{subdir}/repodata.json"
        try:
            async with session.get(url, headers=HEADERS,
                                   timeout=aiohttp.ClientTimeout(total=600)) as r:
                r.raise_for_status()
                data = await r.json(content_type=None)
            packages = data.get("packages", {}) or {}
            packages_conda = data.get("packages.conda", {}) or {}
            for rec in list(packages.values()) + list(packages_conda.values()):
                n = rec.get("name")
                if n:
                    names.add(n)
            log.info(f"[enumerate_conda] {subdir}: running total={len(names)}")
        except Exception as e:
            log.warning(f"conda {subdir}: {e}")
    return sorted(names)


async def enumerate_swift(session) -> list[str]:
    """Swift Package Index — authoritative source is the packages.json export or sitemap."""
    names: set[str] = set()

    # Try packages.json export first (if available)
    for url in ("https://swiftpackageindex.com/api/packages.json",
                "https://raw.githubusercontent.com/SwiftPackageIndex/PackageList/main/packages.json"):
        try:
            async with session.get(url, headers={**HEADERS, "Accept": "application/json"},
                                   timeout=aiohttp.ClientTimeout(total=180)) as r:
                if r.status == 200:
                    data = await r.json(content_type=None)
                    if isinstance(data, list):
                        for item in data:
                            u = item if isinstance(item, str) else (
                                item.get("url") or item.get("repository") or "")
                            m = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?/?$", u or "")
                            if m:
                                names.add(f"{m.group(1)}/{m.group(2)}")
                    if names:
                        log.info(f"[swift] {url} -> {len(names)} names")
                        break
        except Exception as e:
            log.warning(f"swift {url}: {e}")

    # Sitemap fallback (covers /<owner>/<repo> pages)
    if len(names) < 100:
        for sm_url in ("https://swiftpackageindex.com/sitemap.xml",
                       "https://swiftpackageindex.com/sitemap-packages.xml"):
            try:
                async with session.get(sm_url, headers=HEADERS,
                                       timeout=aiohttp.ClientTimeout(total=120)) as r:
                    if r.status == 200:
                        txt = await r.text()
                        for m in re.finditer(r"swiftpackageindex\.com/([^/<\s]+)/([^/<\s]+)", txt):
                            owner, repo = m.group(1), m.group(2)
                            if owner.lower() in ("search", "packages", "keywords", "builds",
                                                 "api", "blog", "docs", "sitemap",
                                                 "sitemap-packages.xml", "sitemap.xml",
                                                 "add-a-package", "faq"):
                                continue
                            names.add(f"{owner}/{repo.rstrip('.git')}")
            except Exception as e:
                log.warning(f"swift {sm_url}: {e}")
    return sorted(names)


async def enumerate_cpan(session) -> list[str]:
    # Authoritative: 02packages.details.txt.gz - one line per module. Reduce to distributions.
    url = "https://www.cpan.org/modules/02packages.details.txt.gz"
    async with session.get(url, headers=HEADERS,
                           timeout=aiohttp.ClientTimeout(total=300)) as r:
        r.raise_for_status()
        blob = await r.read()
    txt = gzip.GzipFile(fileobj=io.BytesIO(blob)).read().decode("utf-8", errors="ignore")
    # Skip header block (up to blank line)
    body = txt.split("\n\n", 1)[-1]
    dists: set[str] = set()
    for line in body.splitlines():
        parts = line.split()
        if len(parts) < 3:
            continue
        path = parts[2]
        # path e.g. B/BU/BUFFALO/Dist-Name-1.00.tar.gz -> Dist-Name
        fn = path.rsplit("/", 1)[-1]
        fn = re.sub(r"\.(tar\.gz|tgz|zip|tar\.bz2)$", "", fn, flags=re.I)
        fn = re.sub(r"-v?\d[\d\._\-a-zA-Z]*$", "", fn)
        if fn:
            dists.add(fn)
    return sorted(dists)


async def enumerate_cocoapods(session) -> list[str]:
    # cdn.cocoapods.org/all_pods_versions_*.txt — authoritative list
    names: set[str] = set()
    for shard in "0123456789abcdef":
        url = f"https://cdn.cocoapods.org/all_pods_versions_{shard}_0_0.txt"
        try:
            async with session.get(url, headers=HEADERS,
                                   timeout=aiohttp.ClientTimeout(total=120)) as r:
                if r.status != 200:
                    continue
                txt = await r.text()
            for line in txt.splitlines():
                n = line.split("/", 1)[0].strip()
                if n:
                    names.add(n)
        except Exception as e:
            log.warning(f"cocoapods shard {shard}: {e}")
        await asyncio.sleep(0.2)
    return sorted(names)


async def enumerate_pypi(session) -> list[str]:
    """Top-N by downloads + PyPI Simple Index for breadth.

    Phase A: hugovk top-pypi-packages (~15k authoritative by download count).
    Phase B: PyPI Simple Index (HTML) — lists ALL ~600k pkgs. Parsed lazily
    so we can cap at TARGET without downloading everything.
    """
    target = int(os.environ.get("TARGET", "50000"))
    names: list[str] = []

    # Phase A — top-pypi-packages (priority by downloads)
    try:
        url = "https://hugovk.github.io/top-pypi-packages/top-pypi-packages.json"
        async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
            r.raise_for_status()
            data = await r.json(content_type=None)
        rows = data.get("rows") or data.get("packages") or data
        if isinstance(rows, list):
            for item in rows:
                n = item.get("project") if isinstance(item, dict) else item
                if n:
                    names.append(n)
        log.info(f"[enumerate_pypi] phase A (top): {len(names)}")
    except Exception as e:
        log.warning(f"top-pypi-packages: {e}")

    if len(names) >= target:
        return sorted(set(names))

    # Phase B — PyPI Simple Index for breadth (streams HTML). Cap by TARGET.
    try:
        seen_set = set(names)
        async with session.get(
            "https://pypi.org/simple/",
            headers={**HEADERS, "Accept": "text/html"},
            timeout=aiohttp.ClientTimeout(total=120),
        ) as r:
            r.raise_for_status()
            text = await r.text()
        # Parse <a href="/simple/<name>/">name</a>
        import re as _re
        # Lines are predictable: `    <a href="/simple/requests/">requests</a>`
        for m in _re.finditer(r'<a href="/simple/([^"/]+)/">', text):
            n = m.group(1).strip()
            if n and n not in seen_set:
                names.append(n)
                seen_set.add(n)
                if len(names) >= target:
                    break
        log.info(f"[enumerate_pypi] phase B (simple-index): total {len(names)}")
    except Exception as e:
        log.warning(f"pypi simple index: {e}")

    return sorted(set(names))


async def enumerate_cargo(session) -> list[str]:
    """crates.io downloads-sorted pagination."""
    names: list[str] = []
    target = int(os.environ.get("TARGET", "50000"))
    for page in range(1, 1 + (target // 100) + 1):
        url = f"https://crates.io/api/v1/crates?sort=downloads&per_page=100&page={page}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                crates = data.get("crates", [])
                if not crates:
                    break
                for c in crates:
                    n = c.get("id") or c.get("name")
                    if n:
                        names.append(n)
                if len(crates) < 100:
                    break
        except Exception as e:
            log.warning(f"cargo page {page}: {e}")
            break
        await asyncio.sleep(0.4)
        if page % 50 == 0:
            log.info(f"[enumerate_cargo] page={page} names={len(names)}")
        if len(names) >= target:
            break
    return sorted(set(names))


async def enumerate_nuget(session) -> list[str]:
    """NuGet V3 search paginated; take=1000 max per call."""
    names: list[str] = []
    target = int(os.environ.get("TARGET", "30000"))
    skip = 0
    while skip < target:
        url = f"https://azuresearch-usnc.nuget.org/query?q=&take=1000&skip={skip}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                items = data.get("data", [])
                if not items:
                    break
                for item in items:
                    n = item.get("id")
                    if n:
                        names.append(n)
                if len(items) < 1000:
                    break
        except Exception as e:
            log.warning(f"nuget skip={skip}: {e}")
            break
        skip += 1000
        await asyncio.sleep(0.4)
        if skip % 5000 == 0:
            log.info(f"[enumerate_nuget] skip={skip} names={len(names)}")
    return sorted(set(names))


async def enumerate_maven(session) -> list[str]:
    """Maven Central Solr paginated. Returns group:artifact strings."""
    names: list[str] = []
    target = int(os.environ.get("TARGET", "30000"))
    start = 0
    while start < target:
        url = f"https://search.maven.org/solrsearch/select?q=*:*&rows=200&start={start}&wt=json"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                docs = data.get("response", {}).get("docs", [])
                if not docs:
                    break
                for doc in docs:
                    g = doc.get("g")
                    a = doc.get("a")
                    if g and a:
                        names.append(f"{g}:{a}")
                if len(docs) < 200:
                    break
        except Exception as e:
            log.warning(f"maven start={start}: {e}")
            break
        start += 200
        await asyncio.sleep(0.5)
        if start % 2000 == 0:
            log.info(f"[enumerate_maven] start={start} names={len(names)}")
    return sorted(set(names))


async def enumerate_composer(session) -> list[str]:
    """Packagist /packages/list.json — returns ALL ~400k names. Take target slice."""
    names: list[str] = []
    target = int(os.environ.get("TARGET", "30000"))
    # Primary: Packagist list.json (all names)
    try:
        async with session.get("https://packagist.org/packages/list.json",
                               headers=HEADERS,
                               timeout=aiohttp.ClientTimeout(total=300)) as r:
            r.raise_for_status()
            data = await r.json(content_type=None)
        pkg_names = data.get("packageNames", [])
        log.info(f"[enumerate_composer] packagist list.json -> {len(pkg_names)} total names")
        # Take first TARGET to avoid processing 400k at once
        names = pkg_names[:target]
        if len(names) >= target:
            return sorted(set(names))
    except Exception as e:
        log.warning(f"composer list.json: {e}")
    # Fallback: ecosyste.ms
    for page in range(1, 1 + (target // 100) + 1):
        url = f"https://packages.ecosyste.ms/api/v1/registries/packagist.org/packages?per_page=100&page={page}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                if not isinstance(data, list) or not data:
                    break
                for item in data:
                    n = item.get("name")
                    if n:
                        names.append(n)
                if len(data) < 100:
                    break
        except Exception as e:
            log.warning(f"composer page {page}: {e}")
            break
        await asyncio.sleep(0.5)
        if page % 20 == 0:
            log.info(f"[enumerate_composer] page={page} names={len(names)}")
        if len(names) >= target:
            break
    return sorted(set(names))


async def enumerate_rubygems(session) -> list[str]:
    """bestgems.org — authoritative by total downloads."""
    names: list[str] = []
    target = int(os.environ.get("TARGET", "30000"))
    page = 1
    while len(names) < target:
        url = f"https://bestgems.org/api/v1/gems/total_ranking.json?per_page=100&page={page}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                if not isinstance(data, list) or not data:
                    break
                for item in data:
                    n = item.get("name")
                    if n:
                        names.append(n)
                if len(data) < 100:
                    break
        except Exception as e:
            log.warning(f"rubygems page {page}: {e}")
            break
        page += 1
        await asyncio.sleep(0.4)
        if page % 20 == 0:
            log.info(f"[enumerate_rubygems] page={page} names={len(names)}")
    # Fallback: RubyGems own API if bestgems fails
    if len(names) < 1000:
        for page in range(1, 1 + (target // 30) + 1):
            url = f"https://rubygems.org/api/v1/search.json?query=*&page={page}"
            try:
                async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                    if r.status != 200:
                        break
                    data = await r.json(content_type=None)
                    if not data:
                        break
                    for item in data:
                        n = item.get("name")
                        if n:
                            names.append(n)
            except Exception:
                break
            await asyncio.sleep(0.5)
    return sorted(set(names))


async def enumerate_npm(session) -> list[str]:
    """npm registry search with popularity=1.0 (paginated, 250/page, max ~10k results).
    Supplemented by ecosyste.ms for extra breadth.
    """
    names: list[str] = []
    target = int(os.environ.get("TARGET", "50000"))
    # Phase 1: npm registry search top by popularity
    for from_offset in range(0, 10000, 250):
        url = f"https://registry.npmjs.com/-/v1/search?text=boost-exact:false&size=250&popularity=1.0&from={from_offset}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                objs = data.get("objects", [])
                if not objs:
                    break
                for o in objs:
                    pkg = o.get("package", {})
                    n = pkg.get("name")
                    if n:
                        names.append(n)
                if len(objs) < 250:
                    break
        except Exception as e:
            log.warning(f"npm search from={from_offset}: {e}")
            break
        await asyncio.sleep(0.5)
        if from_offset % 2500 == 0:
            log.info(f"[enumerate_npm] search from={from_offset} names={len(names)}")
        if len(names) >= target:
            break
    # Phase 2: ecosyste.ms backfill (unsorted, but provides additional coverage)
    if len(names) < target:
        for page in range(1, 1 + ((target - len(names)) // 100) + 1):
            url = f"https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages?per_page=100&page={page}"
            try:
                async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                    if r.status != 200:
                        break
                    data = await r.json(content_type=None)
                    if not isinstance(data, list) or not data:
                        break
                    for item in data:
                        n = item.get("name")
                        if n:
                            names.append(n)
                    if len(data) < 100:
                        break
            except Exception:
                break
            await asyncio.sleep(0.5)
            if len(names) >= target:
                break
    return sorted(set(names))


async def enumerate_go(session) -> list[str]:
    """ecosyste.ms for Go modules — proxy.golang.org registry."""
    names: list[str] = []
    target = int(os.environ.get("TARGET", "30000"))
    for page in range(1, 1 + (target // 100) + 1):
        url = f"https://packages.ecosyste.ms/api/v1/registries/proxy.golang.org/packages?per_page=100&page={page}"
        try:
            async with session.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT) as r:
                if r.status != 200:
                    break
                data = await r.json(content_type=None)
                if not isinstance(data, list) or not data:
                    break
                for item in data:
                    n = item.get("name")
                    if n:
                        names.append(n)
                if len(data) < 100:
                    break
        except Exception as e:
            log.warning(f"go page {page}: {e}")
            break
        await asyncio.sleep(0.5)
        if page % 20 == 0:
            log.info(f"[enumerate_go] page={page} names={len(names)}")
        if len(names) >= target:
            break
    return sorted(set(names))


ENUMERATORS = {
    "homebrew": enumerate_homebrew,
    "cran": enumerate_cran,
    "hackage": enumerate_hackage,
    "hex": enumerate_hex,
    "pub": enumerate_pub,
    "conda": enumerate_conda,
    "swift": enumerate_swift,
    "cpan": enumerate_cpan,
    "cocoapods": enumerate_cocoapods,
    "pypi": enumerate_pypi,
    "cargo": enumerate_cargo,
    "nuget": enumerate_nuget,
    "maven": enumerate_maven,
    "composer": enumerate_composer,
    "rubygems": enumerate_rubygems,
    "npm": enumerate_npm,
    "go": enumerate_go,
}


# ═══════════════════════════════════════════════════════════════
# PROCESSING
# ═══════════════════════════════════════════════════════════════

async def get_existing_names(eco: str) -> set[str]:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch("SELECT LOWER(name) AS n FROM packages WHERE ecosystem=$1", eco)
    finally:
        await conn.close()
    return {r["n"] for r in rows}


async def _fetch_swift_via_github(session, owner_repo: str, gh_token: str | None) -> dict | None:
    """Custom Swift processor: resolve metadata directly from GitHub repo API."""
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "DepScope/1.0 (+https://depscope.dev)",
               "X-GitHub-Api-Version": "2022-11-28"}
    if gh_token:
        headers["Authorization"] = f"Bearer {gh_token}"
    owner, repo = owner_repo.split("/", 1)
    try:
        async with session.get(f"https://api.github.com/repos/{owner}/{repo}",
                               headers=headers, timeout=aiohttp.ClientTimeout(total=20)) as r:
            if r.status == 404:
                return None
            if r.status == 403:
                log.warning(f"[swift] GH rate-limit hit on {owner_repo}")
                return None
            if r.status != 200:
                return None
            repo_data = await r.json(content_type=None)
        # Latest release/tag
        latest_version = ""
        last_published = None
        try:
            async with session.get(f"https://api.github.com/repos/{owner}/{repo}/releases/latest",
                                   headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as r:
                if r.status == 200:
                    rel = await r.json(content_type=None)
                    latest_version = rel.get("tag_name") or ""
                    last_published = rel.get("published_at") or rel.get("created_at")
        except Exception:
            pass
        if not latest_version:
            try:
                async with session.get(f"https://api.github.com/repos/{owner}/{repo}/tags?per_page=1",
                                       headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as r:
                    if r.status == 200:
                        tags = await r.json(content_type=None)
                        if tags:
                            latest_version = tags[0].get("name") or ""
            except Exception:
                pass
        license_obj = repo_data.get("license") or {}
        lic = (license_obj.get("spdx_id") or license_obj.get("name") or "") if isinstance(license_obj, dict) else ""
        return {
            "ecosystem": "swift",
            "name": owner_repo,
            "latest_version": latest_version,
            "description": (repo_data.get("description") or "")[:500],
            "license": lic or "",
            "homepage": repo_data.get("homepage") or f"https://github.com/{owner_repo}",
            "repository": f"https://github.com/{owner_repo}",
            "downloads_weekly": 0,
            "first_published": repo_data.get("created_at"),
            "last_published": last_published or repo_data.get("pushed_at"),
            "maintainers_count": 1,
            "deprecated": repo_data.get("archived", False),
            "deprecated_message": "repository archived" if repo_data.get("archived") else None,
            "stars": repo_data.get("stargazers_count", 0),
            "forks": repo_data.get("forks_count", 0),
            "open_issues": repo_data.get("open_issues_count", 0),
        }
    except Exception as e:
        log.warning(f"[swift] {owner_repo}: {type(e).__name__}: {e}")
        return None


async def process_one(sem, eco, name, counters, session=None, gh_token=None):
    async with sem:
        try:
            if eco == "swift" and session is not None:
                pkg = await _fetch_swift_via_github(session, name, gh_token)
            else:
                pkg = await fetch_package(eco, name)
            if not pkg:
                counters["not_found"] += 1
                return
            latest = pkg.get("latest_version") or ""
            try:
                vulns = await fetch_vulnerabilities(eco, name, latest_version=latest)
            except Exception:
                vulns = []
            try:
                health = calculate_health_score(pkg, vulns)
                hscore = health.get("score", 0) if isinstance(health, dict) else int(health or 0)
            except Exception:
                health = None
                hscore = 0
            await save_package_to_db(pkg, hscore, vulns or [])
            try:
                await cache_set(f"check:{eco}:{name}", {
                    "package": name, "ecosystem": eco,
                    "latest_version": pkg.get("latest_version"),
                    "health": health if isinstance(health, dict) else {"score": hscore},
                    "vulnerabilities": {"count": len(vulns or [])},
                }, ttl=86400)
            except Exception:
                pass
            counters["ok"] += 1
        except asyncio.CancelledError:
            raise
        except Exception as e:
            counters["err"] += 1
            if counters["err"] < 10:
                log.warning(f"[{eco}] {name}: {type(e).__name__}: {e}")


async def main():
    eco = ECOSYSTEM
    if eco not in ENUMERATORS:
        log.error(f"Unknown ecosystem: {eco}. Available: {list(ENUMERATORS)}")
        sys.exit(1)

    log.info(f"START ecosystem={eco} concurrency={CONCURRENCY} limit={LIMIT or 'none'} skip_existing={SKIP_EXISTING}")

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        log.info("Enumerating full upstream registry...")
        t0 = time.time()
        all_names = await ENUMERATORS[eco](session)
        log.info(f"Enumerated {len(all_names)} upstream names in {int(time.time()-t0)}s")

        if SKIP_EXISTING:
            existing = await get_existing_names(eco)
            todo = [n for n in all_names if n.lower() not in existing]
            log.info(f"Existing in DB: {len(existing)}  |  New to ingest: {len(todo)}")
        else:
            todo = all_names
            log.info(f"SKIP_EXISTING=0 -> processing all {len(todo)}")

        if LIMIT > 0:
            todo = todo[:LIMIT]
            log.info(f"LIMIT applied -> processing first {len(todo)}")

        if not todo:
            log.info("Nothing to do.")
            return

        sem = asyncio.Semaphore(CONCURRENCY)
        counters = {"ok": 0, "not_found": 0, "err": 0}
        start = time.time()
        gh_token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")

        tasks = [asyncio.create_task(process_one(sem, eco, n, counters, session=session, gh_token=gh_token))
                 for n in todo]
        done = 0
        for t in asyncio.as_completed(tasks):
            await t
            done += 1
            if done % 200 == 0 or done == len(todo):
                el = max(int(time.time() - start), 1)
                rate = done / el
                eta = int((len(todo) - done) / max(rate, 0.01))
                log.info(f"[{eco}] {done}/{len(todo)}  ok={counters['ok']}  nf={counters['not_found']}  "
                         f"err={counters['err']}  rate={rate:.2f}/s  eta={eta//60}m{eta%60}s")

        log.info(f"DONE [{eco}] processed={done}  ok={counters['ok']}  "
                 f"not_found={counters['not_found']}  err={counters['err']}  "
                 f"elapsed={int(time.time()-start)}s")


if __name__ == "__main__":
    asyncio.run(main())
