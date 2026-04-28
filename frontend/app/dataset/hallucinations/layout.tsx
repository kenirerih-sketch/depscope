// SEO_V2: Schema.org Dataset markup for /dataset/hallucinations.
// Conformant to Google Dataset Search requirements:
//  - name, description (>=50 chars), url
//  - license, creator
//  - distribution[] with encodingFormat + contentUrl
//  - variableMeasured for searchable fields
//  - keywords, datePublished, dateModified, version
import type { ReactNode } from "react";

const URL = "https://depscope.dev/dataset/hallucinations";

const datasetLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "DepScope AI Hallucination Corpus",
  alternateName: "DepScope Slopsquat Dataset",
  description:
    "Public corpus of package names that AI coding agents (Claude, ChatGPT, Cursor, Copilot, Aider, Windsurf, Cline, Continue, Codex) commonly hallucinate when suggesting npm install / pip install / cargo add. Updated daily from real agent traffic to depscope.dev plus research-documented patterns. Use this dataset to benchmark LLM hallucination rates with vs without DepScope guardrails. 19 ecosystems, public domain (CC0).",
  url: URL,
  identifier: URL,
  isAccessibleForFree: true,
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  creator: {
    "@type": "Organization",
    name: "Cuttalo srl",
    url: "https://depscope.dev",
    email: "depscope@cuttalo.com",
  },
  publisher: {
    "@type": "Organization",
    name: "DepScope",
    url: "https://depscope.dev",
  },
  keywords: [
    "AI hallucination",
    "slopsquat",
    "package hallucination",
    "supply chain security",
    "LLM safety",
    "AI agent",
    "npm typosquat",
    "PyPI typosquat",
    "code generation",
    "software supply chain",
  ],
  spatialCoverage: { "@type": "Place", name: "Worldwide" },
  temporalCoverage: "2025-04-01/..",
  datePublished: "2026-04-01",
  dateModified: new Date().toISOString().slice(0, 10),
  version: "1.0",
  variableMeasured: [
    { "@type": "PropertyValue", name: "ecosystem", description: "Registry the hallucinated name targets (npm, pypi, cargo, go, ...)" },
    { "@type": "PropertyValue", name: "package_name", description: "The exact name the AI agent invented" },
    { "@type": "PropertyValue", name: "source", description: "observed (real agent traffic) | research (literature) | pattern (algorithmic)" },
    { "@type": "PropertyValue", name: "evidence", description: "Short prose explaining why this entry was added" },
    { "@type": "PropertyValue", name: "first_seen_at", description: "ISO8601 timestamp of first observation" },
    { "@type": "PropertyValue", name: "hit_count", description: "Number of distinct API 404 lookups for this name" },
    { "@type": "PropertyValue", name: "likely_real_alternative", description: "The actual package the agent likely meant" },
  ],
  distribution: [
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: "https://depscope.dev/api/benchmark/hallucinations",
      name: "JSON full dump",
    },
    {
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: "https://depscope.dev/dataset/hallucinations/csv",
      name: "CSV export",
    },
  ],
  citation: "DepScope AI Hallucination Corpus. Cuttalo srl, 2026. https://depscope.dev/dataset/hallucinations",
  inLanguage: "en",
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "DepScope", item: "https://depscope.dev/" },
    { "@type": "ListItem", position: 2, name: "Datasets", item: "https://depscope.dev/dataset" },
    { "@type": "ListItem", position: 3, name: "Hallucination Corpus", item: URL },
  ],
};

export const metadata = {
  title: "AI Hallucination Corpus — DepScope Public Dataset",
  description: "Free CC0 dataset of npm/PyPI/Cargo/19-ecosystem package names that AI coding agents hallucinate. Daily updates from real Claude/ChatGPT/Cursor traffic. JSON + CSV download.",
  alternates: { canonical: URL },
  openGraph: {
    title: "AI Hallucination Corpus",
    description: "Public CC0 dataset of package names AI agents commonly invent. Daily updates, 19 ecosystems.",
    url: URL,
    type: "article",
    images: ["https://depscope.dev/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Hallucination Corpus",
    description: "Public CC0 dataset of names AI agents hallucinate. Daily updates.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {children}
    </>
  );
}
