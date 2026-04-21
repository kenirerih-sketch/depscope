import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, PageHeader, Section, Footer, Badge } from "../../components/ui";

export const metadata: Metadata = {
  title: "Changelog & Updates — DepScope",
  description:
    "Release notes, new features, and infrastructure updates for DepScope. Follow the evolution of the free Package Intelligence API for AI agents.",
  openGraph: {
    title: "DepScope Changelog",
    description: "Release notes and new features for the Package Intelligence API.",
    url: "https://depscope.dev/updates",
    siteName: "DepScope",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "DepScope Changelog" },
  alternates: { canonical: "https://depscope.dev/updates" },
  robots: { index: true, follow: true },
};

interface Entry {
  date: string;
  title: string;
  badge?: string;
  body: string;
}

const ENTRIES: Entry[] = [
  {
    date: "2026-04-21",
    title: "depscope-cli on npm + GitHub Action",
    badge: "release",
    body: "Published `depscope-cli` to npm — `npx -y depscope-cli audit express request lodash` returns a prescriptive action list. Plus `cuttalo/depscope-audit-action@v1` to fail PRs on deprecated/malicious/CVE-active packages.",
  },
  {
    date: "2026-04-21",
    title: "AI-native endpoints: /api/ai/brief + /api/ai/stack + /api/migration",
    badge: "api",
    body: "Three new endpoints designed for LLM agents: 300-token compact brief, one-call stack audit (up to 50 pkgs), and curated migration paths with literal before/after code diffs. Token cost cut from ~6k per decision to ~300.",
  },
  {
    date: "2026-04-21",
    title: "23 MCP tools: ai_brief, audit_stack, get_migration_path",
    badge: "integration",
    body: "MCP server now exposes 23 tools (was 20). audit_stack replaces N per-package calls with one prescriptive verdict. get_migration_path returns ready-to-paste code diffs for 10 curated migrations (request→axios, moment→dayjs, urllib2→requests, flask→fastapi, ...).",
  },
  {
    date: "2026-04-21",
    title: "Threat intelligence: CISA KEV + EPSS + OpenSSF malicious",
    badge: "data",
    body: "Each vulnerability now carries in_kev (actively exploited per CISA), epss_prob (exploit probability), and threat_tier (theoretical/likely/actively_exploited). Malicious detection cross-checks 224k OpenSSF entries with a sanity guard that prevents false positives on mainstream packages.",
  },
  {
    date: "2026-04-21",
    title: "Multi-ecosystem coverage fixes",
    badge: "fix",
    body: "PyPI license now resolves via classifier+license_expression fallback (django, numpy, pandas no longer null). Maven POM parser inherits license/description from parent POM (Apache Commons, Spring, Netty). Go short names auto-resolve via GitHub search (gin → github.com/gin-gonic/gin).",
  },
  {
    date: "2026-04-19",
    title: "3 new verticals: Error Fix, Compat Matrix, Known Bugs",
    badge: "feature",
    body: "Added /explore/errors (searchable error → fix database), /explore/compat (stack compatibility matrix) and /explore/bugs (known bugs per version).",
  },
  {
    date: "2026-04-19",
    title: "12 new MCP tools for Claude Code and Cursor",
    badge: "integration",
    body: "Expanded MCP server from 8 to 20 tools. Agents can now query errors, compat stacks, bugs, trending data directly.",
  },
  {
    date: "2026-04-18",
    title: "Expanded to 17 ecosystems",
    badge: "infra",
    body: "Added Pub (Dart/Flutter), Hex (Elixir), Swift, CocoaPods, CPAN, Hackage, CRAN, Conda, Homebrew on top of npm, PyPI, Cargo, Go, Composer, Maven, NuGet, RubyGems.",
  },
  {
    date: "2026-04-17",
    title: "Package compare API: /api/compare/{eco}/{a,b,c}",
    badge: "api",
    body: "New endpoint returns side-by-side health, vulnerability and maintenance data for up to 10 packages with a recommended winner.",
  },
  {
    date: "2026-04-16",
    title: "Trending packages endpoint goes live",
    badge: "api",
    body: "Live trending data based on actual AI agent queries. Rank, weekly growth, ecosystem breakdown.",
  },
  {
    date: "2026-04-15",
    title: "14,700+ packages indexed",
    badge: "data",
    body: "Health score, vulnerabilities (OSV), maintainers, deprecation, license audit and bundle size for 14,700+ packages.",
  },
];

export default function UpdatesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": ENTRIES.map((e, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "NewsArticle",
        "headline": e.title,
        "datePublished": e.date,
        "description": e.body,
        "url": "https://depscope.dev/updates",
        "author": { "@type": "Organization", "name": "DepScope" },
      },
    })),
  };
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <PageHeader
          eyebrow="Changelog"
          title="What is new in DepScope"
          description="Product updates, infra improvements, new API endpoints, and integrations."
        />
        <Section>
          <div className="space-y-3">
            {ENTRIES.map((e) => (
              <Card key={e.date + e.title}>
                <CardBody>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <time className="text-xs text-[var(--text-dim)] font-mono">{e.date}</time>
                    {e.badge && <Badge variant="accent">{e.badge}</Badge>}
                  </div>
                  <h2 className="text-base font-semibold mb-1">{e.title}</h2>
                  <p className="text-sm text-[var(--text-dim)] leading-relaxed">{e.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Section>
        <Section>
          <p className="text-xs text-[var(--text-dim)]">
            Want updates in your feed? Subscribe to <Link className="text-[var(--accent)] hover:underline" href="/feed.xml">/feed.xml</Link>.
          </p>
        </Section>
        <Footer />
      </main>
    </div>
  );
}
