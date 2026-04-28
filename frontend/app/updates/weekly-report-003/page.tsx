import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, PageHeader, Section, Footer, Badge } from "../../../components/ui";

const TITLE = "Weekly Package Health Report #003";
const DESCRIPTION = "DepScope weekly snapshot \u2014 742,226 packages indexed, 17,306 vulnerabilities tracked, live numbers by ecosystem.";
const DATE_PUBLISHED = "2026-04-27";
const URL = "https://depscope.dev/updates/weekly-report-003";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: "DepScope",
    type: "article",
    publishedTime: DATE_PUBLISHED,
    authors: ["DepScope"],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
  robots: { index: true, follow: true },
};

const jsonLd = {"@context": "https://schema.org", "@type": "Article", "headline": "Weekly Package Health Report #003", "description": "DepScope weekly snapshot \u2014 742,226 packages indexed, 17,306 vulnerabilities tracked, live numbers by ecosystem.", "datePublished": "2026-04-27", "dateModified": "2026-04-27", "author": {"@type": "Organization", "name": "DepScope", "url": "https://depscope.dev"}, "publisher": {"@type": "Organization", "name": "DepScope"}, "mainEntityOfPage": {"@type": "WebPage", "@id": "https://depscope.dev/updates/weekly-report-003"}};

