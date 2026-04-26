# NGI Zero Entrust — DepScope application draft

Target: **NGI Zero Entrust** (Next Generation Internet, NLNet Foundation).
Covers "search, discovery and the discoverability of (...) the software
people run" + "trustworthy computing, data protection, privacy".
Non-dilutive. Typical grant: €5k - €50k. No equity, no ROI
expectation.

Call page: <https://nlnet.nl/entrust/>
Apply: <https://nlnet.nl/propose/>

Submission format: online form + PDF (short questions). Outline below
is ready to paste into the form, with minor editing.

---

## 1. Abstract (2-3 sentences)

DepScope is a free, zero-authentication API and MCP server that
prevents AI coding agents (Claude, Cursor, Copilot, Windsurf) from
recommending non-existent, unmaintained, or vulnerable software
packages. Already operational across 19 registries, it indexes 390k+
packages and captures hallucination signals that **no other public
dataset has**.

## 2. Why does the internet need this?

AI coding assistants now generate a significant share of published
software. Those assistants repeatedly hallucinate package names that
look plausible but don't exist — **slopsquatting attackers** register
the hallucinated names with malware, and AI agents auto-install them.
Recent studies (arXiv 2406.10279, 2501.19012) measure hallucination
rates at 5-22% of all package suggestions.

No public, free, ecosystem-spanning dataset exists of **which packages
AIs hallucinate, from which clients, how often**. DepScope collects
that signal as a side-effect of answering "does this package exist?"
calls, and publishes aggregates as a public good.

## 3. Concretely, what will you deliver under this grant?

1. **Hallucination Dataset v1** — CC0 monthly dump of hallucinated
   package names per ecosystem per week, anonymised (no per-caller
   data). Delivered as JSON + CSV + Parquet to
   `depscope.dev/data/hallucinations/`.
2. **Agent-client taxonomy** — open definition file classifying the
   User-Agent strings from known AI coding agents (Claude Code,
   Cursor, Windsurf, Copilot, Aider, Devin, Continue, ...). Published
   under CC-BY as `agent_ua_patterns.json`.
3. **Integration kit** — one-command `npx @depscope/mcp` stdio server
   + HTTP endpoint ready to plug into any MCP client. Already live,
   grant funds **hardening, docs, test matrix, release automation**.
4. **Academic co-authorship invitation** — open offer to cite/co-author
   a paper with any research group interested in slopsquatting
   measurement; DepScope provides longitudinal dataset access.

## 4. What will the grant pay for?

- 1x part-time developer (€25/hr × 40 hr/month × 6 months = **€6.000**)
- 1x part-time researcher/writer for dataset documentation and paper
  collaboration (€30/hr × 20 hr/month × 6 months = **€3.600**)
- Infra overhead: dedicated server upgrade (€150/month × 6 = **€900**)
  — we self-host, so costs are real machines not cloud markup.
- Security audit of MCP server (1 external consultant, 3 days =
  **€1.500**)
- Trademark + legal basics (**€1.200**)
- Buffer (**€800**)
- **Total request: ~€14.000** over 6 months.

## 5. Related work / prior art

- **Socket.dev**, **Snyk**, **Mend.io** — commercial SCA tools; do not
  release public hallucination or agent-usage data.
- **OSV**, **GitHub Advisory**, **CISA KEV** — upstream vuln sources we
  consume + redistribute properly attributed.
- **Context7** (Upstash) — injects live docs into LLM context; does
  not focus on existence/hallucination.
- **HalluCode, CloudAPIBench, Collu-Bench** — academic benchmarks for
  LLM code hallucination; we complement by measuring the **wild**, not
  curated test sets.

## 6. Open source status

All DepScope code is on `github.com/cuttalo/depscope` under [license
name]. Self-hostable on any commodity Linux + PostgreSQL. MCP server
published to npm as `@depscope/mcp` (MIT). No lock-in.

## 7. Track record

- DepScope launched publicly at `depscope.dev` in April 2026.
- As of this application:
  - 17 package registries fully indexed
  - 390k+ packages tracked
  - 7.3k+ vulnerabilities enriched with CISA KEV + EPSS
  - 336+ hallucinated-package queries captured (live)
  - 22 MCP tools published and integrated with Claude Desktop,
    Cursor, Windsurf, Copilot
  - Received (and declined) an acqui-hire offer from a well-known
    competitor in the space, validating that the dataset has
    commercial interest — but we believe it should remain a public
    good.

## 8. Timeline (6 months)

| Month | Milestone |
|-------|-----------|
| M1 | Infra hardening, multi-token pool, UTF8 migration, DB backup automation |
| M2 | Hallucination dataset v1 schema + first monthly dump |
| M3 | Agent-client taxonomy v1 + validation with 3 MCP clients |
| M4 | Security audit, bug bounty program launch |
| M5 | Research paper co-authorship (1-2 target venues) |
| M6 | Sustainability plan + next-grant application / paid tier |

## 9. Contact

- Lead: Vincenzo [surname], `info@ideatagliolaser.it` (primary)
- Operational: `privacy@depscope.dev` (GDPR/DPO), `security@depscope.dev`
- Company: Cuttalo srl (or SPI Operations Ltd), Italy
- Repo: <https://github.com/cuttalo/depscope>
- Website: <https://depscope.dev>

---

**APPLICATION READINESS**: the above is ~80% ready to paste. Fill in
surname, confirm legal entity, and adjust budget numbers if you want
to go higher/lower. Submit via <https://nlnet.nl/propose/>.
