// SEO_V1: FAQ + WebPage schema for the "check package health" landing.
// Server component, composed above page.tsx without modification. Targets
// "People also ask" rich snippets in Google SERP.
import type { ReactNode } from "react";

const URL = "https://depscope.dev/check-package-health";

const FAQS = [
  {
    q: "How do I check if an npm package is safe before installing?",
    a: "Use DepScope: GET https://depscope.dev/api/check/npm/<package>. You get a JSON report with health score, current vulnerabilities, license risk, deprecation status, maintainer alerts and a recommendation (safe_to_use / do_not_use / find_alternative). For LLMs use /api/prompt/<eco>/<pkg> which returns plain text in ~150 tokens. Free, no auth required.",
  },
  {
    q: "What does the health score 0-100 mean?",
    a: "DepScope's health score is a composite of five signals: maintenance (recent commits, issue activity), popularity (downloads, stars), security (open CVEs, OSSF Scorecard), maturity (age, version count) and community (contributors, bus factor). 80+ is safe to adopt, 50–79 needs review, below 50 means high risk — usually deprecated or single-author abandoned packages.",
  },
  {
    q: "Does DepScope detect typosquats and malicious packages?",
    a: "Yes. Every check runs against the OSV malicious-package feed and a typosquat detector that combines a curated Levenshtein candidate table with runtime distance-2 matching against top-1M-downloads packages. Cross-ecosystem detection catches cases like reqeusts on npm being a typo of requests on PyPI.",
  },
  {
    q: "How do I check vulnerabilities in PyPI / Cargo / Maven / Go packages?",
    a: "DepScope supports 19 ecosystems: npm, PyPI, Cargo, Go, Composer (PHP), Maven, NuGet (.NET), RubyGems, Pub (Dart/Flutter), Hex (Elixir), Swift Package Manager, CocoaPods, CPAN (Perl), Hackage (Haskell), CRAN (R), conda-forge, Homebrew, JSR and Julia. Same API: GET /api/check/<ecosystem>/<package>.",
  },
  {
    q: "Is DepScope free? Do I need an API key?",
    a: "Yes, free for public endpoints, no authentication needed. Rate limit is 100 req/min per IP, 200 req/min for whitelisted AI agent UAs (ClaudeBot, GPTBot, Cursor, MCP-Client, Windsurf, Cline, Continue). For higher limits or commercial CI use, optional API keys are available.",
  },
  {
    q: "How is DepScope different from Snyk / Socket / npm audit?",
    a: "DepScope is built for AI agents calling endpoints autonomously: zero auth, plain-text /api/prompt endpoint that saves ~74% tokens vs JSON, MCP server for one-line install in Claude Code/Cursor, decision-ready recommendations (safe_to_use / do_not_use) instead of raw vulnerability lists. It is also free where Snyk and Socket are paid for serious use.",
  },
  {
    q: "Can DepScope catch hallucinated package names from AI coding assistants?",
    a: "Yes. /api/exists returns a sub-60ms boolean, /api/typosquat flags names within Levenshtein distance 2 of popular packages, and /api/benchmark/hallucinations exposes the public corpus of names that AI agents commonly invent. CI gating: block install if exists=false or typosquat is_suspected=true.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  url: URL,
  name: "Check Package Health — Free API for npm, PyPI, Cargo, Go and 16 More",
  description: "Free API to check if a package is safe before installing. Health score, vulnerabilities, typosquats, malicious flags, alternatives. 19 ecosystems. Built for AI coding agents.",
  inLanguage: "en",
  isPartOf: { "@type": "WebSite", name: "DepScope", url: "https://depscope.dev" },
  primaryImageOfPage: { "@type": "ImageObject", url: "https://depscope.dev/logo.png" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      {children}
    </>
  );
}
