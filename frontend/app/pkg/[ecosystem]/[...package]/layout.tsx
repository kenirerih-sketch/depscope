// SEO_V1: per-package JSON-LD (SoftwareApplication + AggregateRating + BreadcrumbList).
// SEO_V2: also renders RelatedLinks block AFTER children (internal-link density).
// Server component composed ABOVE the page.tsx without modifying it.
import type { ReactNode } from "react";
import type { Metadata } from "next";
import RelatedLinks from "./related-links";

const API = "https://depscope.dev";

interface PkgData {
  package?: string;
  ecosystem?: string;
  latest_version?: string;
  description?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  downloads_weekly?: number;
  health?: { score?: number; risk?: string };
  vulnerabilities?: { count?: number; critical?: number; high?: number };
  recommendation?: { action?: string; summary?: string };
  metadata?: { last_published?: string; first_published?: string };
}

const ECO_LABEL: Record<string, string> = {
  npm: "Node.js (npm)", pypi: "Python (PyPI)", cargo: "Rust (crates.io)",
  go: "Go modules", composer: "PHP (Composer)", maven: "Java (Maven Central)",
  nuget: "C# (.NET)", rubygems: "Ruby", pub: "Dart/Flutter (pub)",
  hex: "Elixir/Erlang (Hex)", swift: "Swift Package Manager",
  cocoapods: "iOS (CocoaPods)", cpan: "Perl (CPAN)", hackage: "Haskell",
  cran: "R (CRAN)", conda: "Python (conda-forge)", homebrew: "macOS (Homebrew)",
  jsr: "JavaScript Registry (JSR)", julia: "Julia",
};

async function fetchPkg(ecosystem: string, pkg: string): Promise<PkgData | null> {
  try {
    const r = await fetch(`${API}/api/check/${ecosystem}/${encodeURIComponent(pkg)}`,
      { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    return (await r.json()) as PkgData;
  } catch { return null; }
}

interface Props {
  children: ReactNode;
  params: Promise<{ ecosystem: string; package: string[] }>;
}

// Per-package OG / Twitter metadata. Points to the dynamic image route handler.
export async function generateMetadata({ params }: { params: Promise<{ ecosystem: string; package: string[] }> }): Promise<Metadata> {
  const { ecosystem, package: parts } = await params;
  const pkg = decodeURIComponent(parts.join("/"));
  const url = `https://depscope.dev/pkg/${ecosystem}/${parts.map(encodeURIComponent).join("/")}`;
  // Existing OG image route at /og/pkg/{eco}/{...pkg} (route handler, not /api/* which proxies to Python)
  const ogUrl = `https://depscope.dev/og/pkg/${ecosystem}/${parts.map(encodeURIComponent).join("/")}`;
  const ecoLabel = ECO_LABEL[ecosystem] || ecosystem;
  return {
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `${pkg} — ${ecoLabel} package report`,
      description: `${pkg} package on ${ecoLabel} — health score, vulnerabilities, alternatives, security signals from DepScope.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${pkg} — DepScope report` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${pkg} — ${ecoLabel} package report`,
      description: `${pkg} health, vulnerabilities, alternatives. Free DepScope API.`,
      images: [ogUrl],
    },
  };
}

export default async function PackageLayout({ children, params }: Props) {
  const { ecosystem, package: pkgParts } = await params;
  const pkg = decodeURIComponent(pkgParts.join("/"));
  const data = await fetchPkg(ecosystem, pkg);
  const url = `https://depscope.dev/pkg/${ecosystem}/${pkgParts.map(encodeURIComponent).join("/")}`;
  const ecoLabel = ECO_LABEL[ecosystem] || ecosystem;

  // Build SoftwareApplication LD
  const softwareApp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: data?.package || pkg,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    url,
    softwareVersion: data?.latest_version,
    description: data?.description || `${pkg} package on ${ecoLabel} — health score, vulnerabilities, alternatives, and security signals from DepScope.`,
    license: data?.license,
    sameAs: [data?.homepage, data?.repository].filter(Boolean),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    datePublished: data?.metadata?.first_published,
    dateModified: data?.metadata?.last_published,
  };

  // AggregateRating from health score (0–100 → 1–5 stars).
  // Use downloads_weekly as ratingCount proxy (capped) so SERP shows confidence.
  if (data?.health?.score !== undefined && data?.downloads_weekly) {
    const stars = Math.max(1, Math.min(5, Math.round((data.health.score / 100) * 5)));
    softwareApp.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: stars.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: Math.max(1, Math.min(data.downloads_weekly, 1_000_000)),
    };
  }

  // Vulnerability summary as ItemList for "About" rich panel.
  const vulnCount = data?.vulnerabilities?.count ?? 0;
  if (data?.recommendation?.action) {
    softwareApp.applicationSubCategory = data.recommendation.action;
  }

  // BreadcrumbList: Home → Ecosystem hub → Package
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "DepScope", item: "https://depscope.dev/" },
      { "@type": "ListItem", position: 2, name: ecoLabel, item: `https://depscope.dev/for/${ecosystem}` },
      { "@type": "ListItem", position: 3, name: pkg, item: url },
    ],
  };

  // TechArticle wrapper — declares this page IS reference docs for the package
  const techArticle = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${pkg} — package health, vulnerabilities, alternatives (${ecoLabel})`,
    proficiencyLevel: "Beginner",
    about: { "@type": "SoftwareSourceCode", name: pkg, programmingLanguage: ecosystem },
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: "DepScope", url: "https://depscope.dev" },
    description: vulnCount > 0
      ? `${pkg} on ${ecoLabel}: ${vulnCount} known vulnerabilities. ${data?.recommendation?.summary || ""}`
      : `${pkg} on ${ecoLabel}: health, dependencies, alternatives, breaking changes. ${data?.recommendation?.summary || ""}`,
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticle) }} />
      {children}
      {/* SEO_V2: internal-link density block (renders null if nothing to link) */}
      <RelatedLinks ecosystem={ecosystem} pkg={pkg} />
    </>
  );
}
