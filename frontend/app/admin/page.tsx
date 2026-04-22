"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardData {
  users: { id: number; email: string; role: string; plan: string; api_key: string; created_at: string }[];
  usage_by_day: { day: string; calls: number }[];
  usage_by_ecosystem: { ecosystem: string; calls: number }[];
  top_packages: { ecosystem: string; package_name: string; searches: number }[];
  top_agents: { agent: string; calls: number }[];
}

interface RealtimeStats {
  api_calls_total: number;
  api_calls_today: number;
  registered_users: number;
  packages_indexed: number;
  vulnerabilities_tracked: number;
  trending: { ecosystem: string; package: string; searches: number }[];
  ecosystems?: string[];
  ecosystem_counts?: Record<string, number>;
}

type ViewName = "all" | "active" | "humans";
type RangeName = "1d" | "7d" | "30d" | "90d" | "all";

interface OverviewView {
  calls: number;
  calls_24h: number;
  unique_ips: number;
  unique_countries: number;
  cache_hit_rate: number;
  error_rate: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
}

interface Overview {
  range: string;
  generated_at: string;
  filter_semantics: Record<ViewName, string>;
  views: Record<ViewName, OverviewView>;
  db: {
    packages: number;
    vulnerabilities: number;
    alternatives: number;
    errors: number;
    known_bugs: number;
    breaking_changes: number;
    compat_matrix: number;
  };
  users: { total: number; active_api_keys: number; subscriptions: Record<string, number> };
  revenue: { mrr_eur: number; paying_customers: number };
  coverage: {
    ecosystem: string;
    packages: number;
    vulnerabilities: number;
    alternatives: number;
    known_bugs: number;
    breaking_changes: number;
  }[];
}

interface DailyKpi {
  day: string;
  calls: number;
  cache_hit_rate: number;
  error_rate: number;
  unique_ips: number;
  avg_ms: number;
  p95_ms: number;
}

interface TimeSeries {
  range: string;
  view: ViewName;
  daily_kpis: DailyKpi[];
  heatmap: { dow: number; hour: number; n: number }[];
  by_endpoint: { endpoint: string; calls: number }[];
  by_source_day: Record<string, number | string>[];
  sources_seen: string[];
}

interface Insights {
  health_distribution: { range: string; bucket: number; count: number }[];
  vuln_severity: { severity: string; count: number }[];
  top_api_keys: {
    id: number;
    name: string;
    key_prefix: string;
    tier: string;
    user_email: string | null;
    requests_this_month: number;
    total_calls: number;
    last_used_at: string | null;
    created_at: string | null;
  }[];
  coverage_matrix: {
    ecosystem: string;
    packages: number;
    packages_with_vulns: number;
    packages_with_alternatives: number;
    packages_with_bugs: number;
    packages_with_breaking: number;
    avg_health: number;
    downloads_monthly: number;
  }[];
  suspect_browser_hours: { hour: string; calls: number; ips: number }[];
}

