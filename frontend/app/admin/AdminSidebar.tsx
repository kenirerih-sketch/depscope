"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin",                label: "Overview",        icon: "◐" },
  { href: "/admin/traffic",        label: "Traffic",         icon: "↗" },
  { href: "/admin/database",       label: "Database",        icon: "◈" },
  { href: "/admin/infrastructure", label: "Infrastructure",  icon: "⚙" },
  { href: "/admin/marketing",      label: "Marketing",       icon: "✉" },
  { href: "/admin/agents",         label: "Agents",          icon: "◉" },
  { href: "/admin/launch",         label: "Launch",          icon: "▲" },
  { href: "/admin/settings",       label: "Settings",        icon: "⌘" },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname() || "/admin";

  return (
    <aside className="w-60 shrink-0 border-r sticky top-0 h-screen flex flex-col"
           style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: "var(--accent)" }}>
          <span>◆</span><span>DepScope Admin</span>
        </Link>
        <div className="text-xs mt-1" style={{ color: "var(--text-faded)" }}>
          cuttalo srl · v0.7.0
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map(item => {
          const active = pathname === item.href
            || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition"
              style={{
                background: active ? "var(--bg-hover)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-dim)",
                fontWeight: active ? 600 : 400,
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              <span style={{ width: 16, textAlign: "center", fontFamily: "var(--font-mono)" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t text-xs space-y-2"
           style={{ borderColor: "var(--border)", color: "var(--text-faded)" }}>
        <a href="/api-docs" target="_blank" rel="noreferrer"
           className="block hover:text-[var(--accent)]">→ /api-docs</a>
        <a href="https://mcp.depscope.dev/mcp" target="_blank" rel="noreferrer"
           className="block hover:text-[var(--accent)]">→ MCP endpoint</a>
        <a href="/api/auth/logout"
           className="block hover:text-[var(--red)]">→ logout</a>
      </div>
    </aside>
  );
}
