"use client";

import { ReactNode } from "react";

// ── Page-level header used by every admin sub-page ──────────────────
export function AdminShell({
  title, subtitle, actions, children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-8 py-6 max-w-7xl">
      <header className="flex items-start justify-between mb-6 pb-4"
              style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Card({
  title, children, action,
}: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg p-5"
         style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-dim)" }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({
  label, value, delta, sub,
}: { label: string; value: string | number; delta?: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-faded)" }}>
        {label}
      </div>
      <div className="text-2xl font-semibold font-mono">{value}</div>
      {delta && (
        <div className="text-xs mt-1"
             style={{ color: delta.startsWith("+") ? "var(--green)" : "var(--red)" }}>
          {delta}
        </div>
      )}
      {sub && <div className="text-xs mt-1" style={{ color: "var(--text-faded)" }}>{sub}</div>}
    </div>
  );
}

export function Grid({ cols = 4, children }: { cols?: number; children: ReactNode }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {children}
    </div>
  );
}

export function Table({
  headers, rows,
}: { headers: string[]; rows: (string | number | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {headers.map(h => (
              <th key={h} className="text-left py-2 pr-4 text-xs uppercase tracking-wider font-medium"
                  style={{ color: "var(--text-faded)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-hover)]"
                style={{ borderBottom: "1px solid var(--border)" }}>
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4 font-mono text-xs">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pill({
  children, color = "default",
}: { children: ReactNode; color?: "default" | "green" | "red" | "orange" | "blue" }) {
  const bg = {
    default: "var(--bg-hover)",
    green:   "color-mix(in srgb, var(--green) 15%, transparent)",
    red:     "color-mix(in srgb, var(--red) 15%, transparent)",
    orange:  "color-mix(in srgb, var(--orange) 15%, transparent)",
    blue:    "color-mix(in srgb, var(--blue) 15%, transparent)",
  }[color];
  const fg = {
    default: "var(--text-dim)",
    green:   "var(--green)",
    red:     "var(--red)",
    orange:  "var(--orange)",
    blue:    "var(--blue)",
  }[color];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}
