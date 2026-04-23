import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "联系我们 | DepScope",
  alternates: { canonical: "https://depscope.dev/zh/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
