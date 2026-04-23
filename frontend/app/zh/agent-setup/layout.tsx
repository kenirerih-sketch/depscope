import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI助手设置 | DepScope",
  alternates: { canonical: "https://depscope.dev/zh/agent-setup" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