const HEALTH = [{"label": "Critical (< 40)", "count": 469779}, {"label": "Poor (40\u201359)", "count": 211300}, {"label": "Fair (60\u201379)", "count": 52357}, {"label": "Good (80+)", "count": 4862}, {"label": "Unknown", "count": 3928}];
const VULN = [{"eco": "pypi", "name": "apache-airflow", "vulns": 113, "dl": 4989379}, {"eco": "pypi", "name": "mlflow", "vulns": 68, "dl": 8636351}, {"eco": "pypi", "name": "ansible", "vulns": 68, "dl": 2766827}, {"eco": "pypi", "name": "pillow", "vulns": 62, "dl": 111052946}, {"eco": "conda", "name": "pillow", "vulns": 62, "dl": 235817}, {"eco": "npm", "name": "electron", "vulns": 48, "dl": 3333433}, {"eco": "pypi", "name": "gradio", "vulns": 47, "dl": 3629168}, {"eco": "npm", "name": "next", "vulns": 42, "dl": 36660402}, {"eco": "pypi", "name": "vllm", "vulns": 42, "dl": 1357742}, {"eco": "pypi", "name": "opencv-contrib-python", "vulns": 32, "dl": 1622038}, {"eco": "pypi", "name": "paddlepaddle", "vulns": 32, "dl": 396892}, {"eco": "npm", "name": "hono", "vulns": 26, "dl": 34332796}, {"eco": "rubygems", "name": "rubygems-update", "vulns": 25, "dl": 1212398}, {"eco": "nuget", "name": "Microsoft.AspNetCore.App.Runtime.win-x64", "vulns": 24, "dl": 698354}, {"eco": "nuget", "name": "Microsoft.AspNetCore.App.Runtime.win-x86", "vulns": 24, "dl": 125966}];
const ZOMBIES = [{"name": "mimic-fn", "dl": 104634494, "msg": "Renamed to mimic-function"}, {"name": "pkg-dir", "dl": 78515524, "msg": "Renamed to `package-directory`."}, {"name": "path-is-absolute", "dl": 76522592, "msg": "This package is no longer relevant as Node.js 0.12 is unmaintained."}, {"name": "find-cache-dir", "dl": 43023728, "msg": "Renamed to `find-cache-directory`."}, {"name": "System.Runtime.CompilerServices.Unsafe", "dl": 39264424, "msg": "This package is no longer actively maintained and shouldn't be referenced on .NET 7+. It is only required on older versions of .NET."}, {"name": "@types/uuid", "dl": 37084892, "msg": "This is a stub types definition. uuid provides its own type definitions, so you do not need this installed."}, {"name": "read-pkg-up", "dl": 36215965, "msg": "Renamed to read-package-up"}, {"name": "@babel/plugin-proposal-private-property-in-object", "dl": 35911668, "msg": "This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-private-property-in-ob"}, {"name": "no-case", "dl": 35124932, "msg": "Use `change-case`"}, {"name": "@types/eslint-scope", "dl": 31248791, "msg": "This is a stub types definition. eslint-scope provides its own type definitions, so you do not need this installed."}, {"name": "node-domexception", "dl": 30320105, "msg": "Use your platform's native DOMException instead"}, {"name": "p-finally", "dl": 29420367, "msg": "Deprecated"}, {"name": "camel-case", "dl": 28111822, "msg": "Use `change-case`"}, {"name": "param-case", "dl": 27137880, "msg": "Use `change-case`"}, {"name": "pascal-case", "dl": 24810966, "msg": "Use `change-case`"}];
const WORST = [{"name": "angular", "eco": "npm", "score": 11, "dl": 511102}, {"name": "SshNet.Security.Cryptography", "eco": "nuget", "score": 14, "dl": 715507}, {"name": "Microsoft.Extensions.PlatformAbstractions", "eco": "nuget", "score": 17, "dl": 1582143}, {"name": "System.Net.WebSockets.WebSocketProtocol", "eco": "nuget", "score": 18, "dl": 595697}, {"name": "Microsoft.Bcl", "eco": "nuget", "score": 20, "dl": 539891}, {"name": "Polly.Extensions.Http", "eco": "nuget", "score": 20, "dl": 2207320}, {"name": "@oclif/help", "eco": "npm", "score": 20, "dl": 687316}, {"name": "apollo-server-core", "eco": "npm", "score": 22, "dl": 978064}, {"name": "@types/moment-timezone", "eco": "npm", "score": 23, "dl": 633131}, {"name": "MediatR.Extensions.Microsoft.DependencyInjection", "eco": "nuget", "score": 23, "dl": 803274}];
const ECO = [{"eco": "nuget", "pkgs": 4258, "avg": 62.8, "dep": 218}, {"eco": "cargo", "pkgs": 20942, "avg": 59.0, "dep": 0}, {"eco": "maven", "pkgs": 692, "avg": 51.4, "dep": 0}, {"eco": "rubygems", "pkgs": 10231, "avg": 51.2, "dep": 0}, {"eco": "conda", "pkgs": 31938, "avg": 50.9, "dep": 0}, {"eco": "swift", "pkgs": 4684, "avg": 44.8, "dep": 230}, {"eco": "cocoapods", "pkgs": 493, "avg": 42.6, "dep": 0}, {"eco": "hackage", "pkgs": 18914, "avg": 42.2, "dep": 0}, {"eco": "pypi", "pkgs": 97345, "avg": 41.9, "dep": 0}, {"eco": "homebrew", "pkgs": 8200, "avg": 41.3, "dep": 207}, {"eco": "hex", "pkgs": 19268, "avg": 41.0, "dep": 1059}, {"eco": "cran", "pkgs": 23244, "avg": 40.7, "dep": 0}, {"eco": "npm", "pkgs": 312993, "avg": 38.0, "dep": 4458}, {"eco": "go", "pkgs": 23136, "avg": 37.8, "dep": 0}, {"eco": "composer", "pkgs": 44950, "avg": 37.4, "dep": 1327}, {"eco": "pub", "pkgs": 73900, "avg": 36.8, "dep": 3872}, {"eco": "cpan", "pkgs": 43102, "avg": 30.8, "dep": 0}];
const TOTAL_PACKAGES = 742226;
const TOTAL_VULNS = 17306;

