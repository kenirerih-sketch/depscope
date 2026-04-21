import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, PageHeader, Section, Footer, Badge } from "../../../components/ui";

const TITLE = "Weekly Package Health Report #002";
const DESCRIPTION = "DepScope weekly snapshot \u2014 22,588 packages indexed, 632 vulnerabilities tracked, live numbers by ecosystem.";
const DATE_PUBLISHED = "2026-04-20";
const URL = "https://depscope.dev/updates/weekly-report-002";

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

const jsonLd = {"@context": "https://schema.org", "@type": "Article", "headline": "Weekly Package Health Report #002", "description": "DepScope weekly snapshot \u2014 22,588 packages indexed, 632 vulnerabilities tracked, live numbers by ecosystem.", "datePublished": "2026-04-20", "dateModified": "2026-04-20", "author": {"@type": "Organization", "name": "DepScope", "url": "https://depscope.dev"}, "publisher": {"@type": "Organization", "name": "DepScope"}, "mainEntityOfPage": {"@type": "WebPage", "@id": "https://depscope.dev/updates/weekly-report-002"}};

const HEALTH = [{"label": "Critical (< 40)", "count": 3564}, {"label": "Poor (40\u201359)", "count": 9388}, {"label": "Fair (60\u201379)", "count": 7229}, {"label": "Good (80+)", "count": 2389}, {"label": "Unknown", "count": 18}];
const VULN = [{"eco": "npm", "name": "next", "vulns": 42, "dl": 34757357}, {"eco": "npm", "name": "angular", "vulns": 9, "dl": 524838}, {"eco": "conda", "name": "numpy", "vulns": 8, "dl": 425437}, {"eco": "pypi", "name": "lmdb", "vulns": 5, "dl": 893100}, {"eco": "pypi", "name": "paddlepaddle", "vulns": 5, "dl": 370918}, {"eco": "pypi", "name": "vllm", "vulns": 4, "dl": 3139157}, {"eco": "pypi", "name": "composio-core", "vulns": 4, "dl": 102346}, {"eco": "pypi", "name": "Pillow", "vulns": 3, "dl": 108511966}, {"eco": "pypi", "name": "pillow", "vulns": 3, "dl": 108511966}, {"eco": "conda", "name": "pillow", "vulns": 3, "dl": 235364}, {"eco": "cargo", "name": "rust-crypto", "vulns": 3, "dl": 216521}, {"eco": "pypi", "name": "pip", "vulns": 2, "dl": 128105971}, {"eco": "npm", "name": "react", "vulns": 2, "dl": 125187902}, {"eco": "npm", "name": "eslint-plugin-prettier", "vulns": 2, "dl": 27258312}, {"eco": "pypi", "name": "ujson", "vulns": 2, "dl": 21698954}];
const ZOMBIES = [{"name": "mimic-fn", "dl": 104431747, "msg": "Renamed to mimic-function"}, {"name": "pkg-dir", "dl": 78705523, "msg": "Renamed to `package-directory`."}, {"name": "path-is-absolute", "dl": 76082652, "msg": "This package is no longer relevant as Node.js 0.12 is unmaintained."}, {"name": "find-cache-dir", "dl": 42672386, "msg": "Renamed to `find-cache-directory`."}, {"name": "@types/uuid", "dl": 37184147, "msg": "This is a stub types definition. uuid provides its own type definitions, so you do not need this installed."}, {"name": "read-pkg-up", "dl": 36291504, "msg": "Renamed to read-package-up"}, {"name": "node-domexception", "dl": 35298273, "msg": "Use your platform's native DOMException instead"}, {"name": "no-case", "dl": 34918820, "msg": "Use `change-case`"}, {"name": "p-finally", "dl": 29798243, "msg": "Deprecated"}, {"name": "camel-case", "dl": 28182607, "msg": "Use `change-case`"}, {"name": "param-case", "dl": 27221685, "msg": "Use `change-case`"}, {"name": "pascal-case", "dl": 24504886, "msg": "Use `change-case`"}, {"name": "os-tmpdir", "dl": 24464495, "msg": "This is not needed anymore. `require('os').tmpdir()` in Node.js 4 and up is good."}, {"name": "snake-case", "dl": 20292295, "msg": "Use `change-case`"}, {"name": "lodash.isequal", "dl": 19136778, "msg": "This package is deprecated. Use require('node:util').isDeepStrictEqual instead."}];
const WORST = [{"name": "angular", "eco": "npm", "score": 8, "dl": 524838}, {"name": "level-concat-iterator", "eco": "npm", "score": 16, "dl": 571283}, {"name": "user-home", "eco": "npm", "score": 17, "dl": 2683639}, {"name": "trim-right", "eco": "npm", "score": 17, "dl": 3089154}, {"name": "crypto", "eco": "npm", "score": 17, "dl": 1537680}, {"name": "bin-version-check", "eco": "npm", "score": 20, "dl": 4092095}, {"name": "path-is-absolute", "eco": "npm", "score": 20, "dl": 76082652}, {"name": "scmp", "eco": "npm", "score": 20, "dl": 3755528}, {"name": "yaeti", "eco": "npm", "score": 20, "dl": 1263002}, {"name": "p-finally", "eco": "npm", "score": 20, "dl": 29798243}];
const ECO = [{"eco": "conda", "pkgs": 127, "avg": 69.3, "dep": 0}, {"eco": "pub", "pkgs": 169, "avg": 68.0, "dep": 2}, {"eco": "composer", "pkgs": 912, "avg": 64.2, "dep": 25}, {"eco": "npm", "pkgs": 11831, "avg": 60.5, "dep": 203}, {"eco": "pypi", "pkgs": 3482, "avg": 57.8, "dep": 5}, {"eco": "nuget", "pkgs": 715, "avg": 56.1, "dep": 23}, {"eco": "rubygems", "pkgs": 1263, "avg": 54.7, "dep": 0}, {"eco": "cargo", "pkgs": 1272, "avg": 49.6, "dep": 41}, {"eco": "hex", "pkgs": 302, "avg": 48.5, "dep": 69}, {"eco": "go", "pkgs": 422, "avg": 46.5, "dep": 1}, {"eco": "maven", "pkgs": 502, "avg": 42.3, "dep": 0}, {"eco": "cran", "pkgs": 309, "avg": 42.0, "dep": 0}, {"eco": "cpan", "pkgs": 477, "avg": 41.0, "dep": 0}, {"eco": "cocoapods", "pkgs": 139, "avg": 40.7, "dep": 0}, {"eco": "hackage", "pkgs": 300, "avg": 39.7, "dep": 0}, {"eco": "swift", "pkgs": 58, "avg": 33.7, "dep": 2}, {"eco": "homebrew", "pkgs": 290, "avg": 31.1, "dep": 2}];
const TOTAL_PACKAGES = 22588;
const TOTAL_VULNS = 632;

function fmt(n: number) { return n.toLocaleString("en-US"); }

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={`Weekly Report #002 · Published ${DATE_PUBLISHED}`}
        title="The State of Package Health"
        description={`Snapshot of ${fmt(TOTAL_PACKAGES)} packages across 17 ecosystems.`}
        actions={<Badge variant="info">Weekly</Badge>}
      />
      <Section>
        <Card>
          <CardBody>
            <article className="max-w-3xl space-y-6">
              <p className="text-[var(--text-dim)] leading-7">
                Automated snapshot for report #002. The DepScope index tracks{' '}
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
