// Server component — password gate.
// Reads cookie directly + HMAC-verifies it against ADMIN_PASSWORD +
// ADMIN_PW_SECRET. No outbound fetch. If invalid → redirect to /admin-login.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "node:crypto";
import AdminSidebar from "./AdminSidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const COOKIE_NAME = "depscope_admin_pw";

function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_PW_SECRET || "ds_pw_default_secret_please_rotate";
  if (!pw) return null;
  return createHmac("sha256", secret).update(pw).digest("hex").slice(0, 32);
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const expected = expectedToken();
  const c = await cookies();
  const presented = c.get(COOKIE_NAME)?.value;

  if (!expected || !presented || presented !== expected) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