function Sparkline({ data, stroke = "#facc15", height = 32 }: { data: number[]; stroke?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-70">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Heatmap({ cells }: { cells: { dow: number; hour: number; n: number }[] }) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const c of cells) {
    if (c.dow >= 0 && c.dow < 7 && c.hour >= 0 && c.hour < 24) {
      grid[c.dow][c.hour] = c.n;
      if (c.n > max) max = c.n;
    }
  }
  const color = (n: number) => {
    if (!n) return "rgba(255,255,255,0.04)";
    const t = Math.log10(n + 1) / Math.log10(max + 1);
    const alpha = Math.max(0.1, Math.min(1, t));
    return `rgba(250,204,21,${alpha})`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex gap-1 ml-10 mb-1">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="w-4 text-[9px] text-[var(--text-dim)] text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {grid.map((row, dow) => (
          <div key={dow} className="flex gap-1 items-center">
            <div className="w-8 text-[10px] text-[var(--text-dim)] mr-2">{DOW_LABELS[dow]}</div>
            {row.map((n, h) => (
              <div
                key={h}
                className="w-4 h-4 rounded-sm border border-[var(--border)]/30"
                style={{ background: color(n) }}
                title={`${DOW_LABELS[dow]} ${h}:00 — ${n.toLocaleString()} calls`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[var(--bg-card)] rounded ${className}`} />
  );
}

function KpiSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

const NAV_TABS: { href: string; label: string }[] = [
  { href: "/admin",              label: "Overview" },
  { href: "/admin/launch",       label: "Launch" },
  { href: "/admin/plan",         label: "Plan" },
  { href: "/admin/intelligence", label: "Intelligence" },
  { href: "/admin/automation",   label: "Automation" },
];

const SOURCE_COLORS: Record<string, string> = {
  browser:    "#22c55e",
  claude:     "#f97316",
  claude_bot: "#fb923c",
  gpt:        "#06b6d4",
  gpt_bot:    "#38bdf8",
  cursor:     "#a855f7",
  mcp:        "#eab308",
  sdk:        "#ec4899",
  rapidapi:   "#14b8a6",
  unknown:    "#64748b",
};


interface PageViewsEntry { path: string; views: number }
interface PageViewsByDay { day: string; views: number; unique: number }
interface PageViewsByCountry { country: string; views: number }
interface PageViewsByReferrer { referrer: string; views: number }

interface PageViews {
  total: number;
  today: number;
  unique_today: number;
  by_page: PageViewsEntry[];
  by_day: PageViewsByDay[];
  by_country: PageViewsByCountry[];
  by_referrer: PageViewsByReferrer[];
}

const FLAG_MAP: Record<string, string> = {
  US: "🇺🇸", IT: "🇮🇹", CN: "🇨🇳", FI: "🇫🇮", IE: "🇮🇪",
  SG: "🇸🇬", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", JP: "🇯🇵",
  IN: "🇮🇳", BR: "🇧🇷", CA: "🇨🇦", AU: "🇦🇺", NL: "🇳🇱", NZ: "🇳🇿", KR: "🇰🇷", SE: "🇸🇪", ES: "🇪🇸", RU: "🇷🇺", MX: "🇲🇽", PL: "🇵🇱", TW: "🇹🇼", IL: "🇮🇱", AR: "🇦🇷", TH: "🇹🇭",
};

export default function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageviews, setPageviews] = useState<PageViews | null>(null);
  const [sources, setSources] = useState<Record<string, any> | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeries | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [range, setRange] = useState<RangeName>("7d");
  const [view, setView] = useState<ViewName>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) throw new Error("Access denied. Check your API key.");
      const data = await res.json();
      setDashboard(data);
      setAuthed(true);
      localStorage.setItem("ds_admin_key", apiKey);

      const [statsRes, pvRes, chartsRes, ovRes, srcRes, insRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: { "X-API-Key": apiKey } }),
        fetch("/api/admin/pageviews", { headers: { "X-API-Key": apiKey } }),
        fetch("/api/admin/charts", { headers: { "X-API-Key": apiKey } }),
        fetch(`/api/admin/overview?range=${range}`, { headers: { "X-API-Key": apiKey } }),
        fetch("/api/admin/sources", { headers: { "X-API-Key": apiKey } }),
        fetch("/api/admin/insights", { headers: { "X-API-Key": apiKey } }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (pvRes.ok) setPageviews(await pvRes.json());
      if (chartsRes.ok) setCharts(await chartsRes.json());
      if (ovRes.ok) setOverview(await ovRes.json());
      if (srcRes.ok) setSources(await srcRes.json());
      if (insRes.ok) setInsights(await insRes.json());
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!apiKey) return;
    setRefreshing(true);
    const errors: string[] = [];
    const endpoints: [string, string, (d: any) => void][] = [
      ["dashboard",               "/api/admin/dashboard",                           setDashboard],
      ["stats",                   "/api/admin/stats",                               setStats],
      ["pageviews",               "/api/admin/pageviews",                           setPageviews],
      ["sources",                 "/api/admin/sources",                             setSources],
      ["charts",                  "/api/admin/charts",                              setCharts],
      ["overview",               `/api/admin/overview?range=${range}`,              setOverview],
      ["insights",                "/api/admin/insights",                            setInsights],
      ["timeseries",             `/api/admin/timeseries?range=${range}&view=${view}`, setTimeseries],
    ];
    await Promise.all(
      endpoints.map(async ([name, url, setter]) => {
        try {
          const r = await fetch(url, { headers: { "X-API-Key": apiKey } });
          if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
          const data = await r.json();
          setter(data);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : `${name}: error`);
        }
      })
    );
    setFetchErrors(errors);
    setLastUpdated(new Date());
    setRefreshing(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("ds_admin_key");
    if (saved) {
      setApiKey(saved);
      setTimeout(() => {
        fetch("/api/admin/dashboard", { headers: { "X-API-Key": saved } })
          .then((r) => {
            if (r.ok) return r.json();
            throw new Error("expired");
          })
          .then((data) => {
            setDashboard(data);
            setAuthed(true);
            fetch("/api/admin/stats", { headers: { "X-API-Key": saved } }).then((r) => r.ok ? r.json() : null).then((d) => d && setStats(d));
            fetch("/api/admin/pageviews", { headers: { "X-API-Key": saved } }).then((r) => r.ok ? r.json() : null).then((d) => d && setPageviews(d));
            fetch("/api/admin/sources", { headers: { "X-API-Key": saved } }).then((r) => r.ok ? r.json() : null).then((d) => d && setSources(d));
            fetch("/api/admin/charts", { headers: { "X-API-Key": saved } }).then((r) => r.ok ? r.json() : null).then((d) => d && setCharts(d));
            fetch(`/api/admin/overview?range=${range}`, { headers: { "X-API-Key": saved } }).then((r) => r.ok ? r.json() : null).then((d) => { if (d) { setOverview(d); setLastUpdated(new Date()); } });
            fetch("/api/admin/insights", { headers: { "X-API-Key": saved } }).then((r) => r.ok ? r.json() : null).then((d) => d && setInsights(d));
          })
          .catch(() => localStorage.removeItem("ds_admin_key"));
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch overview + timeseries whenever range or view changes
  useEffect(() => {
    if (!authed || !apiKey) return;
    Promise.all([
      fetch(`/api/admin/overview?range=${range}`, { headers: { "X-API-Key": apiKey } }).then(r => r.ok ? r.json() : null),
      fetch(`/api/admin/timeseries?range=${range}&view=${view}`, { headers: { "X-API-Key": apiKey } }).then(r => r.ok ? r.json() : null),
    ]).then(([ov, ts]) => {
      if (ov) { setOverview(ov); }
      if (ts) { setTimeseries(ts); }
      setLastUpdated(new Date());
    });
  }, [range, view, authed, apiKey]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [authed, apiKey]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 gradient-text">DepScope Admin</h1>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin API Key (ds_admin_...)"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-[var(--accent)] text-black font-semibold py-3 rounded-lg hover:bg-[var(--accent-dim)] transition disabled:opacity-50"
          >
            {loading ? "..." : "Login"}
          </button>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <h1 className="text-3xl font-bold gradient-text">DepScope Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] transition disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={() => { setAuthed(false); localStorage.removeItem("ds_admin_key"); }}
              className="text-sm px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Primary tab bar (sub-pages) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-2 border-b border-[var(--border)]">
          {NAV_TABS.map((t) => {
            const active = typeof window !== "undefined" && window.location.pathname === t.href;
            return (
              <a
                key={t.href}
                href={t.href}
                className={`text-sm px-3 py-1.5 rounded-md transition ${
                  active
                    ? "bg-[var(--accent)] text-black font-medium"
                    : "text-[var(--text-dim)] hover:text-white hover:bg-[var(--bg-card)]"
                }`}
              >
                {t.label}
              </a>
            );
          })}
          <div className="ml-auto flex gap-2">
            <a href="/agent" className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-white transition">Marketing Agent →</a>
            <a href="/mission-control" className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-white transition">Mission Control →</a>
          </div>
        </div>

        {/* Error banner — one per failing endpoint */}
        {fetchErrors.length > 0 && (
          <div className="card p-4 mb-6 border border-red-500/40 bg-red-500/5">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-red-400 mb-2">
                  {fetchErrors.length} endpoint{fetchErrors.length > 1 ? "s" : ""} failed to load
                </div>
                <ul className="text-xs text-[var(--text-dim)] space-y-1">
                  {fetchErrors.map((e, i) => (
                    <li key={i} className="font-mono">· {e}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setFetchErrors([])}
                className="text-xs text-[var(--text-dim)] hover:text-white"
              >
                dismiss
              </button>
            </div>
          </div>
        )}

        {/* Unified Overview — Range picker + View tabs + KPI grid */}
        {!overview && authed && (
          <div className="mb-8">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
            </div>
          </div>
        )}
        {overview && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                {(["1d", "7d", "30d", "90d", "all"] as RangeName[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
                      range === r
                        ? "bg-[var(--accent)] text-black"
                        : "text-[var(--text-dim)] hover:text-white"
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                {(["all", "active", "humans"] as ViewName[]).map((vn) => (
                  <button
                    key={vn}
                    onClick={() => setView(vn)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition capitalize ${
                      view === vn
                        ? "bg-[var(--green)] text-black"
                        : "text-[var(--text-dim)] hover:text-white"
                    }`}
                    title={overview.filter_semantics[vn]}
                  >
                    {vn}
                  </button>
                ))}
              </div>
              <div className="text-xs text-[var(--text-dim)] ml-auto">
                {overview.filter_semantics[view]}
                {lastUpdated && (
                  <span className="ml-3">· updated {lastUpdated.toLocaleTimeString()}</span>
                )}
              </div>
            </div>

            {/* Traffic KPIs — change with range + view, include sparklines from timeseries */}
            {(() => {
              const v = overview.views[view];
              const daily = timeseries?.daily_kpis ?? [];
              const sparkCalls = daily.map((d) => d.calls);
              const sparkIps = daily.map((d) => d.unique_ips);
              const sparkCache = daily.map((d) => d.cache_hit_rate * 100);
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="card p-5">
                    <div className="flex justify-between items-start">
                      <div className="text-3xl font-bold text-[var(--accent)]">{v.calls.toLocaleString()}</div>
                      <Sparkline data={sparkCalls} stroke="#facc15" />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">API Calls ({range})</div>
                  </div>
                  <div className="card p-5">
                    <div className="flex justify-between items-start">
                      <div className="text-3xl font-bold text-[var(--green)]">{v.calls_24h.toLocaleString()}</div>
                      <Sparkline data={sparkCalls.slice(-7)} stroke="#22c55e" />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">Last 24h</div>
                  </div>
                  <div className="card p-5">
                    <div className="flex justify-between items-start">
                      <div className="text-3xl font-bold text-[var(--yellow)]">{v.unique_ips.toLocaleString()}</div>
                      <Sparkline data={sparkIps} stroke="#eab308" />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">Unique IPs</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-[var(--orange)]">{v.unique_countries}</div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">Countries</div>
                  </div>
                  <div className="card p-5">
                    <div className="flex justify-between items-start">
                      <div className="text-3xl font-bold text-cyan-400">{(v.cache_hit_rate * 100).toFixed(1)}%</div>
                      <Sparkline data={sparkCache} stroke="#22d3ee" />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">Cache Hit Rate</div>
                  </div>
                </div>
              );
            })()}

            {/* Quality + revenue KPIs with sparklines */}
            {(() => {
              const v = overview.views[view];
              const daily = timeseries?.daily_kpis ?? [];
              const sparkErr = daily.map((d) => d.error_rate * 100);
              const sparkP95 = daily.map((d) => d.p95_ms);
              const errorColor = v.error_rate > 0.01 ? "text-[var(--red)]" : "text-[var(--green)]";
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  <div className="card p-5">
                    <div className="flex justify-between items-start">
                      <div className={`text-3xl font-bold ${errorColor}`}>{(v.error_rate * 100).toFixed(2)}%</div>
                      <Sparkline data={sparkErr} stroke="#ef4444" />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">Error Rate (4xx/5xx)</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-white">{v.p50_ms}<span className="text-sm text-[var(--text-dim)]">ms</span></div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">p50 Response Time</div>
                  </div>
                  <div className="card p-5">
                    <div className="flex justify-between items-start">
                      <div className="text-3xl font-bold text-white">{v.p95_ms}<span className="text-sm text-[var(--text-dim)]">ms</span></div>
                      <Sparkline data={sparkP95} stroke="#e5e7eb" />
                    </div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">p95 Response Time</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-[var(--yellow)]">{overview.users.total}</div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">
                      Users · {overview.users.active_api_keys} active keys
                    </div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-[var(--green)]">€{overview.revenue.mrr_eur}</div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">
                      MRR · {overview.revenue.paying_customers} paying
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* DB coverage — always all-time, independent of range/view */}
        {overview?.db && (
          <div className="card p-5 mb-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Data Coverage</h2>
              <span className="text-xs text-[var(--text-dim)]">all-time — what the API can answer</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-center">
              {[
                { k: "packages",         label: "Packages",      color: "text-[var(--accent)]" },
                { k: "vulnerabilities",  label: "Vulnerabilities", color: "text-[var(--red)]" },
                { k: "alternatives",     label: "Alternatives",  color: "text-[var(--green)]" },
                { k: "known_bugs",       label: "Known Bugs",    color: "text-[var(--orange)]" },
                { k: "breaking_changes", label: "Breaking",      color: "text-[var(--yellow)]" },
                { k: "errors",           label: "Errors",        color: "text-purple-400" },
                { k: "compat_matrix",    label: "Compat Pairs",  color: "text-cyan-400" },
              ].map(({ k, label, color }) => (
                <div key={k}>
                  <div className={`text-2xl font-bold ${color}`}>
                    {(overview.db[k as keyof typeof overview.db] ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-dim)] mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traffic heatmap — Day-of-Week × Hour-of-Day (from api_usage, respects range+view) */}
        {timeseries?.heatmap && timeseries.heatmap.length > 0 && (
          <div className="card p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Traffic Heatmap</h2>
              <span className="text-xs text-[var(--text-dim)]">
                {range} · view: {view} · log-scaled
              </span>
            </div>
            <Heatmap cells={timeseries.heatmap} />
          </div>
        )}

        {/* Source over time (stacked bar) + Endpoint distribution */}
        {timeseries && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {timeseries.by_source_day.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Source over time</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={timeseries.by_source_day}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    {timeseries.sources_seen.map((src) => (
                      <Bar
                        key={src}
                        dataKey={src}
                        stackId="s"
                        fill={SOURCE_COLORS[src] || "#94a3b8"}
                        name={src}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {timeseries.by_endpoint.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Endpoint distribution</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={timeseries.by_endpoint}
                    layout="vertical"
                    margin={{ left: 30 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} />
                    <YAxis
                      type="category"
                      dataKey="endpoint"
                      tick={{ fontSize: 11, fill: "#ccc" }}
                      width={100}
                    />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="calls" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Suspect browser hours — anomaly signal */}
        {insights && insights.suspect_browser_hours.length > 0 && (
          <div className="card p-5 mb-8 border border-[var(--yellow)]/40 bg-[var(--yellow)]/5">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-[var(--yellow)]">
                Anomaly: suspect browser traffic bursts
              </h2>
              <span className="text-xs text-[var(--text-dim)]">
                calls per IP ratio &gt; 20 in a single hour
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--text-dim)]">
                <tr className="text-left">
                  <th className="pb-2">Hour (UTC)</th>
                  <th className="pb-2 text-right">Calls</th>
                  <th className="pb-2 text-right">Unique IPs</th>
                  <th className="pb-2 text-right">Calls / IP</th>
                </tr>
              </thead>
              <tbody>
                {insights.suspect_browser_hours.map((h, i) => (
                  <tr key={i} className="border-t border-[var(--border)]/30">
                    <td className="py-1.5 font-mono">{h.hour.replace("T", " ").slice(0, 16)}</td>
                    <td className="py-1.5 text-right">{h.calls.toLocaleString()}</td>
                    <td className="py-1.5 text-right">{h.ips}</td>
                    <td className="py-1.5 text-right text-[var(--yellow)]">
                      {(h.calls / Math.max(h.ips, 1)).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Coverage matrix per ecosystem — what the API can answer, by ecosystem */}
        {insights && insights.coverage_matrix.length > 0 && (
          <div className="card p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Coverage Matrix (per ecosystem)</h2>
              <span className="text-xs text-[var(--text-dim)]">
                % of packages with at least one record in each table
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--text-dim)]">
                  <tr className="text-left border-b border-[var(--border)]">
                    <th className="pb-2">Ecosystem</th>
                    <th className="pb-2 text-right">Packages</th>
                    <th className="pb-2 text-right">Avg Health</th>
                    <th className="pb-2 text-right">Vulns</th>
                    <th className="pb-2 text-right">Alternatives</th>
                    <th className="pb-2 text-right">Known Bugs</th>
                    <th className="pb-2 text-right">Breaking</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.coverage_matrix.map((e) => {
                    const pct = (n: number) =>
                      e.packages ? ((n / e.packages) * 100).toFixed(1) : "0.0";
                    const healthColor =
                      e.avg_health >= 70 ? "text-[var(--green)]" :
                      e.avg_health >= 50 ? "text-[var(--yellow)]" :
                      "text-[var(--red)]";
                    return (
                      <tr key={e.ecosystem} className="border-b border-[var(--border)]/30">
                        <td className="py-2 font-mono text-[var(--accent)]">{e.ecosystem}</td>
                        <td className="py-2 text-right">{e.packages.toLocaleString()}</td>
                        <td className={`py-2 text-right font-semibold ${healthColor}`}>
                          {e.avg_health}
                        </td>
                        <td className="py-2 text-right">
                          {e.packages_with_vulns}
                          <span className="text-[var(--text-dim)] text-xs ml-1">({pct(e.packages_with_vulns)}%)</span>
                        </td>
                        <td className="py-2 text-right">
                          {e.packages_with_alternatives}
                          <span className="text-[var(--text-dim)] text-xs ml-1">({pct(e.packages_with_alternatives)}%)</span>
                        </td>
                        <td className="py-2 text-right">
                          {e.packages_with_bugs}
                          <span className="text-[var(--text-dim)] text-xs ml-1">({pct(e.packages_with_bugs)}%)</span>
                        </td>
                        <td className="py-2 text-right">
                          {e.packages_with_breaking}
                          <span className="text-[var(--text-dim)] text-xs ml-1">({pct(e.packages_with_breaking)}%)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Health distribution + Vulnerability severity side by side */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {insights.health_distribution.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Package Health Score Distribution</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={insights.health_distribution}>
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {insights.health_distribution.map((b, i) => {
                        const color =
                          b.bucket <= 4 ? "#ef4444" :
                          b.bucket <= 6 ? "#eab308" :
                          b.bucket <= 8 ? "#22c55e" : "#14b8a6";
                        return <Cell key={i} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {insights.vuln_severity.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Vulnerability Severity</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={insights.vuln_severity}
                      cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                      dataKey="count" nameKey="severity"
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {insights.vuln_severity.map((s, i) => {
                        const color: Record<string, string> = {
                          critical: "#ef4444",
                          high:     "#f97316",
                          medium:   "#eab308",
                          low:      "#22c55e",
                          unknown:  "#64748b",
                        };
                        return <Cell key={i} fill={color[s.severity] || "#94a3b8"} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-xs text-[var(--text-dim)] mt-2 text-center">
                  Only{" "}
                  {insights.vuln_severity.filter((s) => ["critical", "high"].includes(s.severity)).length}{" "}
                  severity buckets classified with critical/high — ingestion pipeline
                  may be missing CVSS severity mapping.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top API keys — pivotal for understanding paying customer usage */}
        {insights && (
          <div className="card p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Top API Keys</h2>
              <span className="text-xs text-[var(--text-dim)]">
                {insights.top_api_keys.length} active
              </span>
            </div>
            {insights.top_api_keys.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)]">
                No user-issued API keys yet — all traffic is anonymous.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--text-dim)]">
                    <tr className="text-left border-b border-[var(--border)]">
                      <th className="pb-2">User</th>
                      <th className="pb-2">Key Prefix</th>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Tier</th>
                      <th className="pb-2 text-right">This Month</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2">Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.top_api_keys.map((k) => (
                      <tr key={k.id} className="border-b border-[var(--border)]/30">
                        <td className="py-2">{k.user_email || <span className="text-[var(--text-dim)]">—</span>}</td>
                        <td className="py-2 font-mono text-xs text-[var(--text-dim)]">{k.key_prefix}…</td>
                        <td className="py-2">{k.name}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            k.tier === "pro" ? "bg-[var(--green)]/20 text-[var(--green)]" :
                            k.tier === "enterprise" ? "bg-[var(--accent)]/20 text-[var(--accent)]" :
                            "bg-gray-500/20 text-gray-400"
                          }`}>
                            {k.tier}
                          </span>
                        </td>
                        <td className="py-2 text-right">{k.requests_this_month.toLocaleString()}</td>
                        <td className="py-2 text-right font-semibold">{k.total_calls.toLocaleString()}</td>
                        <td className="py-2 text-[var(--text-dim)] text-xs">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Page Views KPI Cards — web traffic from page_views_clean, separate data source */}
        {pageviews && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card p-5">
              <div className="text-3xl font-bold text-[var(--accent)]">{(pageviews.today ?? 0).toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)] mt-1">Page Views Today (web)</div>
            </div>
            <div className="card p-5">
              <div className="text-3xl font-bold text-[var(--green)]">{(pageviews.unique_today ?? 0).toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)] mt-1">Unique Visitors Today (web)</div>
            </div>
            <div className="card p-5">
              <div className="text-3xl font-bold text-[var(--yellow)]">{pageviews.by_country?.length ?? 0}</div>
              <div className="text-xs text-[var(--text-dim)] mt-1">Countries (web, 7d)</div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {charts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Traffic Hourly */}
            {charts.pageviews_hourly?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Traffic (Hourly)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={charts.pageviews_hourly}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v: string) => v.slice(11, 16)} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="views" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Views" />
                    <Area type="monotone" dataKey="unique" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Unique" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Daily Views */}
            {charts.pageviews_daily?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Daily Views</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={charts.pageviews_daily}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="views" fill="#facc15" radius={[4, 4, 0, 0]} name="Views" />
                    <Bar dataKey="unique" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Unique" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* API Calls Hourly */}
            {charts.api_calls_hourly?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">API Calls (Hourly)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={charts.api_calls_hourly}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v: string) => v.slice(11, 16)} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="calls" stroke="#facc15" fill="#facc15" fillOpacity={0.2} name="Calls" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* API Sources Pie */}
            {sources && Object.keys(sources.total || {}).length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">API Sources</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(sources.total || {}).map(([name, value]) => ({ name, value: value as number }))}
                      cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                      dataKey="value" nameKey="name" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.keys(sources.total || {}).map((_, i) => (
                        <Cell key={i} fill={["#facc15", "#22c55e", "#3b82f6", "#f97316", "#8b5cf6", "#ef4444", "#06b6d4"][i % 7]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Packages by Ecosystem (horizontal bar) */}
            {stats?.ecosystem_counts && Object.keys(stats.ecosystem_counts).length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Packages by Ecosystem</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(stats.ecosystem_counts).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, count]) => ({ name, count }))} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#ccc" }} width={80} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#facc15" radius={[0, 4, 4, 0]} name="Packages" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Countries Timeline */}
            {charts.countries_timeline?.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Countries Reached</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={charts.countries_timeline}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="countries" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} name="Countries" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Page Views Details Grid */}
        {pageviews && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Countries */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Countries</h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pageviews.by_country?.map((c, i) => {
                  const max = Math.max(...(pageviews.by_country?.map((x) => x.views) || [1]));
                  const pct = max > 0 ? (c.views / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{FLAG_MAP[c.country] || "\u{1F30D}"} {c.country}</span>
                        <span className="text-[var(--text-dim)]">{c.views}</span>
                      </div>
                      <div className="w-full bg-[var(--bg)] rounded-full h-2">
                        <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Pages */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Top Pages</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pageviews.by_page?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[var(--bg)]">
                    <span className="text-sm font-mono truncate mr-2">{p.path}</span>
                    <span className="text-xs text-[var(--text-dim)] whitespace-nowrap">{p.views}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Referrers */}
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Referrers</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pageviews.by_referrer && pageviews.by_referrer.length > 0 ? (
                  pageviews.by_referrer.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-[var(--bg)]">
                      <span className="text-sm truncate mr-2">{r.referrer}</span>
                      <span className="text-xs text-[var(--text-dim)] whitespace-nowrap">{r.views}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-dim)]">No external referrers yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visitor Timeline */}
        {pageviews?.by_day && pageviews.by_day.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="font-semibold mb-4">Visitor Timeline</h2>
            <div className="flex items-end gap-1 h-40">
              {pageviews.by_day.map((d, i) => {
                const max = Math.max(...pageviews.by_day.map((x) => x.views));
                const h = max > 0 ? (d.views / max) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div
                      className="w-full bg-[var(--green)] rounded-t opacity-80 hover:opacity-100 transition min-h-[2px]"
                      style={{ height: `${h}%` }}
                    />
                    <div className="absolute -top-8 hidden group-hover:block bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                      {d.day}: {d.views} views, {d.unique} unique
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-[var(--text-dim)] mt-2">
              <span>{pageviews.by_day[0]?.day}</span>
              <span>{pageviews.by_day[pageviews.by_day.length - 1]?.day}</span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Usage by Day (chart with bars) */}
          {dashboard?.usage_by_day && dashboard.usage_by_day.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">API Calls (30 days)</h2>
              <div className="flex items-end gap-1 h-40">
                {dashboard.usage_by_day.map((d, i) => {
                  const max = Math.max(...dashboard.usage_by_day.map((x) => x.calls));
                  const h = max > 0 ? (d.calls / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full bg-[var(--accent)] rounded-t opacity-80 hover:opacity-100 transition min-h-[2px]"
                        style={{ height: `${h}%` }}
                      />
                      <div className="absolute -top-8 hidden group-hover:block bg-[var(--bg-card)] border border-[var(--border)] px-2 py-1 rounded text-xs whitespace-nowrap">
                        {d.day}: {d.calls}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-[var(--text-dim)] mt-2">
                <span>{dashboard.usage_by_day[0]?.day}</span>
                <span>{dashboard.usage_by_day[dashboard.usage_by_day.length - 1]?.day}</span>
              </div>
            </div>
          )}

          {/* Usage by Ecosystem */}
          {dashboard?.usage_by_ecosystem && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">By Ecosystem</h2>
              <div className="space-y-3">
                {dashboard.usage_by_ecosystem.map((e, i) => {
                  const max = Math.max(...dashboard.usage_by_ecosystem.map((x) => x.calls));
                  const pct = max > 0 ? (e.calls / max) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{e.ecosystem}</span>
                        <span className="text-[var(--text-dim)]">{e.calls}</span>
                      </div>
                      <div className="w-full bg-[var(--bg)] rounded-full h-2">
                        <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Top Packages */}
          {dashboard?.top_packages && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Top Packages (7 days)</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dashboard.top_packages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[var(--bg)]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--accent)] w-10">{p.ecosystem}</span>
                      <span className="text-sm">{p.package_name}</span>
                    </div>
                    <span className="text-xs text-[var(--text-dim)]">{p.searches}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Agents (User-Agent) */}
          {dashboard?.top_agents && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">AI Agents Using Us</h2>
              <div className="space-y-2">
                {dashboard.top_agents.map((a, i) => {
                  const max = Math.max(...dashboard.top_agents.map((x) => x.calls));
                  const pct = max > 0 ? (a.calls / max) * 100 : 0;
                  const colors: Record<string, string> = {
                    Claude: "bg-orange-500", ChatGPT: "bg-green-500", Cursor: "bg-blue-500",
                    Windsurf: "bg-purple-500", "MCP Server": "bg-cyan-500", curl: "bg-gray-500",
                    Python: "bg-yellow-500", "Node.js": "bg-lime-500",
                  };
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{a.agent}</span>
                        <span className="text-[var(--text-dim)]">{a.calls}</span>
                      </div>
                      <div className="w-full bg-[var(--bg)] rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[a.agent] || "bg-[var(--accent)]"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sources */}
        {sources && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <h2 className="font-semibold mb-4">API Sources</h2>
              {Object.keys(sources.total || {}).length === 0 ? (
                <p className="text-[var(--text-dim)] text-sm">Nessuna chiamata tracciata con source</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(sources.total || {}).sort((a: any, b: any) => b[1] - a[1]).map(([src, count]: [string, any]) => (
                    <div key={src} className="flex justify-between items-center">
                      <span className="text-sm">{{ rapidapi: '⚡', gpt: '🤖', gpt_bot: '🕷️', claude: '🧠', claude_bot: '🕷️', cursor: '💻', mcp: '🔌', sdk: '📦', browser: '🌐', internal: '⚙️', unknown: '❓' }[src] || '📡'} {src}</span>
                      <div className="flex gap-4 items-center">
                        <span className="text-xs text-[var(--text-dim)]">oggi: {(sources.today || {})[src] || 0}</span>
                        <span className="text-sm font-mono text-[var(--accent)]">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Ecosystems ({stats?.ecosystems?.length || 0})</h2>
              <div className="space-y-2">
                {Object.entries(stats?.ecosystem_counts || {}).sort((a: any, b: any) => b[1] - a[1]).map(([eco, count]: [string, any]) => (
                  <div key={eco} className="flex justify-between items-center">
                    <span className="text-sm">{{ npm: '📦', pypi: '🐍', cargo: '🦀', go: '🐹', composer: '🎼', maven: '☕', nuget: '💎', rubygems: '💎' }[eco] || '📦'} {eco}</span>
                    <span className="text-sm font-mono text-[var(--accent)]">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        {dashboard?.users && (
          <div className="card p-6 mb-8">
            <h2 className="font-semibold mb-4">Users ({dashboard.users.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-dim)]">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">API Key</th>
                    <th className="pb-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)]/30">
                      <td className="py-2">{u.id}</td>
                      <td className="py-2">{u.email}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.role === "admin" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2">{u.plan}</td>
                      <td className="py-2 font-mono text-xs text-[var(--text-dim)]">
                        {u.api_key ? u.api_key.substring(0, 15) + "..." : "-"}
                      </td>
                      <td className="py-2 text-[var(--text-dim)]">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trending Live */}
        {stats?.trending && stats.trending.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Trending Now</h2>
            <div className="flex flex-wrap gap-2">
              {stats.trending.map((t, i) => (
                <a
                  key={i}
                  href={`/pkg/${t.ecosystem}/${t.package}`}
                  className="px-3 py-1.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-sm hover:border-[var(--accent)] transition"
                >
                  <span className="text-[var(--accent)]">{t.ecosystem}/</span>
                  {t.package} <span className="text-[var(--text-dim)]">({t.searches})</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[var(--text-dim)] mt-8">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
