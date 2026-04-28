import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent Setup — Claude Code, Cursor, Cline, Aider",
  description: "Connect DepScope MCP to Claude Code, Cursor, Cline, Aider, and Continue.dev in 60 seconds. Zero auth, free package intelligence for AI coding agents.",
  alternates: { canonical: "https://depscope.dev/agent-setup" },
};

export default function AgentSetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
