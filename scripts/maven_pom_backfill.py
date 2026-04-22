#!/usr/bin/env python3
"""Fetch Maven POM for each artifact to populate description/license/url.

Maven Central POM URL:
  https://repo1.maven.org/maven2/<groupPath>/<artifactId>/<version>/<artifactId>-<version>.pom
where groupPath = groupId with dots replaced by slashes.

We try the latest known version per package and parse:
- <description>
- <licenses><license><name> (may have multiple)
- <url> or <scm><url>
"""
import asyncio
import re
import sys
import xml.etree.ElementTree as ET
sys.path.insert(0, "/home/deploy/depscope")

import aiohttp
from api.database import get_pool

NS = "{http://maven.apache.org/POM/4.0.0}"


def clean(el):
    if el is None or el.text is None:
        return ""
    return re.sub(r"\s+", " ", el.text).strip()


def parse_pom(xml_text):
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return {}
    out = {}
    # description
    out["description"] = clean(root.find(f"{NS}description")) or clean(root.find("description"))
    # licenses
    licenses = root.find(f"{NS}licenses") or root.find("licenses")
    if licenses is not None:
        names = []
        for lic in licenses.findall(f"{NS}license") + licenses.findall("license"):
            n = clean(lic.find(f"{NS}name")) or clean(lic.find("name"))
            if n:
                names.append(n)
        out["license"] = ", ".join(names[:3])  # cap to 3 license names
    # url (homepage)
    out["homepage"] = clean(root.find(f"{NS}url")) or clean(root.find("url"))
    # scm url (repository)
    scm = root.find(f"{NS}scm") or root.find("scm")
    if scm is not None:
        repo = clean(scm.find(f"{NS}url")) or clean(scm.find("url"))
        if repo:
            out["repository"] = repo
    return {k: v for k, v in out.items() if v}


async def fetch_pom(session, group_id, artifact_id, version):
    group_path = group_id.replace(".", "/")
    url = f"https://repo1.maven.org/maven2/{group_path}/{artifact_id}/{version}/{artifact_id}-{version}.pom"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as r:
            if r.status != 200:
                return None
            return await r.text()
    except Exception:
        return None


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, name, latest_version, license, description, repository, homepage
               FROM packages
               WHERE ecosystem = 'maven'
                 AND (
                   license = '' OR license IS NULL
                   OR description = '' OR description IS NULL
                   OR repository = '' OR repository IS NULL
                 )"""
        )
    print(f"{len(rows)} maven packages with missing metadata", flush=True)

    sem = asyncio.Semaphore(10)
    updated = 0
    missed = 0
    done = 0

    async with aiohttp.ClientSession() as session:
        async def one(p):
            nonlocal updated, missed, done
            async with sem:
                if ":" not in p["name"]:
                    missed += 1
                    done += 1
                    return
                group_id, artifact_id = p["name"].split(":", 1)
                version = p["latest_version"] or ""
                if not version:
                    missed += 1
                    done += 1
                    return
                xml = await fetch_pom(session, group_id, artifact_id, version)
                if not xml:
                    missed += 1
                    done += 1
                    return
                meta = parse_pom(xml)
                if not meta:
                    missed += 1
                    done += 1
                    return
                # Only overwrite fields that are currently empty
                sets = []
                args = [p["id"]]
                for k in ("description", "license", "homepage", "repository"):
                    if meta.get(k) and not p.get(k):
                        args.append(meta[k][:2000])
                        sets.append(f"{k} = ${len(args)}")
                if not sets:
                    done += 1
                    return
                async with pool.acquire() as conn:
                    await conn.execute(
                        f"UPDATE packages SET {', '.join(sets)}, updated_at=NOW() WHERE id=$1",
                        *args,
                    )
                updated += 1
                done += 1
                if done % 50 == 0:
                    print(f"  {done}/{len(rows)} updated={updated} missed={missed}", flush=True)

        await asyncio.gather(*[one(p) for p in rows])

    print(f"DONE updated={updated} missed={missed}", flush=True)


asyncio.run(main())
