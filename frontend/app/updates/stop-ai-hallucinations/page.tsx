import type { Metadata } from "next";
import { Card, CardBody, PageHeader, Section, Badge } from "../../../components/ui";

const TITLE = "Your coding agent installs packages that don't exist. Here's a free API that stops it in 5 minutes.";
const DESCRIPTION = "AI coding agents hallucinate package names 3-12% of the time. DepScope is a free API your agent calls before every install — verifies existence, vulnerabilities, deprecation, typosquats. MCP plug-in or system-prompt rule. 19 ecosystems, 742k packages, no auth, MIT.";
const DATE_PUBLISHED = "2026-04-27";
const URL = "https://depscope.dev/updates/stop-ai-hallucinations";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "DepScope", type: "article", publishedTime: DATE_PUBLISHED, authors: ["DepScope"], images: ["https://depscope.dev/og/article-cover.png"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["https://depscope.dev/og/article-cover.png"] },
  alternates: { canonical: URL },
  robots: { index: true, follow: true },
};

const jsonLd = { "@context": "https://schema.org", "@type": "Article", "headline": TITLE, "description": DESCRIPTION, "datePublished": DATE_PUBLISHED, "dateModified": DATE_PUBLISHED, "author": { "@type": "Organization", "name": "DepScope", "url": "https://depscope.dev" }, "publisher": { "@type": "Organization", "name": "DepScope" }, "mainEntityOfPage": { "@type": "WebPage", "@id": URL } };

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre className="rounded-md text-xs overflow-x-auto p-4 my-3"
         style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}>
      <code>{children}</code>
    </pre>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold mt-8 mb-3" style={{ color: "var(--text)" }}>{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-medium mt-6 mb-2" style={{ color: "var(--text)" }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-7 my-3" style={{ color: "var(--text-dim)" }}>{children}</p>;
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <img src="https://depscope.dev/og/article-cover.png" alt="DepScope: stop AI coding agent hallucinations" style={{ width: "100%", maxWidth: "1024px", margin: "0 auto", display: "block", borderRadius: "8px" }} />
      <PageHeader
        eyebrow={`Article · Published ${DATE_PUBLISHED}`}
        title="Your coding agent installs packages that don't exist."
        description="A free API that stops it in 5 minutes."
        actions={<Badge variant="info">DepScope</Badge>}
      />
      <Section>
        <Card>
          <CardBody>
            <article className="max-w-3xl space-y-2">

              <H2>TL;DR</H2>
              <P>Coding agents (Claude Code, Cursor, Cline, ChatGPT, Windsurf) hallucinate package names at a <strong>3-12% rate</strong> depending on the model. They suggest libraries that don&apos;t exist, libraries deprecated for years, and versions with active CVEs in CISA KEV.</P>
              <P><strong>DepScope</strong> is a free API that fixes exactly this. Your agent calls it before every install, gets a ~150-token plain-text verdict (<code>safe_to_use</code> / <code>do_not_use</code> / <code>update_required</code>), and stops misleading you.</P>
              <P>You have two ways to wire it up. Both below. Neither needs auth.</P>

              <H2>The problem in 30 seconds</H2>
              <P>Open your favorite agent and ask: <em>&quot;Add a library to the project that retries failing HTTP requests.&quot;</em></P>
              <P>The agent will reach for one of:</P>
              <ul className="list-disc ml-6 space-y-1 text-sm" style={{ color: "var(--text-dim)" }}>
                <li>✅ <code>axios-retry</code> — real, maintained, 5M weekly downloads</li>
                <li>⚠️ <code>request-retry</code> — exists, but built on top of <code>request</code>, deprecated since 2020</li>
                <li>❌ <code>fetch-retry-pro</code> — doesn&apos;t exist, the LLM made it up</li>
                <li>💀 <code>node-retry-extended</code> — typosquat with malicious payload (hypothetical pattern)</li>
              </ul>
              <P>The agent has no way to tell these four apart. It pattern-matches against training data; it doesn&apos;t query live registries, OSV, OpenSSF malicious-packages, or CISA KEV. It can&apos;t. DepScope can. And gives it to you for free.</P>

              <H2>What DepScope is</H2>
              <P>One API on top of a constantly-aggregated layer of:</P>
              <ul className="list-disc ml-6 space-y-1 text-sm" style={{ color: "var(--text-dim)" }}>
                <li><strong>19 ecosystems</strong> — npm, PyPI, Cargo, Go, Maven, NuGet, RubyGems, Composer, Pub, Hex, Swift, CocoaPods, CPAN, Hackage, CRAN, Conda, Homebrew, JSR, Julia</li>
                <li><strong>742,000+ packages</strong> indexed with health score 0-100</li>
                <li><strong>17,290 CVEs</strong> enriched with CISA KEV (exploited in the wild) + EPSS</li>
                <li><strong>OpenSSF malicious-packages</strong> stream</li>
                <li><strong>Typosquat detection</strong> — runtime + pre-computed (Levenshtein + cross-script homoglyphs)</li>
                <li><strong>Maintenance-mode KB</strong> — packages not marked <code>deprecated</code> on the registry but where maintainers have publicly declared maintenance mode (<code>moment</code>, <code>request</code>, <code>node-sass</code>)</li>
                <li><strong>Framework SDK detection</strong> — <code>pub/flutter</code>, <code>swift/SwiftUI</code>, <code>swift/UIKit</code> flagged as <code>framework_sdk</code></li>
                <li><strong>Rename suggestions</strong> — <code>tanstack-query → @tanstack/react-query</code></li>
                <li><strong>Hallucinated-version detector</strong> — <code>react@99.99.99</code> → <code>do_not_use, hallucinated_version</code></li>
              </ul>
              <P>No auth, no signup, 200 req/min anonymous, MIT.</P>

              <H2>Path 1 — MCP (drop-in, 30 seconds)</H2>
              <P>If your agent supports Model Context Protocol — Claude Desktop/Code, Cursor, Cline, Windsurf, Zed — drop this into your MCP config:</P>
              <Code>{`{
  "mcpServers": {
    "depscope": { "url": "https://mcp.depscope.dev/mcp" }
  }
}`}</Code>
              <P>Restart the agent. It now sees 22 tools — <code>check_package</code>, <code>check_bulk</code>, <code>check_typosquat</code>, <code>check_malicious</code>, <code>find_alternatives</code>, <code>compare_packages</code>, <code>pin_safe</code>, <code>get_vulnerabilities</code>, <code>resolve_error</code>, <code>scan_project</code>, and more. It invokes them autonomously when about to suggest a package. <strong>No <code>npm install -g</code>, no API key.</strong></P>

              <H2>Path 2 — System prompt rule (no MCP needed)</H2>
              <P>If your agent doesn&apos;t support MCP, or you want explicit control, add this to your system prompt / <code>CLAUDE.md</code> / <code>.cursorrules</code>:</P>
              <Code>{`PACKAGE INSTALL POLICY

Before suggesting any package install, fetch:
  https://depscope.dev/api/prompt/{ecosystem}/{package}

The response is a ~150-token plain-text brief with:
  - Verdict: safe_to_use | update_required | use_with_caution | do_not_use
  - Latest version
  - Active CVE count (latest version only, KEV-prioritized)
  - Top 3 alternatives if deprecated/risky
  - Health score 0-100

If the verdict is "do_not_use" OR the request returns 404:
  Do NOT suggest the install. Tell the user the package was
  not found / not safe and offer the suggested alternative.

Rule: 1 fetch per package name, max 5 packages per turn.
Cost: zero. No auth required.

Supported ecosystems: npm, pypi, cargo, go, composer, maven,
nuget, rubygems, pub, hex, swift, cocoapods, cpan, hackage,
cran, conda, homebrew, jsr, julia.`}</Code>
              <P>The agent now calls the API before every suggestion. Hits a 404 on <code>npm/fetch-retry-pro</code> → stops suggesting it. Gets <code>find_alternative · use axios or got</code> on <code>npm/request</code> → suggests the alternative instead.</P>

              <H2>Five concrete examples</H2>
              <Code>{`# Verify a package
curl https://depscope.dev/api/check/npm/express | jq .recommendation
# { "action": "safe_to_use", "summary": "express@5.1.0 is safe (health: 91/100)" }`}</Code>
              <Code>{`# LLM-optimized brief (~74% fewer tokens than raw registry JSON)
curl https://depscope.dev/api/prompt/pypi/requests`}</Code>
              <Code>{`PACKAGE pypi/requests@2.32.3  (Apache-2.0)
VERDICT: safe_to_use  HEALTH: 96/100
DOWNLOADS: 528,492,801 weekly
LAST PUBLISHED: 2025-05-29 (132 days ago)
VULNS_LATEST: 0  KEV_LATEST: 0
NOTE: De facto standard for HTTP in Python.`}</Code>
              <Code>{`# Lockfile audit in one call (transitive walk, blocks on KEV/malicious)
curl -X POST https://depscope.dev/api/scan -F file=@package-lock.json`}</Code>
              <Code>{`# Typosquat detection live
curl https://depscope.dev/api/check/npm/lodahs
# 404 + did_you_mean: lodash + typosquat: { likely_target: lodash, distance: 2 }`}</Code>
              <Code>{`# Hallucinated version caught
curl "https://depscope.dev/api/check/npm/react?version=99.99.99"
# recommendation.action: "do_not_use"
# reason: "hallucinated_version"`}</Code>

              <H2>CC0 hallucination benchmark</H2>
              <P>Benchmarking your own agent&apos;s hallucination rate? The corpus is yours, <strong>CC0</strong>, no attribution required:</P>
              <Code>{`curl "https://depscope.dev/api/benchmark/hallucinations?ecosystem=npm" | jq .entries`}</Code>
              <P>Each entry has <code>package_name</code>, <code>ecosystem</code>, <code>source</code> (<code>observed</code> from real agent traffic | <code>research</code> from literature | <code>pattern</code> algorithmic), <code>evidence</code>, <code>hit_count</code>, <code>likely_real_alternative</code>.</P>
              <P>The corpus self-updates: every 404 from a real agent goes into a queue, a worker dequeues every 10 minutes and either ingests the package (if it exists on the registry) or confirms &quot;doesn&apos;t exist&quot; with the right flag.</P>
              <P>Recent catches from live AI bot traffic include <code>npm/lоdash</code> (Cyrillic <code>о</code> — genuine homoglyph typosquat), <code>pypi/reqeusts</code> (typo of <code>requests</code>), and <code>npm/fetch-retry-pro</code> (pure LLM invention).</P>

              <H2>Three principles it&apos;s built on</H2>
              <ol className="list-decimal ml-6 space-y-2 text-sm" style={{ color: "var(--text-dim)" }}>
                <li><strong>Token-saving.</strong> The <code>/api/prompt</code> endpoint returns a pre-computed verdict in ~150 tokens vs ~8,500 of the raw registry JSON. For agents that hit package-check N times per session, that&apos;s 74% of context preserved per turn.</li>
                <li><strong>Energy-saving.</strong> One Cloudflare-cached call replaces 1 fetch × N agents. Aggregate once, serve everyone — including the cron jobs of agent vendors that already scrape this API as training ground-truth.</li>
                <li><strong>Security.</strong> CISA KEV + EPSS + OSV + OpenSSF malicious + typosquat detection in a single response. Pre-flight before every <code>npm install</code>.</li>
              </ol>

              <H2>Real numbers</H2>
              <Code>{`742,127  packages indexed across 19 ecosystems
 17,290  CVEs enriched with CISA KEV + EPSS
    724  curated alternatives (deprecated → replacement)
     14  historical supply-chain incidents
    729  pre-computed typosquat candidates`}</Code>

              <H2>Repo</H2>
              <P>All open source, MIT.</P>
              <ul className="list-disc ml-6 space-y-1 text-sm" style={{ color: "var(--text-dim)" }}>
                <li>API + frontend: <a href="https://github.com/cuttalo/depscope" className="text-[var(--accent)] underline">github.com/cuttalo/depscope</a></li>
                <li>MCP server (npm): <code>depscope-mcp</code></li>
                <li>GitHub Action: <a href="https://github.com/cuttalo/depscope-audit-action" className="text-[var(--accent)] underline">github.com/cuttalo/depscope-audit-action</a></li>
                <li>CLI: <code>npx depscope audit &lt;pkg&gt;...</code></li>
              </ul>
              <P><em>Built and maintained by <a href="https://cuttalo.com" className="text-[var(--accent)] underline">Cuttalo</a>, Italy. Free is free.</em></P>
            </article>
          </CardBody>
        </Card>
      </Section>
    </>
  );
}
