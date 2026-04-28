// SEO_V2: Related-links block under each package page.
// Server component — fetches alternatives + breaking + bugs counts in parallel
// and emits a small <aside> with internal links. Boosts internal linking
// density, fights the "orphan page" SEO problem on the 749k+ pkg pages.
const API = "http://127.0.0.1:8000";

interface AltResponse {
  alternatives?: Array<{ name: string; reason?: string }>;
}
interface BreakingResponse {
  total?: number;
  changes?: unknown[];
}
interface BugsResponse {
  total?: number;
  bugs?: unknown[];
}

async function _safe<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

const ECO_LABEL: Record<string, string> = {
  npm: "npm", pypi: "PyPI", cargo: "Cargo", go: "Go", composer: "Composer",
  maven: "Maven", nuget: "NuGet", rubygems: "RubyGems", pub: "Pub",
  hex: "Hex", swift: "Swift PM", cocoapods: "CocoaPods", cpan: "CPAN",
  hackage: "Hackage", cran: "CRAN", conda: "conda-forge", homebrew: "Homebrew",
  jsr: "JSR", julia: "Julia",
};

interface Props {
  ecosystem: string;
  pkg: string;
}

export default async function RelatedLinks({ ecosystem, pkg }: Props) {
  const enc = pkg.split("/").map(encodeURIComponent).join("/");
  const [alt, br, bg] = await Promise.all([
    _safe<AltResponse>(`${API}/api/alternatives/${ecosystem}/${enc}`),
    _safe<BreakingResponse>(`${API}/api/breaking/${ecosystem}/${enc}`),
    _safe<BugsResponse>(`${API}/api/bugs/${ecosystem}/${enc}`),
  ]);

  const alternatives = (alt?.alternatives ?? []).slice(0, 4);
  const breakingTotal = br?.total ?? br?.changes?.length ?? 0;
  const bugsTotal = bg?.total ?? bg?.bugs?.length ?? 0;
  const ecoLabel = ECO_LABEL[ecosystem] || ecosystem;

  // Skip rendering if nothing to link to (avoids empty aside on SERP-poor pages)
  if (!alternatives.length && !breakingTotal && !bugsTotal) return null;

  return (
    <aside
      aria-label="Related on DepScope"
      style={{
        maxWidth: 1280,
        margin: "48px auto 0",
        padding: "32px 24px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: "#9ca3af" }}>
        Related on DepScope
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {alternatives.length > 0 && (
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 }}>
              Alternatives
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {alternatives.map((a) => (
                <li key={a.name} style={{ marginBottom: 6 }}>
                  <a
                    href={`/pkg/${ecosystem}/${a.name.split("/").map(encodeURIComponent).join("/")}`}
                    style={{ color: "#60a5fa", textDecoration: "none" }}
                  >
                    {a.name}
                  </a>
                  {a.reason ? (
                    <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 6 }}>
                      — {a.reason.slice(0, 60)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {breakingTotal > 0 && (
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 }}>
              Breaking changes
            </div>
            <a
              href={`/breaking/${ecosystem}/${enc}`}
              style={{ color: "#60a5fa", textDecoration: "none" }}
            >
              {breakingTotal} recorded change{breakingTotal === 1 ? "" : "s"} →
            </a>
          </div>
        )}

        {bugsTotal > 0 && (
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 }}>
              Known bugs
            </div>
            <a
              href={`/bugs/${ecosystem}/${enc}`}
              style={{ color: "#60a5fa", textDecoration: "none" }}
            >
              {bugsTotal} non-CVE bug{bugsTotal === 1 ? "" : "s"} →
            </a>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 }}>
            More
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.8 }}>
            <li>
              <a href={`/for/${ecosystem}`} style={{ color: "#60a5fa", textDecoration: "none" }}>
                All {ecoLabel} packages →
              </a>
            </li>
            <li>
              <a href={`/explore/breaking`} style={{ color: "#60a5fa", textDecoration: "none" }}>
                Breaking changes index →
              </a>
            </li>
            <li>
              <a href={`/explore/bugs`} style={{ color: "#60a5fa", textDecoration: "none" }}>
                Bug index →
              </a>
            </li>
            <li>
              <a href={`/dataset/hallucinations`} style={{ color: "#60a5fa", textDecoration: "none" }}>
                AI hallucination corpus →
              </a>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
