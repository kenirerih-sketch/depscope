"use client";
import { useState } from "react";
import { AdminShell, Card, Stat, Grid, Table, Pill } from "../AdminShell";
import { useAdminMany, useAdmin, asArray } from "../admin_hooks";

export default function MarketingPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const s = useAdminMany<{ out: any; pm: any; actions: any[] }>({
    out:     "/api/admin/outreach?limit=300",
    pm:      "/api/admin/plan-metrics",
    actions: "/api/admin/agent/emails?limit=30",
  });

  if (s.loading) return <AdminShell title="Marketing"><Card>Loading…</Card></AdminShell>;

  const out = s.data.out || {};
  const agg = out.aggregates || {};
  const campaigns = asArray(out.campaigns);
  const items = asArray(out.items);
  const actions = Array.isArray(s.data.actions) ? s.data.actions : asArray(s.data.actions);
  const distrib = s.data.pm?.distribution || {};

  const replyRate = agg.sent ? ((agg.replied / agg.sent) * 100).toFixed(1) : "—";
  const bounceRate = agg.sent ? ((agg.bounced / agg.sent) * 100).toFixed(1) : "—";

  return (
    <AdminShell title="Marketing"
      subtitle="Outreach pipeline · campaigns · replies · agent actions">

      <Grid cols={4}>
        <Card><Stat label="Total emails" value={num(agg.total)}
                    sub={`${agg.outlets || 0} outlets`} /></Card>
        <Card><Stat label="Sent"         value={num(agg.sent)}
                    sub={`+${num(agg.queued)} queued`} /></Card>
        <Card><Stat label="Replies"      value={agg.replied ?? 0}
                    sub={`${replyRate}% rate`} /></Card>
        <Card><Stat label="Bounces"      value={agg.bounced ?? 0}
                    sub={`${bounceRate}%`} /></Card>
      </Grid>

      {/* Campaigns breakdown */}
      <div className="mt-6">
        <Card title="Campaigns">
          {campaigns.length === 0 ? <Empty /> :
            <Table
              headers={["campaign", "total", "sent", "replied", "bounced", "first", "last"]}
              rows={campaigns.map((c: any) => [
                <Pill key={c.campaign} color="blue">{c.campaign}</Pill>,
                num(c.total),
                num(c.sent),
                <Pill key={c.campaign + "r"} color={c.replied > 0 ? "green" : "default"}>{c.replied}</Pill>,
                <Pill key={c.campaign + "b"} color={c.bounced > 0 ? "red" : "default"}>{c.bounced}</Pill>,
                c.first_at ? new Date(c.first_at).toISOString().slice(0, 10) : "—",
                c.last_at ? new Date(c.last_at).toISOString().slice(0, 10) : "—",
              ])}
            />
          }
        </Card>
      </div>

      {/* Full outreach table */}
      <div className="mt-6">
        <Card title={`All outreach emails (${items.length}${items.length < agg.total ? ` of ${agg.total}` : ""})`}>
          {items.length === 0 ? <Empty /> :
            <Table
              headers={["date", "to", "outlet", "subject", "campaign", "status", ""]}
              rows={items.map((e: any) => [
                e.sent_at ? new Date(e.sent_at).toISOString().slice(0, 10)
                  : e.scheduled_for ? new Date(e.scheduled_for).toISOString().slice(0, 10)
                  : e.created_at ? new Date(e.created_at).toISOString().slice(0, 10)
                  : "—",
                (e.to_email || "").slice(0, 30),
                <Pill key={e.id + "o"} color="blue">{(e.outlet || "—").slice(0, 20)}</Pill>,
                (e.subject || "").slice(0, 50),
                <span key={e.id + "c"} className="text-xs opacity-70">{e.campaign || "—"}</span>,
                e.reply_at
                  ? <Pill key={e.id + "s"} color="green">replied</Pill>
                  : e.bounce_at
                    ? <Pill key={e.id + "s"} color="red">bounced</Pill>
                    : e.sent_at
                      ? <Pill key={e.id + "s"} color="default">sent</Pill>
                      : <Pill key={e.id + "s"} color="orange">queued</Pill>,
                <button key={e.id + "b"} onClick={() => setSelectedId(e.id)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--bg-hover)", color: "var(--accent)" }}>
                  view →
                </button>,
              ])}
            />
          }
        </Card>
      </div>

      {selectedId != null && (
        <EmailDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* Agent actions */}
      <div className="mt-6">
        <Card title="Agent actions (last 30)">
          {actions.length === 0 ? <Empty /> :
            <Table
              headers={["date", "type", "platform", "target", "status"]}
              rows={actions.slice(0, 15).map((a: any) => [
                a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : "—",
                <Pill key={(a.id || 0) + "t"} color="blue">{a.action_type}</Pill>,
                a.platform || "—",
                (a.target_url || "").slice(0, 40),
                <Pill key={(a.id || 0) + "s"}
                      color={a.status === "executed" ? "green" : a.status === "failed" ? "red" : "orange"}>
                  {a.status}
                </Pill>,
              ])}
            />
          }
        </Card>
      </div>

      {/* Distribution */}
      <div className="mt-6">
        <Card title="Distribution channels">
          <Table
            headers={["channel", "status"]}
            rows={[
              ["mcp npm version",  distrib.mcp_npm_version_latest || "—"],
              ["GPT store",        distrib.gpt_store_live ? <Pill key="g" color="green">live</Pill> : <Pill key="g" color="red">off</Pill>],
              ["RapidAPI",         distrib.rapidapi_live ? <Pill key="r" color="green">live</Pill> : <Pill key="r" color="red">off</Pill>],
            ]}
          />
        </Card>
      </div>
    </AdminShell>
  );
}

function EmailDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, loading, error } = useAdmin<any>(`/api/admin/outreach/${id}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
         style={{ background: "rgba(0,0,0,0.7)" }}
         onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-lg p-6"
           style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>Email #{id}</h2>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded"
                  style={{ background: "var(--bg-hover)", color: "var(--text-dim)" }}>close</button>
        </div>

        {loading && <div>Loading…</div>}
        {error && <div style={{ color: "var(--red)" }}>{error}</div>}
        {data && (
          <div className="space-y-2 text-sm">
            <Row k="To"           v={data.to_email + (data.to_name ? ` (${data.to_name})` : "")} />
            <Row k="Outlet"       v={data.outlet} />
            <Row k="From"         v={data.from_email} />
            <Row k="Subject"      v={data.subject} />
            <Row k="Campaign"     v={data.campaign} />
            <Row k="Tracking ID"  v={data.tracking_id} />
            <Row k="Scheduled"    v={data.scheduled_for} />
            <Row k="Sent"         v={data.sent_at} />
            <Row k="SMTP response" v={data.smtp_response} />
            <Row k="Bounced"      v={data.bounce_at || "—"} />
            <Row k="Replied"      v={data.reply_at || "—"} />
            <Row k="Created"      v={data.created_at} />
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-faded)" }}>Body</div>
              <pre className="text-xs whitespace-pre-wrap p-3 rounded font-mono max-h-96 overflow-auto"
                   style={{ background: "var(--bg-input)", border: "1px solid var(--border)",
                             color: "var(--text-dim)" }}>
                {data.body_md || "(empty)"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex gap-4">
      <div className="w-32 text-xs uppercase" style={{ color: "var(--text-faded)" }}>{k}</div>
      <div className="flex-1 text-sm font-mono break-all">{v || "—"}</div>
    </div>
  );
}

function num(n: any) { return (Number(n) || 0).toLocaleString(); }
function Empty() { return <div className="text-xs" style={{ color: "var(--text-faded)" }}>No data.</div>; }
