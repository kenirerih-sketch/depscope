"use client";
import { useState } from "react";

export default function AdminLoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        const next = new URLSearchParams(location.search).get("next") || "/admin";
        location.href = next;
      } else if (r.status === 401) {
        setErr("Wrong password");
      } else {
        setErr(`Error ${r.status}`);
      }
    } catch (e: any) {
      setErr(e.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="w-full max-w-xl grid gap-6">
        <form onSubmit={submit}
              className="w-full p-6 rounded-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="mb-5">
            <div className="text-xl font-semibold" style={{ color: "var(--accent)" }}>
              ◆ DepScope Admin
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-faded)" }}>
              Enter the password to access the control panel.
            </div>
          </div>

          <input type="password"
                 autoFocus
                 value={pw}
                 onChange={e => setPw(e.target.value)}
                 placeholder="Password"
                 className="w-full px-3 py-2 rounded-md text-sm font-mono"
                 style={{ background: "var(--bg-input)",
                           border: "1px solid var(--border)",
                           color: "var(--text)" }} />

          {err && (
            <div className="mt-3 text-xs" style={{ color: "var(--red)" }}>{err}</div>
          )}

          <button type="submit" disabled={busy || !pw}
                  className="mt-4 w-full px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}>
            {busy ? "Verifying…" : "Unlock →"}
          </button>

          <div className="mt-4 text-xs text-center" style={{ color: "var(--text-faded)" }}>
            Cuttalo srl · <a href="/" className="hover:text-[var(--accent)]">back to depscope.dev</a>
          </div>
        </form>

        <section className="p-5 rounded-lg text-xs leading-relaxed"
                 style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
                           color: "var(--text-dim)" }}>
          <div className="font-semibold mb-2" style={{ color: "var(--text)" }}>About DepScope</div>
          <p className="mb-2">
            <strong style={{ color: "var(--text)" }}>Sistema.</strong>{" "}
            API + MCP gratuita che dice agli agent AI se un pacchetto è sicuro
            prima di <code>npm install</code>/<code>pip install</code>. 19 ecosistemi,
            392k package, 7.3k CVE arricchite con KEV+EPSS, 22 MCP tools.
          </p>
          <p className="mb-2">
            <strong style={{ color: "var(--text)" }}>Obiettivo.</strong>{" "}
            Diventare il default anti-hallucination per ogni coding agent (Claude,
            Cursor, Copilot, Windsurf) e monetizzare l'intelligence derivata dalle
            query (top pacchetti allucinati, uso per-agent, trust maintainer).
          </p>
          <p className="mb-2">
            <strong style={{ color: "var(--text)" }}>Potenzialità.</strong>{" "}
            ClaudeBot+GPTBot già crawlano aggressivamente (22k/week). Ogni query
            agent alimenta un dataset unico che nessun competitor ha. Acqui-hire offer
            da Socket.dev declinata — moat data confermato.
          </p>
          <p className="mb-2">
            <strong style={{ color: "var(--green)" }}>Forza.</strong>{" "}
            Zero-auth/free per agent (flywheel), 19 ecosistemi (long-tail che
            Socket/Snyk ignorano), FAQPage citation-ready per LLM, GDPR-hashed
            telemetry, trust score 0-100 per maintainer (differenziante).
          </p>
          <p>
            <strong style={{ color: "var(--red)" }}>Debolezza.</strong>{" "}
            No capitale/team (single operator), copertura mainstream ancora parziale
            (npm 45k/3M), brand collision su Devpost, dipendenza da GitHub/Cloudflare,
            DB PostgreSQL SQL_ASCII legacy (Unicode sanitizer come workaround).
          </p>
        </section>
      </div>
    </div>
  );
}
