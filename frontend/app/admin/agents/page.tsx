"use client";
import { AdminShell, Card, Stat, Grid, Table, Pill } from "../AdminShell";
import { useAdminMany, asArray } from "../admin_hooks";

export default function AgentsPage() {
  const s = useAdminMany<{ dash: any; ops: any; platforms: any }>({
    dash:      "/api/admin/agent/dashboard",
    ops:       "/api/admin/agent/opportunities?limit=30",
    platforms: "/api/admin/agent/platforms",
  });

  if (s.loading) return <AdminShell title="Agents"><Card>Loading…</Card></AdminShell>;

  const dash = s.data.dash || {};
  const ops = Array.isArray(s.data.ops) ? s.data.ops : asArray(s.data.ops);
  const platforms = Array.isArray(s.data.platforms) ? s.data.platforms : asArray(s.data.platforms);
  const metrics7d = asArray(dash.metrics_7d);

  async function runNow() {
    await fetch("/api/admin/agent/run", { method: "POST", credentials: "include" });
    alert("Agent run triggered");
  }

  return (
    <AdminShell title="Agents"
      subtitle="CrewAI marketing agent — pipeline, opportunities, execution"
      actions={<button onClick={runNow} className="text-xs px-3 py-1 rounded"
                        style={{ background: "var(--accent)", color: "var(--bg)" }}>▶ Run now</button>}>

      <Grid cols={5}>
        <Card><Stat label="Opps today"       value={dash.opps_today ?? "—"} /></Card>
        <Card><Stat label="Actions today"    value={dash.actions_today ?? "—"} /></Card>
        <Card><Stat label="Comments total"   value={dash.comments_total ?? "—"} /></Card>
        <Card><Stat label="Emails total"     value={dash.emails_total ?? "—"} /></Card>
        <Card><Stat label="Queue"            value={dash.queue_count ?? "—"}
                    sub={dash.last_run ? new Date(dash.last_run).toISOString().slice(0, 16).replace("T", " ") : undefined} /></Card>
      </Grid>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <Card title="Platforms">
          {platforms.length === 0 ? <Empty /> :
            <Table
              headers={["platform", "status", "last run"]}
              rows={platforms.map((p: any) => [
                p.platform || p.name || "—",
                <Pill key={p.platform || p.name}
                      color={["ok", "connected", "healthy"].includes(p.status) ? "green" : "red"}>
                  {p.status || "—"}
                </Pill>,
                p.last_check || p.last_run || "—",
              ])}
            />
          }
        </Card>

        <Card title="Metrics (7d)">
          {metrics7d.length === 0 ? <Empty /> :
            <Table
              headers={["date", "page views", "API calls", "uniq IPs", "new users"]}
              rows={metrics7d.map((m: any) => [
                m.date,
                m.page_views ?? "—",
                m.api_calls ?? "—",
                m.unique_visitors ?? "—",
                m.new_signups ?? m.new_users ?? "—",
              ])}
            />
          }
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Opportunities pipeline">
          {ops.length === 0 ? <Empty /> :
            <Table
              headers={["date", "platform", "kind", "title / summary", "status"]}
              rows={ops.slice(0, 25).map((o: any) => [
                o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : "—",
                <Pill key={(o.id || 0) + "p"} color="blue">{o.platform || o.source || "—"}</Pill>,
                o.kind || o.type || "—",
                (o.title || o.summary || o.content || "").toString().slice(0, 70),
                <Pill key={(o.id || 0) + "s"}
                      color={o.status === "approved" || o.status === "executed" ? "green"
                            : o.status === "rejected" || o.status === "failed" ? "red"
                            : o.status === "pending" || o.status === "queued" ? "orange" : "default"}>
                  {o.status || "—"}
                </Pill>,
              ])}
            />
          }
        </Card>
      </div>
    </AdminShell>
  );
}

function Empty() {
  return <div className="text-xs" style={{ color: "var(--text-faded)" }}>No data.</div>;
}
