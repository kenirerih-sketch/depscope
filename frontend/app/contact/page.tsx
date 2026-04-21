"use client";
import { useState } from "react";
import { Card, CardBody, PageHeader, Section, Footer, Badge } from "../../components/ui";

const TYPES = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "listing", label: "Listing / catalog request" },
  { value: "partnership", label: "Partnership / integration" },
  { value: "press", label: "Press / media" },
  { value: "security", label: "Security disclosure" },
  { value: "other", label: "Other" },
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
    if (!consent) { setResponse("Please confirm the consent checkbox."); setStatus("err"); return; }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, type, subject, body, honeypot, source: "web", consent }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("err"); setResponse(data.detail || "Submission failed"); return; }
      setStatus("ok");
      setResponse(`Thanks. Reference #${data.id}. We'll reply at ${email}.`);
      setName(""); setEmail(""); setCompany(""); setSubject(""); setBody("");
    } catch (err: any) {
      setStatus("err");
      setResponse(err?.message || "Network error");
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <PageHeader
          eyebrow="Contact"
          title="Get in touch"
          description="Bug, feature, listing request, partnership, press, or security disclosure. We reply to every message — usually within one working day."
          actions={<Badge variant="success">Free · no signup</Badge>}
        />

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card><CardBody>
            <div className="text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">For agents</div>
            <div className="text-sm text-[var(--text)] mb-2">Use the MCP tool <code className="font-mono text-xs bg-[var(--bg-input)] px-1 rounded">contact_depscope</code></div>
            <a href="/integrate#mcp" className="text-xs text-[var(--accent)] hover:underline">How to add MCP →</a>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">For CLI</div>
            <pre className="text-xs font-mono text-[var(--accent)]">npx depscope-cli contact \\
 --type bug --subject ... --body ...</pre>
          </CardBody></Card>
          <Card><CardBody>
            <div className="text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">No public inbox</div>
            <div className="text-sm text-[var(--text)]">All inquiries go through the form below — we route internally to bug, security, press, partnership, etc.</div>
          </CardBody></Card>
        </div>

        <Section>
          <Card>
            <CardBody>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={120}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">Email <span className="text-[var(--red)]">*</span></label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={200}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">Company</label>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} maxLength={120}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">Type <span className="text-[var(--red)]">*</span></label>
                    <select required value={type} onChange={e => setType(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none">
                      {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">Subject <span className="text-[var(--red)]">*</span></label>
                  <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} minLength={3} maxLength={200}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--text-faded)] mb-1">Message <span className="text-[var(--red)]">*</span></label>
                  <textarea required value={body} onChange={e => setBody(e.target.value)} minLength={10} maxLength={8000} rows={8}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] font-mono focus:border-[var(--accent)] focus:outline-none" />
                  <div className="text-[11px] text-[var(--text-faded)] mt-1">{body.length}/8000</div>
                </div>
                {/* honeypot — hidden from humans */}
                <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)}
                  style={{ position: "absolute", left: "-10000px", height: 0, width: 0, opacity: 0 }} aria-hidden="true" />
                <label className="flex items-start gap-2 text-xs text-[var(--text-dim)] cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
                  <span>I agree to be contacted at the email above. Data handled per <a href="/privacy" className="text-[var(--accent)] hover:underline">privacy policy</a>.</span>
                </label>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div className="text-[11px] text-[var(--text-faded)]">
                    {status === "ok" && <span className="text-[var(--green)]">{response}</span>}
                    {status === "err" && <span className="text-[var(--red)]">{response}</span>}
                    {status === "sending" && <span>Sending…</span>}
                  </div>
                  <button type="submit" disabled={status === "sending"}
                    className="px-5 py-2 bg-[var(--accent)] text-black rounded font-medium text-sm hover:bg-[var(--accent-dim)] disabled:opacity-50 transition">
                    {status === "sending" ? "Sending…" : "Send message"}
                  </button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Section>

        <Section title="Company">
          <Card>
            <CardBody>
              <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
                <dt className="text-[var(--text-dim)]">Name</dt>
                <dd className="text-[var(--text)]">Cuttalo srl</dd>
                <dt className="text-[var(--text-dim)]">VAT (IT)</dt>
                <dd className="font-mono tabular-nums text-[var(--text)]">IT03242390734</dd>
                <dt className="text-[var(--text-dim)]">SDI</dt>
                <dd className="font-mono tabular-nums text-[var(--text)]">M5UXCR1</dd>
                <dt className="text-[var(--text-dim)]">Bug / feature</dt>
                <dd className="text-[var(--text)]">Use the form above (or MCP <code className="font-mono text-xs">contact_depscope</code>).</dd>
                <dt className="text-[var(--text-dim)]">Security disclosure</dt>
                <dd className="text-[var(--text)]">Form above with type <code className="font-mono text-xs">security</code> · <a href="/security/disclosure" className="text-[var(--accent)] hover:underline">disclosure policy</a></dd>
                <dt className="text-[var(--text-dim)]">Press / partnership</dt>
                <dd className="text-[var(--text)]">Form above with the relevant type.</dd>
                <dt className="text-[var(--text-dim)]">Legal</dt>
                <dd><a href="/legal" className="text-[var(--accent)] hover:underline">Terms</a> · <a href="/privacy" className="text-[var(--accent)] hover:underline">Privacy</a> · <a href="/dpa" className="text-[var(--accent)] hover:underline">DPA</a></dd>
                <dt className="text-[var(--text-dim)]">SLA / response</dt>
                <dd className="text-[var(--text)]">Best-effort, typically &lt; 24 working hours. Security disclosures get priority.</dd>
              </dl>
            </CardBody>
          </Card>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
