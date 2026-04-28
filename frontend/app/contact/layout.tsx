import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact DepScope — Enterprise inquiries, support, partnerships",
  description: "Get in touch with DepScope for enterprise inquiries, integration help, partnerships, or to report a security issue.",
  alternates: { canonical: "https://depscope.dev/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