function fmt(n: number) { return n.toLocaleString("en-US"); }

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={`Weekly Report #003 · Published ${DATE_PUBLISHED}`}
        title="The State of Package Health"
        description={`Snapshot of ${fmt(TOTAL_PACKAGES)} packages across 19 ecosystems.`}
        actions={<Badge variant="info">Weekly</Badge>}
      />
      <Section>
        <Card>
          <CardBody>
            <article className="max-w-3xl space-y-6">
              <p className="text-[var(--text-dim)] leading-7">
                Automated snapshot for report #003. The DepScope index tracks{' '}
                <strong>{fmt(TOTAL_PACKAGES)}</strong> packages and <strong>{fmt(TOTAL_VULNS)}</strong> vulnerabilities as of {DATE_PUBLISHED}.
                See <Link href="/updates/weekly-report-001" className="text-[var(--accent)] underline">report #001</Link> for methodology.
              </p>

              <h2 className="text-xl font-semibold mt-6">Health distribution</h2>
              <DataTable cols={[{k:"label",l:"Bucket"},{k:"count",l:"Count",r:true,f:fmt}]} rows={HEALTH} />

              <h2 className="text-xl font-semibold mt-6">Popular but vulnerable</h2>
              <DataTable cols={[{k:"eco",l:"Ecosystem",b:true},{k:"name",l:"Package",mono:true,link:(r:any)=>`/pkg/${r.eco}/${r.name}`},{k:"vulns",l:"Vulns",r:true},{k:"dl",l:"Weekly",r:true,f:fmt}]} rows={VULN} />

              <h2 className="text-xl font-semibold mt-6">Zombie packages</h2>
              <DataTable cols={[{k:"name",l:"Package",mono:true},{k:"dl",l:"Weekly",r:true,f:fmt},{k:"msg",l:"Why"}]} rows={ZOMBIES} />

              <h2 className="text-xl font-semibold mt-6">Worst health, popular</h2>
              <DataTable cols={[{k:"name",l:"Package",mono:true},{k:"score",l:"Health",r:true,danger:true},{k:"dl",l:"Weekly",r:true,f:fmt}]} rows={WORST} />

              <h2 className="text-xl font-semibold mt-6">Ecosystem comparison</h2>
              <DataTable cols={[{k:"eco",l:"Ecosystem"},{k:"pkgs",l:"Packages",r:true,f:fmt},{k:"avg",l:"Avg health",r:true,f:(x:number)=>x.toFixed(1)},{k:"dep",l:"Deprecated",r:true}]} rows={ECO} />

              <p className="text-[var(--text-dim)] text-sm mt-8">
                Previous reports: <Link href="/updates" className="text-[var(--accent)] underline">all updates</Link>.
                Raw data via <Link href="/api-docs" className="text-[var(--accent)] underline">API</Link>.
              </p>
            </article>
          </CardBody>
        </Card>
      </Section>
      <Footer />
    </>
  );
}

type Col = { k: string; l: string; r?: boolean; mono?: boolean; b?: boolean; link?: (row: any) => string; f?: (v: any) => string; danger?: boolean };
function DataTable({ cols, rows }: { cols: Col[]; rows: any[] }) {
  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-lg my-4">
      <table className="min-w-full text-sm">
        <thead><tr>
          {cols.map(c => <th key={c.l} className={`px-4 py-2 text-[11px] uppercase tracking-wider font-medium text-[var(--text-dim)] border-b border-[var(--border)] ${c.r ? "text-right" : "text-left"}`}>{c.l}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map(c => {
                const v = row[c.k];
                const display = c.f ? c.f(v) : String(v);
                const cls = `px-4 py-2 border-b border-[var(--border)] ${c.r ? "text-right tabular-nums" : ""} ${c.mono ? "font-mono" : ""} ${c.danger ? "text-red-500" : ""}`;
                return <td key={c.l} className={cls}>{
                  c.b ? <Badge variant="neutral">{display}</Badge> :
                  c.link ? <Link href={c.link(row)} className="text-[var(--accent)] hover:underline">{display}</Link> :
                  display
                }</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
