# Mastodon + Indie Hackers + Hashnode + Discord (token-first)

## Mastodon — hachyderm.io

**Post (500 char):**
```
Shipped depscope.dev — a shared cache + live OSV/GHSA API so AI coding agents (Claude, Cursor, ChatGPT) stop burning tokens on raw registry JSON for every npm/PyPI/Cargo install decision.

/api/prompt endpoint returns a 74%-smaller payload for the same answer. 19 ecosystems. Open infrastructure, MIT.

`curl https://depscope.dev/api/prompt/npm/express`

MCP: `npm i -g depscope-mcp`

#supplychain #AI #opensource #devtools #mcp
```

---

## Anthropic Developer Discord / Cursor Discord / MCP channels

**Post (tokens-first, community tone):**
```
Hey — if you're burning tokens asking Claude/Cursor to `npm install xyz`
only to get suggestions from 6-12 month stale training data, this might
help.

Built `depscope-mcp` — MCP server that gives AI coding agents live OSV
+ GitHub Advisory DB lookups across 19 ecosystems (npm/PyPI/Cargo/...).
A /api/prompt endpoint returns a ~74% smaller payload than raw registry
JSON for the same install decision.

Install:
`{"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}` (zero install) or `Remote MCP (zero install):
  {"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}
Or local stdio: npm install -g depscope-mcp`

Or direct: `curl https://depscope.dev/api/prompt/npm/express`

Open infrastructure, MIT, EU-hosted.
GitHub: https://github.com/cuttalo/depscope

20 MCP tools total — feedback welcome on which ones actually get called
in real dev workflows.
```

---

## Indie Hackers

**Title:** `DepScope — token-efficient package intelligence API for AI coding agents`

**Body:**
```
Solo dev, shipped depscope.dev.

**The problem:**
Every AI coding agent — Claude, Cursor, ChatGPT, Copilot — makes install
decisions by fetching raw npm/PyPI/Cargo JSON. ~3 KB of keys the model
doesn't need, billions of times a day, real LLM cost. Plus the
suggestions themselves come from 6-12 month stale training — missed
CVEs, deprecated libs, hallucinated names.

**What it is:**
Shared cache + live OSV + GitHub Advisory DB as an API. A /api/prompt
endpoint returns a ~74% smaller payload than raw registry JSON for the
same install decision. MCP server on npm. 19 ecosystems.

**Stack:** FastAPI + PostgreSQL 17 + Redis. MIT. EU-hosted.

**Links:**
- https://depscope.dev
- https://github.com/cuttalo/depscope
- npm: `depscope-mcp`

Open infrastructure on the core lookup. Paid tiers for higher rate
limits planned — the core has to stay open since AI agents don't query
behind auth.
```

---

## Hashnode — crosspost canonical → Dev.to

- **Title:** "Your AI coding agent is burning tokens on stale npm metadata — the fix is a shared API"
- **Canonical URL:** `https://dev.to/depscope/<slug>`
- **Tags:** `ai`, `devtools`, `llm`, `opensource`, `mcp`
- **Body:** copy from Dev.to article

---

## Rules (everywhere)

- TOKENS first. Always the first sentence / paragraph.
- No adoption/download/traffic numbers of ours.
- Only /api/prompt claim (74% smaller) — verifiable by anyone with curl.
- Industry scale (millions, billions) fine — never ours.
