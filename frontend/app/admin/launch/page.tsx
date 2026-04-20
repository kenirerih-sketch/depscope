"use client";

import { useEffect, useState } from "react";
import { PageHeader, Section, Card, CardBody, CardHeader, Stat, Badge, Footer } from "../../../components/ui";

type Metrics = {
  email: {
    total_queued: number; sent: number; bounced: number;
    opened: number; clicked: number; replied: number;
    open_rate: number; click_rate: number;
  };
  api: { calls_24h: number; calls_total: number; unique_ips_24h: number };
  github: { repo: string; stars: number; forks: number; watchers: number };
  npm: { package: string; downloads_7d: number };
  devto: {
    published: { id: number; title: string; url: string; views: number | null; reactions: number; comments: number }[];
  };
  gsc?: {
    last_7d: { clicks: number; impressions: number; avg_position: number | null };
    top_queries: { query: string; clicks: number; impressions: number; position: number | null }[];
  };
  ts: string;
};

type QueueItem = {
  id: number;
  to_name: string | null;
  to_email: string;
  outlet: string | null;
  subject: string;
  scheduled_for: string | null;
  sent_at: string | null;
  status: "queued" | "sent" | "bounced" | "replied";
  opens: number;
  clicks: number;
  smtp: string;
};

type TrafficRow = {
  hour: string;
  humans: number;
  ai_bots: number;
  search_bots: number;
  other_bots: number;
  internal: number;
};
type TrafficBreakdown = {
  totals: { humans: number; ai_bots: number; search_bots: number; other_bots: number; internal: number; total: number };
  hourly: TrafficRow[];
  hours: number;
};

