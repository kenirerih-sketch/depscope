"use client";
import { useState } from "react";

const TYPES = [
  { value: "bug", label: "Bug 报告" },
  { value: "feature", label: "功能请求" },
  { value: "listing", label: "目录 / 收录请求" },
  { value: "partnership", label: "合作 / 集成" },
  { value: "press", label: "媒体 / 新闻" },
  { value: "security", label: "安全披露" },
  { value: "other", label: "其他" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [response, setResponse] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setResponse("请确认同意复选框。"); setStatus("err"); return; }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, type, subject, body, honeypot, source: "web", consent }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("err"); setResponse(data.detail || "提交失败"); return; }
      setStatus("ok");
      setResponse(`感谢您。参考编号 #${data.id}。我们将通过 ${email} 回复。`);
      setName(""); setEmail(""); setCompany(""); setSubject(""); setBody("");
    } catch (err: any) {
      setStatus("err");
      setResponse(err?.message || "网络错误");
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="text-xs uppercase tracking-wider text-[var(--text-faded)]">联系我们</div>
          <h1 className="text-3xl font-bold mt-2 mb-2">取得联系</h1>
          <p className="text-sm text-[var(--text-dim)]">Bug、功能请求、收录、合作、媒体或安全披露。我们回复每一条消息 — 通常在一个工作日内。</p>
        </header>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">面向 AI 智能体</div>
            <div className="text-sm">使用 MCP 工具 <code className="font-mono text-xs bg-[var(--bg-input)] px-1 rounded">contact_depscope</code></div>
            <a href="/zh/integrate" className="text-xs text-[var(--accent)] hover:underline">如何添加 MCP →</a>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">面向 CLI</div>
            <pre className="text-xs font-mono text-[var(--accent)]">npx depscope-cli contact \\
 --type bug --subject ... --body ...</pre>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">无公开邮箱</div>
            <div className="text-sm">所有咨询通过下方表单 - 我们内部分流到 bug、安全、媒体、合作等。</div>
          </div>
        </div>

        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">姓名</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={120}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">邮箱 <span className="text-[var(--red)]">*</span></label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={200}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">公司</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} maxLength={120}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">类型 <span className="text-[var(--red)]">*</span></label>
                <select required value={type} onChange={e => setType(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">主题 <span className="text-[var(--red)]">*</span></label>
              <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} minLength={3} maxLength={200}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">消息 <span className="text-[var(--red)]">*</span></label>
              <textarea required value={body} onChange={e => setBody(e.target.value)} minLength={10} maxLength={8000} rows={8}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm font-mono" />
              <div className="text-[11px] text-[var(--text-faded)] mt-1">{body.length}/8000</div>
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)}
              style={{ position: "absolute", left: "-10000px", height: 0, width: 0, opacity: 0 }} aria-hidden="true" />
            <label className="flex items-start gap-2 text-xs text-[var(--text-dim)] cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
              <span>我同意通过上述邮箱接收联系。数据按 <a href="/zh/privacy" className="text-[var(--accent)] hover:underline">隐私政策</a> 处理。</span>
            </label>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <div className="text-[11px] text-[var(--text-faded)]">
                {status === "ok" && <span className="text-[var(--green)]">{response}</span>}
                {status === "err" && <span className="text-[var(--red)]">{response}</span>}
                {status === "sending" && <span>发送中…</span>}
              </div>
              <button type="submit" disabled={status === "sending"}
                className="px-5 py-2 bg-[var(--accent)] text-black rounded font-medium text-sm hover:bg-[var(--accent-dim)] disabled:opacity-50">
                {status === "sending" ? "发送中…" : "发送消息"}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6 mt-6">
          <h2 className="text-sm font-semibold mb-3">公司信息</h2>
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            <dt className="text-[var(--text-dim)]">公司名称</dt><dd>Cuttalo srl</dd>
            <dt className="text-[var(--text-dim)]">VAT (IT)</dt><dd className="font-mono">IT03242390734</dd>
            <dt className="text-[var(--text-dim)]">SDI</dt><dd className="font-mono">M5UXCR1</dd>
            <dt className="text-[var(--text-dim)]">Bug / 功能</dt><dd>使用上方表单 (或 MCP <code className="font-mono text-xs">contact_depscope</code>)。</dd>
            <dt className="text-[var(--text-dim)]">安全披露</dt><dd>上方表单选 <code className="font-mono text-xs">security</code> · <a href="/zh/security/disclosure" className="text-[var(--accent)] hover:underline">披露政策</a></dd>
            <dt className="text-[var(--text-dim)]">媒体 / 合作</dt><dd>上方表单选相应类型。</dd>
            <dt className="text-[var(--text-dim)]">法律</dt><dd><a href="/zh/legal" className="text-[var(--accent)] hover:underline">条款</a> · <a href="/zh/privacy" className="text-[var(--accent)] hover:underline">隐私</a> · <a href="/zh/dpa" className="text-[var(--accent)] hover:underline">DPA</a></dd>
            <dt className="text-[var(--text-dim)]">SLA / 响应</dt><dd>最大努力，通常 &lt; 24 工作小时。安全披露优先处理。</dd>
          </dl>
        </div>
      </main>
    </div>
  );
}
