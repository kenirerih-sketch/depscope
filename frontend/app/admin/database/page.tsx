"use client";
import { AdminShell, Card, Stat, Grid, Table, Pill } from "../AdminShell";
import { useAdminMany, asArray } from "../admin_hooks";

export default function DatabasePage() {
  const s = useAdminMany<{ pm: any; stats: any; intel: any }>({
    pm:    "/api/admin/plan-metrics",
    stats: "/api/stats",
    intel: "/api/admin/intelligence",
  });

  if (s.loading) return <AdminShell title="Database"><Card>Loading…</Card></AdminShell>;

  const pm = s.data.pm || {};
  const stats = s.data.stats || {};
  const intel = s.data.intel || {};

  const verticals = pm.verticals || {};
  const ecosystems = asArray(pm.ecosystems);

  return (
    <AdminShell title="Database"
      subtitle="Package coverage, vulnerabilities, data verticals"
      actions={<a href="/stats" target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: "var(--bg-hover)", color: "var(--text-dim)" }}>public /stats →</a>}>

      <Grid cols={4}>
        <Card><Stat label="Packages"        value={num(verticals.packages ?? stats.packages_indexed)} /></Card>
        <Card><Stat label="Vulnerabilities" value={num(verticals.vulnerabilities ?? stats.vulnerabilities_tracked)} /></Card>
        <Card><Stat label="Alternatives"    value={num(verticals.alternatives)} /></Card>
        <Card><Stat label="Known bugs"      value={num(verticals.known_bugs)} /></Card>
      </Grid>

      <div className="mt-6">
        <Card title="Coverage per ecosystem">
          {ecosystems.length === 0 ? <Empty /> :
            <Table
              headers={["eco", "packages", "vulns", "alts", "breaking", "bugs"]}
              rows={ecosystems
                .sort((a: any, b: any) => (b.packages || 0) - (a.packages || 0))
                .map((e: any) => [
                  <Pill key={e.ecosystem} color="blue">{e.ecosystem}</Pill>,
                  num(e.packages),
                  num(e.vulnerabilities),
                  num(e.alternatives),
                  num(e.breaking_changes),
                  num(e.known_bugs),
                ])}
            />
          }
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <Card title="Data verticals summary">
          <Table
            headers={["vertical", "rows"]}
            rows={[
              ["packages",         num(verticals.packages)],
              ["vulnerabilities",  num(verticals.vulnerabilities)],
              ["alternatives",     num(verticals.alternatives)],
              ["breaking_changes", num(verticals.breaking_changes)],
              ["known_bugs",       num(verticals.known_bugs)],
              ["errors",           num(verticals.errors)],
            ]}
          />
          <div className="mt-4 text-xs" style={{ color: "var(--text-faded)" }}>
            Plus: 224k+ OpenSSF malicious advisories · 1.5k+ CISA KEV · 99% CVEs EPSS-enriched
          </div>
        </Card>

        <Card title="Intelligence (last 7d)">
          <Table
            headers={["metric", "value"]}
            rows={[
              ["Total calls",        num(intel?.totals_7d?.calls_7d)],
              ["Unique sessions",    num(intel?.totals_7d?.sessions_7d)],
              ["Unique IPs",         num(intel?.totals_7d?.ips_7d)],
              ["Avg response ms",    intel?.totals_7d?.avg_ms_7d ?? "—"],
              ["Cache hit rate",     intel?.totals_7d?.cache_hit_rate_7d != null
                                    ? `${Math.round(intel.totals_7d.cache_hit_rate_7d * 100)}%` : "—"],
            ]}
          />
        </Card>
      </div>

      {Array.isArray(intel?.trending_packages) && intel.trending_packages.length > 0 && (
        <div className="mt-6">
          <Card title="Trending packages (week)">
            <Table
              headers={["rank", "eco", "package", "calls", "growth"]}
              rows={intel.trending_packages.slice(0, 15).map((p: any) => [
                p.rank ?? "—",
                <Pill key={p.package_name} color="blue">{p.ecosystem}</Pill>,
                p.package_name,
                num(p.call_count),
                p.week_growth_pct != null ? (
                  <Pill key="g" color={p.week_growth_pct > 0 ? "green" : "red"}>
                    {p.week_growth_pct > 0 ? "+" : ""}{p.week_growth_pct}%
                  </Pill>
                ) : "—",
              ])}
            />
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

function num(n: any) { return (Number(n) || 0).toLocaleString(); }
function Empty() {
  return <div className="text-xs" style={{ color: "var(--text-faded)" }}>No data.</div>;
}