export default function LaunchPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Metrics | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [traffic, setTraffic] = useState<TrafficBreakdown | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body_md: string; to_email: string; to_name: string | null; outlet: string | null } | null>(null);
  const [tab, setTab] = useState<"metrics" | "queue">("metrics");
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("");

  async function authed(path: string, k: string) {
    const r = await fetch(path, { headers: { "x-admin-key": k } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function load(k: string) {
    if (!k) return;
    setRefreshing(true); setErr(null);
    try {
      const [m, q, t] = await Promise.all([
        authed("/api/admin/launch-metrics", k),
        authed("/api/admin/outreach-queue", k),
        authed("/api/admin/traffic-breakdown?hours=48", k),
      ]);
      setData(m); setQueue(q.items); setTraffic(t);
    } catch (e: any) {
      setErr(e?.message || "fetch failed");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ds_admin_key") : null;
    if (saved) { setKey(saved); load(saved); }
  }, []);

  useEffect(() => {
    if (!key) return;
    const iv = setInterval(() => load(key), 60_000);
    return () => clearInterval(iv);
  }, [key]);

  const save = () => {
    if (key) { localStorage.setItem("ds_admin_key", key); load(key); }
  };

  async function showPreview(id: number) {
    try {
      const j = await authed(`/api/admin/outreach-preview/${id}`, key);
      setPreview(j);
    } catch (e: any) {
      setErr(e?.message || "preview failed");
    }
  }

  const statusColor = (s: string) =>
    s === "sent" ? "var(--accent)" :
    s === "replied" ? "var(--green)" :
    s === "bounced" ? "var(--red)" : "var(--text-dim)";

  const filteredQueue = (queue || []).filter(q => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (q.outlet || "").toLowerCase().includes(f)
        || (q.to_name || "").toLowerCase().includes(f)
        || q.to_email.toLowerCase().includes(f)
        || q.status.includes(f);
  });

  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          eyebrow="Admin"
          title="Launch Tracker"
          description="Real-time metrics for the 20 Apr launch: outreach, Dev.to, GitHub, npm, API traffic."
        />

        {!data && (
          <Section>
            <Card>
              <CardBody>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Admin key</label>
                <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-sm font-mono"
                  placeholder="ds_admin_..." />
                <button onClick={save} className="mt-3 px-4 py-2 bg-[var(--accent)] text-black text-sm font-semibold rounded-lg hover:bg-[var(--accent-dim)] transition">
                  Load metrics
                </button>
                {err && <p className="mt-3 text-xs text-[var(--red)]">Error: {err}</p>}
              </CardBody>
            </Card>
          </Section>
        )}

        {data && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-1 border border-[var(--border)] rounded-lg p-1 text-xs font-medium">
                <button onClick={() => setTab("metrics")}
                  className={`px-3 py-1.5 rounded ${tab === "metrics" ? "bg-[var(--accent)] text-black" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
                  Metrics
                </button>
                <button onClick={() => setTab("queue")}
                  className={`px-3 py-1.5 rounded ${tab === "queue" ? "bg-[var(--accent)] text-black" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
                  Outreach queue ({queue?.length ?? 0})
                </button>
              </div>
              <div className="flex-1" />
              <span className="text-xs text-[var(--text-dim)]">
                {new Date(data.ts).toLocaleTimeString()} {refreshing && "· refreshing…"}
              </span>
              <button onClick={() => load(key)} className="text-xs text-[var(--accent)] hover:underline">Refresh</button>
            </div>

            {tab === "metrics" && (
              <>
                <Section title="Outreach campaign (launch_2026_04_20)">
                  <Card>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border)]">
                      <div className="p-5"><Stat value={data.email.total_queued} label="Queued" /></div>
                      <div className="p-5"><Stat value={data.email.sent} label="Sent" color="var(--accent)" /></div>
                      <div className="p-5"><Stat value={data.email.bounced} label="Bounced" color="var(--red)" /></div>
                      <div className="p-5"><Stat value={data.email.replied} label="Replies" color="var(--green)" /></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-[var(--border)] divide-x md:divide-x divide-[var(--border)]">
                      <div className="p-5"><Stat value={data.email.opened} label="Opened (uniq)" /></div>
                      <div className="p-5"><Stat value={`${data.email.open_rate}%`} label="Open rate" color="var(--accent)" /></div>
                      <div className="p-5"><Stat value={data.email.clicked} label="Clicked (uniq)" /></div>
                      <div className="p-5"><Stat value={`${data.email.click_rate}%`} label="Click rate" color="var(--accent)" /></div>
                    </div>
                  </Card>
                </Section>

                <Section title="API traffic">
                  <Card>
                    <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                      <div className="p-5"><Stat value={data.api.calls_24h.toLocaleString()} label="Calls · 24h" /></div>
                      <div className="p-5"><Stat value={data.api.calls_total.toLocaleString()} label="Calls · total" /></div>
                      <div className="p-5"><Stat value={data.api.unique_ips_24h} label="Unique IPs · 24h" /></div>
                    </div>
                  </Card>
                </Section>

                {traffic && (
                  <Section title="Website traffic breakdown · 48h">
                    <Card>
                      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-[var(--border)]">
                        <div className="p-4"><Stat value={traffic.totals.humans} label="Humans" color="var(--green)" /></div>
                        <div className="p-4"><Stat value={traffic.totals.ai_bots} label="AI bots" color="var(--accent)" /></div>
                        <div className="p-4"><Stat value={traffic.totals.search_bots} label="Search bots" color="#7c6bff" /></div>
                        <div className="p-4"><Stat value={traffic.totals.other_bots} label="Other bots" color="var(--text-dim)" /></div>
                        <div className="p-4"><Stat value={traffic.totals.internal} label="Internal" color="var(--red)" /></div>
                      </div>
                      <div className="p-4 border-t border-[var(--border)]">
                        <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-2">Stacked hourly</div>
                        <TrafficChart rows={traffic.hourly} />
                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                          <LegendDot color="var(--green)" label="Humans" />
                          <LegendDot color="var(--accent)" label="AI bots (GPT/Claude/CCBot)" />
                          <LegendDot color="#7c6bff" label="Search bots (Google/Bing/etc)" />
                          <LegendDot color="#6b7280" label="Other bots" />
                          <LegendDot color="var(--red)" label="Internal (team)" />
                        </div>
                      </div>
                    </Card>
                  </Section>
                )}

                <Section title="GitHub & npm">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{data.github.repo}</span>
                          <Badge variant="neutral">GitHub</Badge>
                        </div>
                      </CardHeader>
                      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)]">
                        <div className="p-5"><Stat value={data.github.stars} label="Stars" color="var(--accent)" /></div>
                        <div className="p-5"><Stat value={data.github.forks} label="Forks" /></div>
                        <div className="p-5"><Stat value={data.github.watchers} label="Watchers" /></div>
                      </div>
                    </Card>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{data.npm.package}</span>
                          <Badge variant="neutral">npm</Badge>
                        </div>
                      </CardHeader>
                      <div className="p-5">
                        <Stat value={data.npm.downloads_7d.toLocaleString()} label="Downloads · last 7d" color="var(--accent)" />
                      </div>
                    </Card>
                  </div>
                </Section>

                {data.gsc && (
                  <Section title="Google Search Console · last 7 days">
                    <Card>
                      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                        <div className="p-5"><Stat value={data.gsc.last_7d.clicks} label="Clicks" color="var(--accent)" /></div>
                        <div className="p-5"><Stat value={data.gsc.last_7d.impressions.toLocaleString()} label="Impressions" /></div>
                        <div className="p-5"><Stat value={data.gsc.last_7d.avg_position ? data.gsc.last_7d.avg_position.toFixed(1) : "–"} label="Avg position" /></div>
                      </div>
                      {data.gsc.top_queries && data.gsc.top_queries.length > 0 && (
                        <div className="p-4 border-t border-[var(--border)]">
                          <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-2">Top queries (latest snapshot)</div>
                          <div className="space-y-1">
                            {data.gsc.top_queries.map((q, i) => (
                              <div key={i} className="flex items-center justify-between text-xs gap-4 py-1 border-b border-[var(--border)] last:border-0">
                                <span className="font-mono text-[var(--text)] truncate" title={q.query}>{q.query}</span>
                                <div className="flex gap-3 text-[var(--text-dim)] tabular-nums">
                                  <span>{q.impressions} imp</span>
                                  <span className="text-[var(--accent)]">{q.clicks} clk</span>
                                  <span>pos {q.position ? q.position.toFixed(1) : "–"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </Section>
                )}

                <Section title="Dev.to published articles">
                  <Card>
                    <CardBody>
                      {data.devto.published.length === 0 ? (
                        <p className="text-sm text-[var(--text-dim)]">No published articles yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {data.devto.published.map(a => (
                            <div key={a.id} className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)] last:border-0">
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text)] hover:text-[var(--accent)] flex-1">
                                {a.title}
                              </a>
                              <div className="flex gap-3 text-xs tabular-nums">
                                <span className="text-[var(--text-dim)]">{a.views ?? "–"} views</span>
                                <span className="text-[var(--accent)]">{a.reactions} ❤</span>
                                <span className="text-[var(--text-dim)]">{a.comments} 💬</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Section>
              </>
            )}

            {tab === "queue" && queue && (
              <>
                <Section title={`Outreach queue — ${queue.length} emails`}>
                  <Card>
                    <div className="p-4 border-b border-[var(--border)]">
                      <input value={filter} onChange={e => setFilter(e.target.value)}
                        placeholder="Filter by outlet, name, email, status…"
                        className="w-full px-3 py-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded text-xs" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-left text-[var(--text-dim)]">
                            <th className="py-2 px-3">Outlet</th>
                            <th className="py-2 px-3">Recipient</th>
                            <th className="py-2 px-3">Subject</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Opens</th>
                            <th className="py-2 px-3">Clicks</th>
                            <th className="py-2 px-3">Sent at</th>
                            <th className="py-2 px-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQueue.map(r => (
                            <tr key={r.id} className="border-b border-[var(--border)]">
                              <td className="py-2 px-3 font-medium">{r.outlet || "—"}</td>
                              <td className="py-2 px-3">
                                <div>{r.to_name || r.to_email}</div>
                                <div className="text-[10px] text-[var(--text-dim)] font-mono">{r.to_email}</div>
                              </td>
                              <td className="py-2 px-3 max-w-[280px] truncate" title={r.subject}>{r.subject}</td>
                              <td className="py-2 px-3">
                                <span style={{ color: statusColor(r.status) }} className="text-xs font-medium uppercase tracking-wider">{r.status}</span>
                              </td>
                              <td className="py-2 px-3 tabular-nums">{r.opens}</td>
                              <td className="py-2 px-3 tabular-nums">{r.clicks}</td>
                              <td className="py-2 px-3 text-[var(--text-dim)]">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</td>
                              <td className="py-2 px-3">
                                <button onClick={() => showPreview(r.id)} className="text-[var(--accent)] hover:underline text-xs">preview</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </Section>

                {preview && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
                    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg max-w-3xl w-full max-h-[85vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider">To</div>
                          <div className="text-sm">{preview.to_name} &lt;{preview.to_email}&gt; · {preview.outlet}</div>
                          <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mt-2">Subject</div>
                          <div className="text-sm font-medium">{preview.subject}</div>
                        </div>
                        <button onClick={() => setPreview(null)} className="text-[var(--text-dim)] hover:text-[var(--text)] text-2xl leading-none">×</button>
                      </div>
                      <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-2">Body</div>
                      <pre className="text-xs whitespace-pre-wrap font-mono bg-[var(--bg-soft)] p-4 rounded border border-[var(--border)]">{preview.body_md}</pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />
      <span className="text-[var(--text-dim)]">{label}</span>
    </span>
  );
}

function TrafficChart({ rows }: { rows: TrafficRow[] }) {
  if (!rows.length) return <div className="text-xs text-[var(--text-dim)] py-4">No data in window.</div>;
  const W = 860, H = 180, PAD_L = 40, PAD_B = 24, PAD_T = 6;
  const innerW = W - PAD_L - 8;
  const innerH = H - PAD_B - PAD_T;
  const max = Math.max(1, ...rows.map(r => r.humans + r.ai_bots + r.search_bots + r.other_bots + r.internal));
  const step = innerW / Math.max(1, rows.length);
  const barW = Math.max(2, step * 0.85);

  const y = (v: number) => PAD_T + innerH - (v / max) * innerH;
  const fmt = (h: string) => h.slice(11, 16);  // HH:MM

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 200, maxHeight: 260 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - 8} y1={y(max * p)} y2={y(max * p)} stroke="var(--border)" strokeDasharray="2 3" opacity={0.45} />
          <text x={PAD_L - 6} y={y(max * p) + 3} fontSize={9} textAnchor="end" fill="var(--text-dim)">{Math.round(max * p)}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const x = PAD_L + i * step;
        let acc = 0;
        const stacks = [
          { v: r.humans,      c: "var(--green)" },
          { v: r.ai_bots,     c: "var(--accent)" },
          { v: r.search_bots, c: "#7c6bff" },
          { v: r.other_bots,  c: "#6b7280" },
          { v: r.internal,    c: "var(--red)" },
        ];
        return (
          <g key={i}>
            {stacks.map((s, j) => {
              if (!s.v) return null;
              const h = (s.v / max) * innerH;
              const yy = PAD_T + innerH - acc - h;
              acc += h;
              return <rect key={j} x={x} y={yy} width={barW} height={h} fill={s.c} />;
            })}
            {i % Math.max(1, Math.floor(rows.length / 8)) === 0 && (
              <text x={x + barW / 2} y={H - 8} fontSize={9} textAnchor="middle" fill="var(--text-dim)">{fmt(r.hour)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
