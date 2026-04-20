
import React from "react";

type Props = {
  data: any;
};

function Gauge({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const color =
    value >= 7.5 ? "var(--green)" :
    value >= 5 ? "var(--accent)" :
    value >= 3 ? "var(--amber, #ffb94a)" :
                 "var(--red)";
  return (
    <div style={{ position: "relative", width: "100%", height: 8, background: "var(--bg-soft)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width 300ms" }} />
    </div>
  );
}

export function SecurityPanel({ data }: Props) {
  const mal = data?.malicious || {};
  const typ = data?.typosquat || {};
  const sc = data?.scorecard || {};
  const mt = data?.maintainer_trust || {};
  const ql = data?.quality || {};
  const vulns = data?.vulnerabilities || {};
  const active = vulns.actively_exploited_count || 0;
  const likely = vulns.likely_exploited_count || 0;

  const anything =
    mal.is_malicious ||
    typ.is_suspected ||
    active || likely ||
    (sc.available && typeof sc.score === "number") ||
    (mt.available && (mt.alerts?.length || mt.bus_factor_3m !== undefined)) ||
    (ql.available && (ql.criticality_score !== null || ql.velocity_trend || ql.publish_security));

  if (!anything) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {mal.is_malicious && (
        <div style={{
          padding: "14px 18px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid var(--red)",
          borderLeft: "4px solid var(--red)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--red)", fontWeight: 600 }}>
            ⚠ Malicious package
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "var(--text)" }}>
            This package is flagged as <strong>malicious</strong> by the OpenSSF/OSV community feed.{" "}
            Do not install.
          </div>
          {mal.advisory_id && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>
              Advisory: <code>{mal.advisory_id}</code>
              {mal.summary ? ` — ${mal.summary}` : ""}
            </div>
          )}
        </div>
      )}

      {typ.is_suspected && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(255,185,74,0.08)",
          border: "1px solid var(--amber, #ffb94a)",
          borderLeft: "4px solid var(--amber, #ffb94a)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--amber, #ffb94a)", fontWeight: 600 }}>
            ⚠ Possible typosquat
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "var(--text)" }}>
            Name is close to a popular package. Targets:
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(typ.targets || []).slice(0, 3).map((t: any, i: number) => (
              <span key={i} style={{
                padding: "2px 8px",
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
              }}>
                {t.legitimate_package}{" "}
                <span style={{ color: "var(--text-dim)" }}>
                  ({t.reason} dist {t.distance})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {(active > 0 || likely > 0) && (
        <div style={{
          padding: "12px 16px",
          background: "var(--bg-soft)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>
            Threat intelligence
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 16, fontSize: 14 }}>
            {active > 0 && (
              <span style={{ color: "var(--red)", fontWeight: 600 }}>
                {active} actively exploited <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(CISA KEV)</span>
              </span>
            )}
            {likely > 0 && (
              <span style={{ color: "var(--amber, #ffb94a)", fontWeight: 600 }}>
                {likely} likely exploited <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(EPSS ≥ 0.5)</span>
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>
            Threat tier per vulnerability derived from CISA KEV catalog + FIRST.org EPSS scores.
          </div>
        </div>
      )}

      {sc.available && typeof sc.score === "number" && (
        <div style={{
          padding: "14px 18px",
          background: "var(--bg-soft)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>
                OSS Scorecard
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "var(--text-dim)" }}>
                OpenSSF security posture score
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "var(--text)", fontFamily: "ui-monospace, Menlo, monospace" }}>
                {sc.score.toFixed(1)}
                <span style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 400 }}>/10</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {sc.tier}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Gauge value={sc.score} />
          </div>
          {sc.at_risk_checks && sc.at_risk_checks.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
              At risk: {sc.at_risk_checks.slice(0, 5).join(" · ")}
            </div>
          )}
        </div>
      )}

      {mt.available && (mt.bus_factor_3m !== undefined || mt.alerts?.length) && (
        <div style={{
          padding: "14px 18px",
          background: "var(--bg-soft)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>
            Maintainer trust
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, fontSize: 13 }}>
            {mt.bus_factor_3m !== undefined && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Active maintainers (3m)
                </div>
                <div style={{ fontSize: 18, fontFamily: "ui-monospace, Menlo, monospace", color: mt.bus_factor_3m === 1 ? "var(--amber, #ffb94a)" : "var(--text)" }}>
                  {mt.bus_factor_3m}
                </div>
              </div>
            )}
            {mt.active_contributors_12m !== undefined && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Contributors (12m)
                </div>
                <div style={{ fontSize: 18, fontFamily: "ui-monospace, Menlo, monospace" }}>
                  {mt.active_contributors_12m}
                </div>
              </div>
            )}
            {mt.primary_author_ratio !== null && mt.primary_author_ratio !== undefined && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Primary author dominance
                </div>
                <div style={{ fontSize: 18, fontFamily: "ui-monospace, Menlo, monospace", color: mt.primary_author_ratio >= 0.9 ? "var(--amber, #ffb94a)" : "var(--text)" }}>
                  {(mt.primary_author_ratio * 100).toFixed(0)}%
                </div>
              </div>
            )}
            {mt.stars !== undefined && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  GitHub stars
                </div>
                <div style={{ fontSize: 18, fontFamily: "ui-monospace, Menlo, monospace" }}>
                  {(mt.stars || 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          {mt.alerts && mt.alerts.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {mt.alerts.map((a: string, i: number) => (
                <span key={i} style={{
                  padding: "2px 8px",
                  background: "rgba(255,185,74,0.1)",
                  border: "1px solid var(--amber, #ffb94a)",
                  borderRadius: 999,
                  fontSize: 11,
                  color: "var(--amber, #ffb94a)",
                  fontFamily: "ui-monospace, Menlo, monospace",
                }}>
                  {a.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {ql.available && (ql.criticality_score !== null || ql.velocity_trend || ql.publish_security) && (
        <div style={{
          padding: "14px 18px",
          background: "var(--bg-soft)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>
            Quality signals
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 13 }}>
            {ql.criticality_score !== null && ql.criticality_score !== undefined && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  OSS Criticality
                </div>
                <div style={{ fontSize: 18, fontFamily: "ui-monospace, Menlo, monospace", color:
                  ql.criticality_tier === "critical" ? "var(--accent)" :
                  ql.criticality_tier === "high" ? "var(--accent)" :
                  "var(--text)" }}>
                  {Number(ql.criticality_score).toFixed(2)}
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 6, fontWeight: 400 }}>{ql.criticality_tier}</span>
                </div>
              </div>
            )}
            {ql.velocity_trend && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Download trend
                </div>
                <div style={{ fontSize: 14, fontFamily: "ui-monospace, Menlo, monospace", color:
                  ql.velocity_trend === "rapid_growth" ? "var(--green)" :
                  ql.velocity_trend === "growing" ? "var(--green)" :
                  ql.velocity_trend === "rapid_decline" ? "var(--red)" :
                  ql.velocity_trend === "declining" ? "var(--amber, #ffb94a)" :
                  "var(--text)" }}>
                  {ql.velocity_trend.replace(/_/g, " ")}
                  {ql.velocity_pct !== null && ql.velocity_pct !== undefined && (
                    <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 6 }}>
                      ({ql.velocity_pct > 0 ? "+" : ""}{ql.velocity_pct}%)
                    </span>
                  )}
                </div>
              </div>
            )}
            {ql.publish_security && (
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Publish security
                </div>
                <div style={{ fontSize: 14, fontFamily: "ui-monospace, Menlo, monospace", color:
                  ql.publish_security === "signed" || ql.publish_security === "attested" || ql.publish_security === "trusted" ? "var(--green)" :
                  ql.publish_security === "unsigned" || ql.publish_security === "api_token" ? "var(--amber, #ffb94a)" :
                  "var(--text)" }}>
                  {ql.publish_security === "signed" ? "npm signed" :
                   ql.publish_security === "attested" ? "npm attested" :
                   ql.publish_security === "trusted" ? "PyPI trusted" :
                   ql.publish_security === "likely_trusted" ? "PyPI trusted?" :
                   ql.publish_security === "unsigned" ? "unsigned" :
                   ql.publish_security === "api_token" ? "API token" :
                   ql.publish_security}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
