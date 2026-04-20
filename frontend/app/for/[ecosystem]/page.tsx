import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Section, Card, CardBody, Badge, Footer } from "../../../components/ui";

type EcoMeta = {
  slug: string;
  name: string;          // e.g. "npm", "PyPI"
  lang: string;          // e.g. "JavaScript", "Python"
  registry: string;      // e.g. "registry.npmjs.org"
  exampleCheck: string;  // e.g. "express"
  exampleInstall: string; // e.g. "npm install express"
  cta: string;           // short pitch
};

const ECOS: Record<string, EcoMeta> = {
  npm:       { slug: "npm",       name: "npm",       lang: "JavaScript / Node.js", registry: "registry.npmjs.org",       exampleCheck: "express",             exampleInstall: "npm install express",                        cta: "Before any `npm install` — live CVE and deprecation checks for 3M+ packages." },
  pypi:      { slug: "pypi",      name: "PyPI",      lang: "Python",               registry: "pypi.org",                  exampleCheck: "django",              exampleInstall: "pip install django",                         cta: "Before any `pip install` — verify the package is safe, maintained, and not hallucinated." },
  cargo:     { slug: "cargo",     name: "Cargo",     lang: "Rust",                 registry: "crates.io",                 exampleCheck: "tokio",               exampleInstall: "cargo add tokio",                            cta: "Live supply-chain intelligence for every crate on crates.io." },
  go:        { slug: "go",        name: "Go",        lang: "Go",                   registry: "proxy.golang.org",          exampleCheck: "github.com/gin-gonic/gin", exampleInstall: "go get github.com/gin-gonic/gin",       cta: "Every Go module, live health and vulnerability lookup." },
  composer:  { slug: "composer",  name: "Composer", lang: "PHP",                  registry: "packagist.org",             exampleCheck: "laravel/framework",   exampleInstall: "composer require laravel/framework",          cta: "Packagist intelligence without hitting Packagist directly — cached, AI-agent-ready." },
  maven:     { slug: "maven",     name: "Maven Central", lang: "Java / Kotlin",   registry: "central.sonatype.org",      exampleCheck: "org.springframework.boot/spring-boot-starter", exampleInstall: "Maven/Gradle dependency", cta: "One API for every artifact in Maven Central." },
  nuget:     { slug: "nuget",     name: "NuGet",     lang: ".NET / C#",            registry: "nuget.org",                 exampleCheck: "Newtonsoft.Json",     exampleInstall: "dotnet add package Newtonsoft.Json",          cta: "NuGet package intelligence for AI coding assistants on .NET projects." },
  rubygems:  { slug: "rubygems",  name: "RubyGems",  lang: "Ruby",                 registry: "rubygems.org",              exampleCheck: "rails",               exampleInstall: "gem install rails",                           cta: "Every gem, live — no more stale training-data suggestions from your AI agent." },
  pub:       { slug: "pub",       name: "pub.dev",   lang: "Dart / Flutter",       registry: "pub.dev",                   exampleCheck: "http",                 exampleInstall: "dart pub add http",                           cta: "Flutter / Dart package intelligence for AI coding agents." },
  hex:       { slug: "hex",       name: "Hex",       lang: "Elixir",               registry: "hex.pm",                    exampleCheck: "ecto",                 exampleInstall: "mix deps.add ecto",                           cta: "Hex package intelligence — live vuln data for the Elixir ecosystem." },
  swift:     { slug: "swift",     name: "Swift Packages", lang: "Swift",           registry: "Swift Package Index",       exampleCheck: "vapor",                exampleInstall: "swift package add vapor",                     cta: "Swift Package Index intelligence, API-queryable." },
  cocoapods: { slug: "cocoapods", name: "CocoaPods", lang: "iOS / macOS",          registry: "cocoapods.org",             exampleCheck: "AFNetworking",         exampleInstall: "pod 'AFNetworking'",                          cta: "Every CocoaPod, live health and vuln check." },
  cpan:      { slug: "cpan",      name: "CPAN",      lang: "Perl",                 registry: "metacpan.org",              exampleCheck: "DateTime",             exampleInstall: "cpanm DateTime",                              cta: "CPAN module intelligence — live, API-queryable." },
  hackage:   { slug: "hackage",   name: "Hackage",   lang: "Haskell",              registry: "hackage.haskell.org",       exampleCheck: "lens",                 exampleInstall: "cabal install lens",                          cta: "Hackage package intelligence for the Haskell ecosystem." },
  cran:      { slug: "cran",      name: "CRAN",      lang: "R",                    registry: "cran.r-project.org",        exampleCheck: "dplyr",                exampleInstall: "install.packages('dplyr')",                   cta: "Every CRAN package, live vuln and health data." },
  conda:     { slug: "conda",     name: "Conda",     lang: "Data Science / Python",  registry: "anaconda.org",              exampleCheck: "scipy",                exampleInstall: "conda install scipy",                         cta: "Conda-forge intelligence for AI coding agents on data-science workloads." },
  homebrew:  { slug: "homebrew",  name: "Homebrew",  lang: "macOS / CLI tools",    registry: "formulae.brew.sh",          exampleCheck: "git",                  exampleInstall: "brew install git",                            cta: "Homebrew formulae intelligence — one API, every formula." },
};

