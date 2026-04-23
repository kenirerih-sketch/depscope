# Data Sources — DepScope

Last audit: 2026-04-23.
Every data input DepScope uses, where it comes from, what terms apply,
how often we refresh, and how we treat it downstream.

## Principles

1. **Public-only**: we only query endpoints and files that the operator
   has explicitly made public. We never bypass authentication, never
   scrape behind logins, never evade rate limits.
2. **Authoritative-first**: where an upstream publishes a canonical
   bulk export (e.g. `02packages.details.txt.gz`, `PACKAGES.gz`), we
   use that instead of scraping search pages.
3. **ToS-checked**: each source below was reviewed for automated-use
   clauses. Sources that forbid automation or re-distribution are
   excluded (none below has that restriction).
4. **Attribution-preserving**: when we surface a field directly (e.g.
   a description string), it stays unaltered. When we compute derived
   values (health score, hallucination frequency), it's labelled as
   "DepScope-derived".
5. **Respectful crawl**: rate-limited, `User-Agent: DepScope/1.0
   (+https://depscope.dev)`, caches aggressively, exponential backoff
   on 429/5xx.

## 1. Package registries (ingestion)

| Ecosystem | Endpoint(s) | ToS OK? | Refresh | Notes |
|-----------|-------------|---------|---------|-------|
| npm | `registry.npmjs.com/-/v1/search`, `api.npmjs.org/downloads/*`, package metadata endpoints | Yes (npm TOS §5 permits automated reads) | daily + monthly full-sweep | |
| PyPI | `hugovk.github.io/top-pypi-packages/top-pypi-packages.json`, `pypi.org/pypi/{pkg}/json` | Yes | daily + monthly | hugovk dataset released under MIT |
| crates.io | `crates.io/api/v1/crates` | Yes (rate limit 1/s) | daily | |
| Cargo vulns | `crates.io/api/v1/crates/{name}/owners`, OSV | Yes | weekly | |
| Packagist | `packages.ecosyste.ms`, `packagist.org/packages/list.json` | Yes | monthly | |
| RubyGems | `bestgems.org/api/v1/*`, `rubygems.org/api/v1/*` | Yes | monthly | |
| NuGet | `azuresearch-usnc.nuget.org/query` | Yes | monthly | |
| Maven Central | `search.maven.org/solrsearch/select` | Yes | monthly | |
| Go modules | `packages.ecosyste.ms/api/v1/registries/proxy.golang.org/packages` | Yes | monthly | |
| CRAN | `crandb.r-pkg.org/-/allnames`, `cran.r-project.org/src/contrib/PACKAGES` | Yes (CRAN Policy §3 — automated reads OK) | monthly + metadata backfill |
| Conda-forge | `conda.anaconda.org/conda-forge/<subdir>/repodata.json` | Yes | monthly | |
| Homebrew | `formulae.brew.sh/api/formula.json` | Yes (official open endpoint) | monthly |
| Hackage | `hackage.haskell.org/packages/` | Yes | monthly |
| Hex.pm | `hex.pm/api/packages` | Yes (rate-limit 100/60s) | monthly at low concurrency |
| pub.dev | `pub.dev/api/package-names`, `pub.dev/api/search` | Yes | monthly |
| Swift Package Index | `raw.githubusercontent.com/SwiftPackageIndex/PackageList/main/packages.json` | Yes (MIT-licensed list) | monthly; metadata via GitHub API |
| CPAN | `www.cpan.org/modules/02packages.details.txt.gz` | Yes (authoritative open file) | monthly |
| CocoaPods | `cdn.cocoapods.org/all_pods_versions_*.txt` | Yes | monthly |

## 2. Vulnerability intelligence

| Source | URL | License / ToS | Refresh |
|--------|-----|---------------|---------|
| OSV | `api.osv.dev/v1/query` | CC-BY-4.0 (attributed) | weekly + ad-hoc |
| GitHub Advisory | `api.github.com/advisories` | CC-BY-4.0 | weekly |
| CISA KEV | `cisa.gov/.../known_exploited_vulnerabilities.json` | Public domain (US gov) | daily |
| EPSS | `epss.empiricalsecurity.com/csv` | CC-BY-4.0 | daily |

## 3. GitHub (repo stats)

- Endpoint: `api.github.com/repos/{owner}/{repo}` (+ releases / tags)
- Auth: personal access token (`GH_TOKEN`), 5000 req/hr quota.
- Usage: public-repo metadata only; no clone, no tree listing.
- Refresh: `fetch_github_stats` cron runs every 12 h on 50 packages/run,
  prioritising packages with missing or stalest `github_stats` row.
- Caveat: for Swift and Go, GitHub is the ONLY metadata source since
  neither ecosystem has a centralised registry with download counts.

## 4. Operational / infrastructure sources

- **Cloudflare** (`CF-Connecting-IP`, `CF-IPCountry` headers): used
  only to derive `ip_hash` (SHA-256 + salt) and the 2-letter country
  code. Raw IPs are never persisted. See
  [`PRIVACY.md`](./PRIVACY.md).
- **OVH S3** (`s3.gra.cloud.ovh.net/backup-cuttalo/restic`):
  encrypted Restic snapshots, EU region.

## 5. Data we deliberately do NOT collect

- Package source code, contents of tarballs (only metadata).
- Private or paid registries (no npm Enterprise, no Artifactory).
- GitHub private repos or any authenticated resource tied to a user
  beyond the DepScope organisation account.
- Any personally identifying information from upstream data (we
  sanitise emails out of `packages.data_json` at ingestion — see
  `scripts/scrub_emails.py`).

## 6. Attribution & re-use terms for consumers

Outputs from DepScope that include upstream fields verbatim inherit
the upstream license of that field (usually permissive / factual).
Downstream projects that republish large slices of our aggregate
dataset should credit **depscope.dev** and link back. Full dataset
dumps (planned, CC0-1.0) will be released at `depscope.dev/data/`.

## 7. Incident response

If a package maintainer believes we are misrepresenting their
package, or an upstream source revokes automated-use permission,
email `takedown@depscope.dev`. We process takedown requests within
5 business days and honour RFC 9116 `security.txt` at
`/.well-known/security.txt`.
