# Reddit — 4 posts, staggered 2-4h apart (token-first)

Each subreddit: different rules, different tone. Read rules before posting.

---

## r/programming (3.9M) — link-only, strict

**Title:**
```
DepScope: a shared cache API that returns a 74%-smaller payload than raw registry JSON, so AI coding agents stop burning tokens on npm/PyPI metadata
```

**URL:** `https://depscope.dev`

**Self-text:** empty. After 20-30 min, top comment with technical context.

---

## r/ClaudeAI (130k) — token-talk hits hard

**Title:**
```
A 74%-smaller package-check endpoint for Claude — stop burning API tokens on raw npm JSON
```

**Self-text:**
```
Claude Desktop / Cursor / Claude Code all end up fetching raw npm/PyPI/
Cargo metadata to decide what package to install. That payload is ~3 KB
of keys the model mostly ignores — real tokens on your bill.

Shipped `depscope-mcp` — an MCP server that exposes a `/api/prompt`
endpoint returning a compact natural-language string ("express@5.2.1 is
safe · 11.2M weekly downloads · 0 CVEs · alternatives: fastify, hono")
instead of the full JSON. Roughly 74% smaller payload for the same
install decision. Also gives Claude live OSV + GitHub Advisory DB
lookups across 19 ecosystems — so it stops suggesting packages from
6-12 month stale training data.

Install:
`{"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}` (zero install) or `Remote MCP (zero install):
  {"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}
Or local stdio: npm install -g depscope-mcp`

Docs: https://depscope.dev/api-docs
Source: https://github.com/cuttalo/depscope

Open infrastructure, MIT. 20 MCP tools in total. Feedback welcome —
especially which tools actually get called in real dev workflows.
```

---

## r/node (330k)

**Title:**
```
A 74%-smaller API for AI agents to check npm packages — built the compact response so Claude/Cursor stop burning tokens
```

**Self-text:**
```
Every AI coding tool (Claude, Cursor, ChatGPT, Copilot) hits
`registry.npmjs.org` independently when picking a package. Raw registry
JSON is ~3 KB of keys the model doesn't actually need, per install
decision.

DepScope's `/api/prompt/npm/<pkg>` returns a compact string — same
install signal, ~74% smaller payload, less token burn per query. Also
live OSV + GHSA lookups so suggestions aren't stuck on 6-12 month old
training data.

- API: https://depscope.dev
- MCP server: `{"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}` (zero install) or `Remote MCP (zero install):
  {"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}
Or local stdio: npm install -g depscope-mcp`
- GitHub: https://github.com/cuttalo/depscope

Covers 19 ecosystems total. Open infrastructure, MIT. The MCP server
wires it into Claude Desktop, Cursor, Windsurf directly. Happy to answer
questions.
```

---

## r/MachineLearning (3M) — [P] flair mandatory

**Title:**
```
[P] A token-efficient shared cache between AI coding agents and package registries — 74% smaller payload vs raw registry JSON
```

**Self-text:**
```
Claude, ChatGPT, Cursor and Copilot each independently query npm/PyPI/
Cargo metadata when deciding which package to suggest — billions of
redundant calls a day, each parsing raw JSON the model doesn't need.

DepScope is a shared cache layer. Two angles for this audience:

1. **Token efficiency.** A `/api/prompt` endpoint returns a tight natural-
   language string instead of the registry JSON. ~74% smaller payload for
   the same install signal.

2. **Live data, not training cutoff.** OSV + GitHub Advisory Database
   exposed live, so agents stop hallucinating package names or missing
   CVEs that post-date their training.

MCP server for direct Claude/Cursor integration:
`npm i -g depscope-mcp`

- Docs: https://depscope.dev/api-docs
- GitHub: https://github.com/cuttalo/depscope

MIT, open infrastructure. 19 ecosystems. Feedback welcome.
```

---

## Timing

- T+0: r/programming (or r/ClaudeAI)
- T+2h: r/node
- T+4h: r/MachineLearning
- T+6h: r/ChatGPTCoding (use the r/ClaudeAI template, swap Claude → ChatGPT)

Peak hours 14:00-16:00 UTC.

## Rules
- Hook = TOKENS first.
- Never cross-post verbatim.
- No adoption/traffic numbers.
- Reply to every comment in first 1-2h.