export function generateStaticParams() {
  return Object.keys(ECOS).map(slug => ({ ecosystem: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ ecosystem: string }> }): Promise<Metadata> {
  const { ecosystem } = await params;
  const eco = ECOS[ecosystem];
  if (!eco) return {};
  return {
    title: `DepScope for ${eco.name} — live package intelligence for AI coding agents (${eco.lang})`,
    description: `${eco.cta} Live OSV + GitHub Advisory lookups for ${eco.name} (${eco.lang}). MCP server, free API, no auth.`,
    alternates: { canonical: `https://depscope.dev/for/${eco.slug}` },
    openGraph: {
      title: `DepScope for ${eco.name}`,
      description: eco.cta,
      url: `https://depscope.dev/for/${eco.slug}`,
    },
  };
}

export default async function EcosystemLanding({ params }: { params: Promise<{ ecosystem: string }> }) {
  const { ecosystem } = await params;
  const eco = ECOS[ecosystem];
  if (!eco) return notFound();

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          eyebrow={`For ${eco.lang}`}
          title={`DepScope for ${eco.name}`}
          description={eco.cta}
        />

        <Section title="The problem">
          <Card>
            <CardBody>
              <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                AI coding agents (Claude, Cursor, ChatGPT, Copilot) recommend{" "}
                <strong className="text-[var(--text)]">{eco.name}</strong> packages based on training data 6-12 months stale.
                Recent CVEs missed, deprecated libraries still suggested, package names sometimes hallucinated.
              </p>
              <p className="text-sm text-[var(--text-dim)] leading-relaxed mt-2">
                Every agent also queries <code className="bg-[var(--bg-soft)] px-1 rounded">{eco.registry}</code> independently — billions of redundant fetches a day, tokens burned parsing JSON the model doesn't need.
              </p>
            </CardBody>
          </Card>
        </Section>

        <Section title="One API call — live health, vulnerabilities, alternatives">
          <Card>
            <CardBody>
              <pre className="text-xs font-mono bg-[var(--bg-soft)] p-3 rounded overflow-x-auto">
{`curl https://depscope.dev/api/check/${eco.slug}/${eco.exampleCheck}`}
              </pre>
              <p className="text-xs text-[var(--text-dim)] mt-3">
                Returns a health score, list of live CVEs, deprecation flags, latest version, alternatives — all from OSV + GitHub Advisory Database, cached.
              </p>
              <p className="text-xs text-[var(--text-dim)] mt-3">
                For AI agents that prefer token-efficient responses:
              </p>
              <pre className="text-xs font-mono bg-[var(--bg-soft)] p-3 rounded overflow-x-auto mt-1">
{`curl https://depscope.dev/api/prompt/${eco.slug}/${eco.exampleCheck}`}
              </pre>
              <p className="text-xs text-[var(--text-dim)] mt-2">
                Same signal, much more compact payload — less input tokens per decision.
              </p>
            </CardBody>
          </Card>
        </Section>

        <Section title="Integrate in one line">
          <Card>
            <CardBody>
              <p className="text-sm text-[var(--text-dim)] mb-2">
                <Badge variant="neutral">Claude Desktop / Cursor</Badge> &nbsp;
                Remote MCP (zero install):
              </p>
              <pre className="text-xs font-mono bg-[var(--bg-soft)] p-3 rounded">
{`{ "mcpServers": { "depscope": { "url": "https://mcp.depscope.dev/mcp" } } }`}
              </pre>
              <p className="text-sm text-[var(--text-dim)] mb-2 mt-4">
                <Badge variant="neutral">Legacy stdio</Badge> &nbsp;
                Local MCP server on npm:
              </p>
              <pre className="text-xs font-mono bg-[var(--bg-soft)] p-3 rounded">
{`npm install -g depscope-mcp`}
              </pre>
              <p className="text-sm text-[var(--text-dim)] mb-2 mt-4">
                <Badge variant="neutral">GitHub Actions CI</Badge> &nbsp;
                Audit your {eco.name} dependencies on every PR:
              </p>
              <pre className="text-xs font-mono bg-[var(--bg-soft)] p-3 rounded">
{`- uses: cuttalo/depscope@main
  with:
    ecosystem: ${eco.slug}`}
              </pre>
              <p className="text-sm text-[var(--text-dim)] mt-4">
                <Badge variant="neutral">Any language</Badge> &nbsp; Just call the API. No auth, 200 req/min.
              </p>
            </CardBody>
          </Card>
        </Section>

        <Section title="Next steps">
          <Card>
            <CardBody>
              <div className="text-sm space-y-2">
                <div>
                  →{" "}
                  <Link href={`/api/check/${eco.slug}/${eco.exampleCheck}`} className="text-[var(--accent)] hover:underline">
                    Try the API now
                  </Link>{" "}
                  with {eco.exampleCheck}
                </div>
                <div>
                  →{" "}
                  <a href="https://github.com/cuttalo/depscope" className="text-[var(--accent)] hover:underline">
                    Source code on GitHub (MIT)
                  </a>
                </div>
                <div>
                  →{" "}
                  <Link href="/api-docs" className="text-[var(--accent)] hover:underline">
                    Full API documentation
                  </Link>
                </div>
                <div>
                  →{" "}
                  <Link href="/attribution" className="text-[var(--accent)] hover:underline">
                    Data attribution &amp; licenses
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        </Section>

        <p className="text-xs text-[var(--text-dim)] mt-8">
          Package intelligence is infrastructure. DepScope is the shared layer so every AI coding agent — and every developer — can rely on the same live data.
          Open infrastructure, MIT, EU-hosted.
        </p>
      </main>
      <Footer />
    </div>
  );
}
