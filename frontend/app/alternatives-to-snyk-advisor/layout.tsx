// SEO_V1: FAQ + comparison schema for "alternatives to Snyk Advisor" landing.
import type { ReactNode } from "react";

const URL = "https://depscope.dev/alternatives-to-snyk-advisor";

const FAQS = [
  {
    q: "What is the best free alternative to Snyk Advisor?",
    a: "DepScope offers the same package-health insights as Snyk Advisor (health score, vulnerabilities, license risk, version recency) plus features Snyk does not have: AI-agent-optimized /api/prompt endpoint, MCP server for Claude Code/Cursor/VSCode, hallucination corpus, cross-ecosystem typosquat detection, decision-ready safe_to_use/do_not_use verdicts. Free, no signup, MIT license.",
  },
  {
    q: "Does DepScope cover the same ecosystems as Snyk?",
    a: "Yes — and more. DepScope covers 19 ecosystems: npm, PyPI, Cargo, Go modules, Composer (PHP), Maven, NuGet, RubyGems, Pub (Dart/Flutter), Hex (Elixir/Erlang), Swift Package Manager, CocoaPods, CPAN (Perl), Hackage (Haskell), CRAN (R), conda-forge, Homebrew, JSR and Julia. Snyk Advisor's free tier is npm/PyPI/Maven/Go heavy.",
  },
  {
    q: "How does DepScope's health score compare to Snyk's?",
    a: "Both score 0-100 on a multi-factor model. DepScope's factors: maintenance (recent commits, issues), popularity (downloads, stars), security (open CVEs + scorecard), maturity (age, releases), community (contributors, bus factor). Snyk's factors are similar but their score is closed-source. DepScope publishes the algorithm and breakdown per-package — auditable.",
  },
  {
    q: "Can I migrate from Snyk Advisor to DepScope?",
    a: "Yes — drop-in replacement at the API level. Snyk users typically replace `https://snyk.io/advisor/<eco>/<pkg>` with `https://depscope.dev/pkg/<eco>/<pkg>` for human review and `https://depscope.dev/api/check/<eco>/<pkg>` for CI. No auth, no rate limit on the free tier matching what most teams use.",
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
  name: "Free Alternative to Snyk Advisor — DepScope",
  description: "Open-source, free alternative to Snyk Advisor with broader ecosystem coverage and AI-agent-first APIs. 19 ecosystems, MCP server, hallucination corpus.",
  inLanguage: "en",
  isPartOf: { "@type": "WebSite", name: "DepScope", url: "https://depscope.dev" },
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
