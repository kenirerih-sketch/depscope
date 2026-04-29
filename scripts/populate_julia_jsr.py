"""Bootstrap Julia + JSR — minimal package list ingest.
Julia: General registry (~10k packages) at https://github.com/JuliaRegistries/General
JSR:   API at https://api.jsr.io/packages
Uses existing api.registries.fetch_package — no API/MCP touched.
"""
import asyncio, sys, aiohttp, time, logging
sys.path.insert(0, "/home/deploy/depscope")
from api.registries import fetch_package, fetch_vulnerabilities, save_package_to_db
from api.health import calculate_health_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("bootstrap_julia_jsr")


async def list_julia_packages(session, limit=2000):
    """Julia General registry — list package names from registry-tree on GitHub."""
    url = "https://api.github.com/repos/JuliaRegistries/General/contents/J?per_page=100"
    names = []
    # Walk subdirs A-Z
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        try:
            async with session.get(f"https://api.github.com/repos/JuliaRegistries/General/contents/{letter}") as r:
                if r.status != 200:
                    continue
                items = await r.json()
                for it in items:
                    if it.get("type") == "dir":
                        names.append(it["name"])
                if len(names) >= limit:
                    break
        except Exception as e:
            log.warning(f"julia letter {letter}: {e}")
        await asyncio.sleep(0.5)  # gentle on GH
    return names[:limit]


async def list_jsr_packages(session, limit=1000):
    """JSR — paginated /packages API."""
    names = []
    page = 1
    while len(names) < limit:
        try:
            async with session.get(f"https://api.jsr.io/packages?page={page}&limit=100") as r:
                if r.status != 200:
                    break
                data = await r.json()
                items = data.get("items", [])
                if not items:
                    break
                for p in items:
                    scope = p.get("scope", "")
                    name = p.get("name", "")
                    if scope and name:
                        names.append(f"@{scope}/{name}")
                page += 1
                if len(items) < 100:
                    break
        except Exception as e:
            log.warning(f"jsr page {page}: {e}")
            break
    return names[:limit]


async def populate(eco, names):
    ok = fail = skip = 0
    for n in names:
        try:
            pkg = await fetch_package(eco, n)
            if not pkg:
                fail += 1
                continue
            vulns = await fetch_vulnerabilities(eco, n, pkg.get("latest_version"))
            health = calculate_health_score(pkg, vulns or [])
            await save_package_to_db(pkg, health.get("score", 0), vulns or [])
            ok += 1
            if ok % 50 == 0:
                log.info(f"{eco}: ok={ok} fail={fail}")
        except Exception as e:
            fail += 1
            log.warning(f"{eco}/{n}: {type(e).__name__}")
        await asyncio.sleep(0.2)
    log.info(f"{eco} DONE: ok={ok} fail={fail}")


async def main():
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout, headers={"User-Agent": "DepScope/1.0 (+https://depscope.dev)"}) as session:
        log.info("Listing Julia packages from JuliaRegistries/General...")
        julia_names = await list_julia_packages(session, limit=1500)
        log.info(f"Julia: {len(julia_names)} packages to fetch")

        log.info("Listing JSR packages from api.jsr.io...")
        jsr_names = await list_jsr_packages(session, limit=1000)
        log.info(f"JSR: {len(jsr_names)} packages to fetch")

    # Sequential to avoid registry 429s
    await populate("julia", julia_names)
    await populate("jsr", jsr_names)


if __name__ == "__main__":
    asyncio.run(main())
