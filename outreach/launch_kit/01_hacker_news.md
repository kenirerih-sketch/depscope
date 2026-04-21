# Hacker News — Show HN

Post URL: https://news.ycombinator.com/submit

## Title (80 char max)
```
Show HN: DepScope – token-efficient package health API for AI coding agents
```

## URL (required)
```
https://depscope.dev
```

## First comment (post immediately after submission)

```
Hi HN — I'm Vincenzo, solo founder from Italy. Built this because millions
of AI coding agents recommend packages every day, and three things are
broken at once:

1. Tokens burned at scale. Every agent fetches raw registry JSON — ~3 KB
   of keys the model doesn't actually need — to make a single install
   decision. Repeated billions of times a day, it's real LLM input cost
   and real energy on the compute side.

2. Stale training data. 6-12 months cut off before the answer. Recent CVEs
   missed, deprecated libs pushed, occasional hallucinated package names
   that never existed.

3. No shared layer. Every agent hits the public registries independently,
   reinventing the lookup.

DepScope is a shared cache + live OSV + GitHub Advisory Database as an
API. A dedicated /api/prompt endpoint returns a ~74% smaller payload than
raw registry JSON for the same decision (natural-language string, not
JSON the model has to parse). MCP server ships on npm for Claude Desktop
/ Cursor integration. Covers 17 ecosystems (npm, PyPI, Cargo, Go, Maven,
NuGet, RubyGems, + 10 more).

Open infrastructure, MIT, EU-hosted.

Stack: FastAPI + PostgreSQL 17 + Redis. Package intelligence is
infrastructure, not a premium product — shared layer seemed the only
honest architecture for the core lookup.

GitHub: https://github.com/cuttalo/depscope

Happy to answer questions: architecture, how we pick OSV vs GHSA, the
false-positive problem (only showing vulns that affect the latest version),
MCP tool design, or anything else. Feedback welcome, especially harsh.
```

## Posting tips
- **Best time**: Tuesday/Wednesday 8-10am PT. Today (Mon 20 Apr) 12:00 UTC = 5am PT — early. Alternative: **15:00 UTC (8am PT)**.
- **First comment**: post the text above IMMEDIATELY after submission.
- **Reply to every comment in first 2h**.
- **Don't self-upvote**.
- **Never mention our own adoption/traffic numbers.** Only /api/prompt claim is fine — anyone can verify by curl'ing both endpoints.

## Safety
- Negative reception: engage respectfully, fix if valid.
- Flagged / buried: normal, move on.
