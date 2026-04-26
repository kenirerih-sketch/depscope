# Mozilla MOSS Supply Chain — DepScope application draft

Target: **Mozilla Open Source Support (MOSS), Supply Chain track**.
Non-dilutive. Grants typically $10k - $50k. Focus: software supply
chain security tools that are open source.

Website: <https://www.mozilla.org/en-US/moss/> (check for open call
timing; MOSS cycles change year to year).

Backup targets if MOSS cycle is closed:
- **Open Tech Fund — Digital Integrity** (OTF)
- **Sovereign Tech Fund** (German government, EU-OK)
- **GitHub Accelerator for Open Source**

The draft below is phrased for MOSS but easily retargetable.

---

## Project name

**DepScope** — a free, zero-auth intelligence layer that stops AI
coding agents from installing non-existent or malicious packages.

## Elevator pitch

Every AI coding assistant today hallucinates package names — real
security studies measure 5-22% hallucination rates. Attackers register
the hallucinated names with malware; AI agents then auto-install them.
This is **slopsquatting** and it's happening now in production. DepScope
answers the AI's "does this package exist?" question authoritatively,
across 19 registries, in under 100ms, for free, with no signup.
Installed via MCP, it works with Claude, Cursor, Copilot, Windsurf,
Aider, Devin, Continue, and any future MCP client.

## What supply chain problem does it solve?

1. **Hallucinated-package auto-install** (slopsquatting): a verification
   layer between the LLM and the registry. Agent asks, DepScope
   answers, install only proceeds if the name exists. Measurable
   reduction of supply chain attacks that target LLM-generated code.
2. **Vulnerability-blind suggestion**: LLMs have a knowledge cutoff
   and don't know about post-cutoff CVEs. DepScope returns the CVE
   list at the time of query, enriched with CISA KEV and EPSS.
3. **Agent usage telemetry** (public interest): we publish aggregate,
   anonymised reports showing which AI clients are hallucinating what
   — a **first-of-its-kind public dataset** for the research and
   security community. License: CC0.

## Open source status

- Repository: `github.com/cuttalo/depscope` (public, [license])
- MCP server: `npm i @depscope/mcp` (MIT)
- Self-hostable via `docker-compose` (in progress as part of this
  grant scope)
- All data sources publicly licensed and attributed (see
  `DATA_SOURCES.md`).
- Dataset dumps: CC0.

## How MOSS funding would be used

Specifically, and **entirely spent on open-source sustainability**:

- **Developer time ($15k)** — primary maintainer at part-time for 6
  months to harden the service, add new ecosystems, respond to
  community PRs.
- **Security audit ($5k)** — external review of the MCP server +
  HTTP API (penetration test + supply-chain review of our own
  dependencies). Report made public.
- **Docker + Helm distribution ($3k)** — one-command self-host, so
  any organisation can run an internal mirror without trusting our
  hosted endpoint.
- **Content + dataset publication ($2k)** — Parquet/CSV tooling for
  the monthly hallucination dataset.
- **Infra + overhead ($5k)** — bare-metal server contract + S3
  backup + domains + trademark for defensive naming.
- **Total request: $30.000** over 6 months.

## Sustainability after the grant

- Free public tier remains free, forever (covered by paid tiers
  below).
- Paid Insights + Intelligence products for package maintainers and
  devtool companies who want their own analytics out of the
  DepScope aggregate view. Launching Q2/Q3 after MOSS grant.
- No equity sale planned; prior acqui-hire offer from a competitor
  was declined to keep the public dataset public.

## Key metrics (at time of application)

- 390k+ packages indexed across 19 registries (npm, PyPI, Cargo,
  Go, Composer, Maven, NuGet, RubyGems, Pub, Hex, Swift, CocoaPods,
  CPAN, Hackage, CRAN, Conda, Homebrew).
- 7.3k+ vulnerabilities enriched with CISA KEV + EPSS.
- 22 MCP tools published, compatible with every major MCP client.
- Zero-auth public HTTP API: `https://depscope.dev/api/check/{eco}/{pkg}`.
- Live hallucination capture: 336+ distinct fake packages recorded
  in the last 7 days.

## Risks and mitigations

- **GitHub / Cloudflare rate limiting**: we run a rotated token pool
  and have a second-CDN failover plan (documented in `RUNBOOK.md`).
- **Upstream registry outage**: aggressive Redis caching smooths
  30-60 minutes of outage; longer outages gracefully degrade to
  `status: stale`.
- **Abuse of the free API**: rate limit at 200 req/min/IP; we ban
  coordinated abusers but the threshold rarely bites real users.

## Team

- Vincenzo [surname], founder + primary engineer.
- Open invitation to research collaborators: any academic group
  measuring slopsquatting is welcome to co-author on our dataset.

## Contact

- `info@ideatagliolaser.it` (primary)
- `security@depscope.dev` (vulnerability reports)
- <https://depscope.dev>
- <https://github.com/cuttalo/depscope>

---

**APPLICATION READINESS**: ~80% ready. Fill in surname + legal
entity + confirm MOSS cycle is open when you submit.
