# X / Twitter — launch thread (7 tweets, token-first)

Post account: @depscopedev (o il profilo Cuttalo).

## Thread

**1/** (hook — TOKENS)
```
Every AI coding agent — Claude, Cursor, ChatGPT, Copilot — makes install decisions by fetching 3 KB of raw registry JSON from npm/PyPI/Cargo.

Billions of times a day.

Most of those bytes are keys the model doesn't even need to read.

Real tokens, real dollars, real energy — at planet scale.
```

**2/** (second problem — stale training)
```
Second thing: the agent is choosing packages based on training data 6-12 months stale.

Missed CVEs. Deprecated libraries. Sometimes package names that never existed.

Every AI-suggested install is a blind supply-chain bet.
```

**3/** (third problem — no shared layer)
```
Third: every agent hits the registries independently.

Same fetch, billions of times, each model re-parsing the same JSON in parallel.

There's no shared cache, no shared source of truth. Infrastructure that should exist once, reinvented every session.
```

**4/** (solution)
```
Built depscope.dev — the shared layer.

OSV + GitHub Advisory Database as a live API.
A /api/prompt endpoint returns a 74%-smaller payload than raw registry JSON.
MCP server ships on npm.
17 ecosystems. Open infrastructure, MIT.

curl https://depscope.dev/api/prompt/npm/express
```

**5/** (integration)
```
For Claude Desktop / Cursor / Windsurf:

Remote MCP (zero install):
  {"mcpServers":{"depscope":{"url":"https://mcp.depscope.dev/mcp"}}}
Or local stdio: npm install -g depscope-mcp

Adds DepScope as an MCP tool. The agent calls it automatically before suggesting a package. 20 MCP tools.
```

**6/** (positioning)
```
Italian one-person team (Cuttalo srl, Taranto), MIT on GitHub, infra in Europe.

No paywall on the core lookup — AI agents won't query behind auth, and the whole point is they should query something.

Would rather be useful than premium.
```

**7/** (CTA)
```
Try it:
→ https://depscope.dev
→ npm i -g depscope-mcp
→ Github: https://github.com/cuttalo/depscope

Feedback welcome, especially the harsh kind.
```

## Timing
- Around **12:30 UTC** (after HN + Dev.to + email blast).
- Reply to every quote tweet in first 2h.
- Pin tweet 1 of the thread.

## Rules
- Hook = TOKENS first. Always.
- NO adoption numbers (calls, downloads, %).
- NO "after X days live".
- Industry scale only (millions, billions) — never ours.
