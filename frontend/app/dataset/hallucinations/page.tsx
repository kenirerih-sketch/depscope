// SEO_V2: Public-facing landing for the AI Hallucination Corpus.
// Server-rendered with revalidate=3600 so Google sees a content-rich page,
// and humans get a usable preview + download links.
const API = "http://127.0.0.1:8000/api/benchmark/hallucinations";

interface Entry {
  ecosystem: string;
  package_name: string;
  source: string;
  evidence: string;
  first_seen_at?: string | null;
  hit_count: number;
  likely_real_alternative?: string | null;
}

interface CorpusResponse {
  total_corpus_size?: number;
  returned?: number;
  entries?: Entry[];
}

export const revalidate = 3600;

async function fetchCorpus(): Promise<CorpusResponse | null> {
  try {
    const r = await fetch(`${API}?limit=200`, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    return (await r.json()) as CorpusResponse;
  } catch { return null; }
}

export default async function Page() {
  const data = await fetchCorpus();
  const entries = data?.entries ?? [];
  const total = data?.total_corpus_size ?? entries.length;

  // Group by ecosystem for an at-a-glance breakdown
  const byEco: Record<string, number> = {};
  for (const e of entries) byEco[e.ecosystem] = (byEco[e.ecosystem] || 0) + 1;
  const ecoSummary = Object.entries(byEco).sort((a, b) => b[1] - a[1]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px", fontFamily: "var(--font-inter), system-ui, sans-serif", lineHeight: 1.6 }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
        <a href="/" style={{ color: "#60a5fa", textDecoration: "none" }}>Home</a>
        <span style={{ margin: "0 8px" }}>›</span>
        <span>Datasets</span>
        <span style={{ margin: "0 8px" }}>›</span>
        <span>AI Hallucination Corpus</span>
      </nav>

      <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
        AI Hallucination Corpus
      </h1>
      <p style={{ fontSize: 20, color: "#9ca3af", marginBottom: 32 }}>
        Public dataset of package names that AI coding agents commonly invent.
        Daily updates from real traffic. CC0 — public domain. {total} entries across {ecoSummary.length} ecosystems.
      </p>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
        <a
          href="/api/benchmark/hallucinations"
          style={{ padding: "10px 18px", borderRadius: 8, background: "#1f2937", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
        >
          ⬇ JSON ({total} entries)
        </a>
        <a
          href="/dataset/hallucinations/csv"
          style={{ padding: "10px 18px", borderRadius: 8, background: "#1f2937", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
        >
          ⬇ CSV
        </a>
        <a
          href="https://depscope.dev/api/benchmark/verify"
          style={{ padding: "10px 18px", borderRadius: 8, background: "#0b0f17", color: "#9ca3af", textDecoration: "none", fontSize: 14, border: "1px solid #1f2937" }}
        >
          /api/benchmark/verify
        </a>
      </section>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Why this exists</h2>
      <p style={{ color: "#d1d5db", marginBottom: 24 }}>
        AI coding agents — Claude Code, ChatGPT, Cursor, GitHub Copilot, Aider, Windsurf, Cline, Continue, Zed, Codex — sometimes
        suggest installing packages that <strong>do not exist</strong>. Attackers know this, and register the hallucinated names with
        malicious payloads (the &ldquo;slopsquat&rdquo; supply-chain pattern). This corpus captures real names, daily, so researchers
        and tool builders can benchmark hallucination rates and ship guardrails.
      </p>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Coverage</h2>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {ecoSummary.map(([eco, n]) => (
          <li key={eco} style={{ padding: "8px 12px", background: "#0b0f17", border: "1px solid #1f2937", borderRadius: 6, fontSize: 13 }}>
            <strong>{eco}</strong>: {n}
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>License & citation</h2>
      <p style={{ color: "#d1d5db", marginBottom: 8 }}>
        <strong>CC0 1.0 Universal</strong> — public domain. No attribution required, but appreciated:
      </p>
      <pre style={{ background: "#0b0f17", border: "1px solid #1f2937", borderRadius: 6, padding: 12, fontSize: 13, color: "#9ca3af", overflowX: "auto" }}>
{`DepScope AI Hallucination Corpus. Cuttalo srl, 2026.
https://depscope.dev/dataset/hallucinations`}
      </pre>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 32, marginBottom: 16 }}>Top entries (preview)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1f2937", textAlign: "left", color: "#6b7280" }}>
            <th style={{ padding: 8 }}>Ecosystem</th>
            <th style={{ padding: 8 }}>Hallucinated name</th>
            <th style={{ padding: 8 }}>Likely meant</th>
            <th style={{ padding: 8 }}>Hits</th>
            <th style={{ padding: 8 }}>Source</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 50).map((e) => (
            <tr key={`${e.ecosystem}/${e.package_name}`} style={{ borderBottom: "1px solid #111827" }}>
              <td style={{ padding: 8, color: "#9ca3af" }}>{e.ecosystem}</td>
              <td style={{ padding: 8, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                {e.package_name}
              </td>
              <td style={{ padding: 8, fontFamily: "var(--font-jetbrains-mono), monospace", color: "#9ca3af" }}>
                {e.likely_real_alternative ?? "—"}
              </td>
              <td style={{ padding: 8 }}>{e.hit_count}</td>
              <td style={{ padding: 8, color: "#6b7280" }}>{e.source}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 16 }}>
        Showing top 50 by hit count. Full corpus via <a href="/api/benchmark/hallucinations" style={{ color: "#60a5fa" }}>JSON</a> or <a href="/dataset/hallucinations/csv" style={{ color: "#60a5fa" }}>CSV</a>.
      </p>
    </main>
  );
}
