"use client";
import { useState } from "react";
import { AdminShell, Card, Table } from "../AdminShell";
import { useAdmin, asArray, NeedsAuthBanner } from "../admin_hooks";

export default function SettingsPage() {
  const { data, loading, error, needsAuth } = useAdmin<any>("/api/admin/agent/config");

  if (loading) return <AdminShell title="Settings"><Card>Loading…</Card></AdminShell>;
  if (needsAuth) return <AdminShell title="Settings"><NeedsAuthBanner /></AdminShell>;

  const raw = data || {};
  // Normalise into [{key, value}] regardless of shape
  const entries: { key: string; value: any }[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.items) ? raw.items
    : Array.isArray(raw.config) ? raw.config
    : typeof raw === "object" ? Object.entries(raw).map(([k, v]) => ({ key: k, value: v }))
    : [];

  return (
    <AdminShell title="Settings"
      subtitle="Agent config, rate limits, keys, danger zone">

      {error && <div className="mb-4 text-xs" style={{ color: "var(--red)" }}>config: {error}</div>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card title="Rate limits (public API)">
          <Table
            headers={["tier", "limit"]}
            rows={[
              ["anonymous",       "100 req/min"],
              ["AI-UA whitelist", "200 req/min (ClaudeBot/GPTBot/Cursor/MCP-Client/…)"],
              ["registered free", "500 req/min"],
              ["paid",            "2000+ req/min"],
            ]}
          />
        </Card>

        <Card title="Hot links">
          <div className="text-sm space-y-2">
            {[
              ["/api-docs",                  "OpenAPI UI"],
              ["/openapi.json",              "Full spec (63 paths)"],
              ["/openapi-gpt.json",          "Curated spec (18 paths, ChatGPT Actions)"],
              ["/.well-known/mcp.json",      "MCP discovery manifest"],
              ["/.well-known/ai-plugin.json","OpenAI plugin manifest"],
              ["/llms.txt",                  "AI agent brief (short)"],
              ["/llms-full.txt",             "AI agent brief (verbose)"],
              ["/robots.txt",                "16 AI crawlers whitelisted"],
            ].map(([href, label]) => (
              <a key={href} href={href} target="_blank" rel="noreferrer"
                 className="block hover:text-[var(--accent)]"
                 style={{ color: "var(--text-dim)" }}>→ {href} — {label}</a>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Agent configuration">
        {entries.length === 0
          ? <div className="text-xs" style={{ color: "var(--text-faded)" }}>No config loaded.</div>
          : <Table
              headers={["key", "value"]}
              rows={entries.map(e => [
                <code key={e.key} className="text-xs">{e.key}</code>,
                <ConfigInput key={e.key} k={e.key} initial={e.value} />,
              ])}
            />
        }
      </Card>

      <div className="mt-6">
        <Card title="Danger zone">
          <div className="text-sm space-y-3" style={{ color: "var(--text-dim)" }}>
            <div>
              Pause the agent: <code className="text-xs">POST /api/admin/agent/toggle</code>
              with <code className="text-xs">{'{"key":"active"}'}</code>
            </div>
            <div>
              Flush Redis check cache:
              <button
                onClick={async () => {
                  const r = await fetch("/api/admin/cache/flush", { method: "POST", credentials: "include" });
                  alert(r.ok ? "Cache flushed" : `Error: ${r.status}`);
                }}
                className="ml-2 text-xs px-2 py-0.5 rounded"
                style={{ background: "var(--red-dim)", color: "white" }}>⚡ flush</button>
            </div>
            <div>PM2 reload: manual SSH only</div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

function ConfigInput({ k, initial }: { k: string; initial: any }) {
  const [val, setVal] = useState(stringify(initial));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setSaving(true); setSaved(false);
    await fetch(`/api/admin/agent/config/${encodeURIComponent(k)}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: val }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  return (
    <div className="flex gap-2 items-center">
      <input value={val} onChange={e => setVal(e.target.value)}
             className="px-2 py-1 rounded text-xs font-mono flex-1"
             style={{ background: "var(--bg-input)", border: "1px solid var(--border)",
                       color: "var(--text)" }} />
      <button onClick={save} disabled={saving}
              className="text-xs px-2 py-1 rounded disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--bg)" }}>
        {saving ? "…" : saved ? "✓" : "save"}
      </button>
    </div>
  );
}

function stringify(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
