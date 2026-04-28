// SEO_V2: CSV export of the hallucination corpus. Pulls the JSON from the
// public API and converts. No backend changes required.
const API = "http://127.0.0.1:8000/api/benchmark/hallucinations?limit=10000";

interface Entry {
  ecosystem: string;
  package_name: string;
  source: string;
  evidence?: string;
  first_seen_at?: string | null;
  hit_count: number;
  likely_real_alternative?: string | null;
}

function csvEscape(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export const revalidate = 3600;

export async function GET() {
  let entries: Entry[] = [];
  try {
    const r = await fetch(API, { next: { revalidate: 3600 } });
    if (r.ok) {
      const j = await r.json();
      entries = (j.entries ?? []) as Entry[];
    }
  } catch { /* fallthrough */ }

  const header = [
    "ecosystem",
    "package_name",
    "source",
    "first_seen_at",
    "hit_count",
    "likely_real_alternative",
    "evidence",
  ];
  const rows = entries.map((e) => [
    e.ecosystem,
    e.package_name,
    e.source,
    e.first_seen_at ?? "",
    e.hit_count,
    e.likely_real_alternative ?? "",
    e.evidence ?? "",
  ].map(csvEscape).join(","));

  const body = `${header.join(",")}\n${rows.join("\n")}\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="depscope-hallucinations.csv"',
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
