# Brand Defense — DepScope

Checklist to block the hackathon-namesake from poisoning future SEO
/ M&A / press. Execute in order; most items are low cost and high
insurance value.

**Total budget**: ~€1.500 one-time + ~€100/yr recurring.

---

## 1. Claim all handles (1h, €0)

Register **@depscope** (or `depscope-org`) everywhere users look.

- [ ] GitHub — `github.com/cuttalo/depscope` exists; also reserve
      `github.com/depscope` (org). Create empty org, add README pointing
      to cuttalo/depscope.
- [ ] npm — `npmjs.com/~depscope` (package `depscope-mcp` already ours;
      also register `depscope` org scope).
- [ ] PyPI — `pypi.org/user/depscope/`
- [ ] Crates.io — owner claim on any crate we publish
- [ ] Docker Hub — `hub.docker.com/u/depscope`
- [ ] X (Twitter) — `@depscope` or `@depscopeAI`
- [ ] LinkedIn — company page
- [ ] Reddit — `u/depscope` + subreddit `r/depscope`
- [ ] Hacker News — submit our depscope.dev when ready for first
      launch; claim the domain on HN submission history
- [ ] Product Hunt — reserve maker profile + post draft
- [ ] Mastodon (mas.to) — `@depscope@mas.to`
- [ ] Bluesky — `depscope.bsky.social`
- [ ] YouTube — channel `@DepScope`
- [ ] Slack community workspace — `depscope.slack.com`
- [ ] Discord server — `discord.gg/depscope`

---

## 2. Domain defense (30 min, ~€80/yr)

Register these aliases (auto-redirect to depscope.dev):

- [ ] `depscope.com` (commerce brand match, highest priority)
- [ ] `depscope.io` (developer-aesthetic)
- [ ] `depscope.ai` (AI angle)
- [ ] `depscope.app`
- [ ] `depscope.org` (non-profit halo for dataset dumps)
- [ ] `depscope.eu` (EU presence)

Registrar: Gandi or Namecheap. CNAME all to depscope.dev. Cost ~€80/yr
total for the set; each .com/.io is €12-18.

---

## 3. Trademark registration (2h prep, €1.200-2.500)

**Priority jurisdictions**: EU (EUIPO) + US (USPTO).

**Class**: 42 — scientific & technological services, software.

**Mark**: "DepScope" (word mark), plus the ◆ diamond logo if distinct.

**Steps**:

1. **Clearance search** (free):
   - EUIPO TMview: <https://www.tmdn.org/tmview/>
   - USPTO TESS: <https://tmsearch.uspto.gov/>
   - Google for "DepScope" and visually-similar (DepScope, Dep-Scope,
     DepsScope, DepoScope). Document absence of conflict. Note the
     Devpost hackathon and a couple of minor shell repos — these are
     NOT trademarked.
2. **Online filing**:
   - EUIPO: filing fee €850 for one class (word mark).
   - USPTO: $350/class (TEAS Plus) = €320.
   - Total filing: ~€1.200.
3. **Optional prosecution assistance** (if objections): engage EU/US
   trademark attorney for €300-800 response.
4. **Madrid Protocol** (international): only if we expand beyond EU/US.
   Skip for now, add later.

**Outcome**: we get preferential rights from filing date (protects
against later-filed marks including the hackathon dev if they ever
commercialise).

---

## 4. SEO dominance (4h, €0)

Goal: google `"depscope"` returns depscope.dev first 10 results.

- [ ] Wikipedia stub: minimum-viable, 5 refs (our blog, 2 registrations,
      a press pickup, an HN thread). Use Draft: namespace if new to
      avoid instant deletion. Include `{{Infobox software}}`.
- [ ] GitHub README SEO: canonical link to depscope.dev, mention
      ecosystems, 3-4 strong outbound backlinks.
- [ ] DEV.to account @depscope: 4 cross-post articles/month for 3
      months.
- [ ] Product Hunt launch (drives backlinks + reviews).
- [ ] 2-3 guest posts on devtool newsletters (Changelog, InfoQ, Daily
      Dev).
- [ ] Schema.org Organization + WebSite markup on `/` (already partial
      — verify with Google Rich Results test).
- [ ] Submit to sitemaps.org-compatible aggregators:
      publiccode.yes.io, alternativeto.net, awesome-mcp-servers.

---

## 5. Friendly reach-out to Devpost hackathon team (15 min, $500 max)

**Context**: `devpost.com/software/depscope` is a Feb 2026 hackathon
submission (Gemini multi-agent). It's NOT a company, has no ongoing
product.

**Script** (email to the team via Devpost profile):

> Hi — congrats on the DepScope hackathon entry! We run
> [depscope.dev](https://depscope.dev), a package intelligence API+MCP
> that predates (or closely coincides with) your submission. Our
> service now indexes 390k packages across 19 registries and serves
> thousands of MCP requests weekly.
>
> To avoid confusion, would you consider renaming your project? We'd
> be happy to send a $500 thank-you and/or credit you on our
> contributors page. Either way, we'll mention your hackathon project
> in our roadmap.
>
> No obligation — just a friendly heads-up.

**Outcome paths**:
- They rename → done, $500 goodwill.
- They ignore → we proceed with trademark; priority via filing date
  wins.
- They dispute → IP attorney (€300-500 letter) cites trademark
  application. Usually resolves.

---

## 6. Dispute escalation (only if needed)

Tier 1 (€0): polite email, cite our trademark filing + operational
scale.

Tier 2 (€300-500): EU or US IP attorney sends cease-and-desist letter,
CC: Devpost.

Tier 3 (€2k-10k): UDRP dispute or trademark opposition. **Do not
expect to need this.** The hackathon team won't commercialise a side
project.

---

## 7. Audit log

Every action here should be committed to repo history (this file) or
documented in a private `BRAND_ACTIONS.md` (not committed). Track:

| Date | Action | Cost | Result |
|------|--------|------|--------|
| 2026-04-23 | Initial checklist authored | €0 | ready |

---

## 8. Next 7-day agenda (recommended ordering)

1. Day 1 — handles (§1): 1h, €0
2. Day 1 — domains (§2): 30 min, €80
3. Day 2 — EUIPO + USPTO filing (§3): 2h + €1.200
4. Day 3-5 — SEO dominance (§4): 4h, €0
5. Day 6 — friendly reach-out to Devpost dev (§5): 15 min + $500 budget
6. Day 7 — review TM status, plan Madrid Protocol if business grows
