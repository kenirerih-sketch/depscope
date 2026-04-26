"use client";

import { useEffect, useState } from "react";

// --------------------------------------------------------------------------- //
// Types
// --------------------------------------------------------------------------- //

interface PlanMetrics {
  verticals: {
    packages: number;
    vulnerabilities: number;
    alternatives: number;
    breaking_changes: number;
    errors: number;
    known_bugs: number;
    compat_matrix: number;
  };
  ecosystems: {
    ecosystem: string;
    packages: number;
    vulnerabilities: number;
    alternatives: number;
    breaking_changes: number;
    known_bugs: number;
  }[];
  usage: {
    api_calls_total: number;
    api_calls_30d: number;
    api_calls_7d: number;
    unique_ips_30d: number;
  };
  users: { total: number; active_api_keys: number; by_plan: Record<string, number> };
  revenue: { subscriptions_by_status: Record<string, number>; mrr_eur: number; paying_customers: number };
  distribution: {
    mcp_npm_version_latest: string;
    gpt_store_live: boolean;
    rapidapi_live: boolean;
    total_ecosystems_declared: number;
    ecosystems_with_breaking_or_bugs: number;
  };
}

interface ActionItem {
  id: string;
  area:
    | "exit"
    | "data"
    | "distribution"
    | "frontend"
    | "dx"
    | "reliability"
    | "growth";
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  effort: "XS" | "S" | "M" | "L" | "XL";
  owner: string;
  status: "todo" | "doing" | "done";
}

// --------------------------------------------------------------------------- //
// Potential acquirers — la bussola vera del piano
// --------------------------------------------------------------------------- //

interface Acquirer {
  name: string;
  tier: "competitor" | "platform" | "strategic_ai";
  priceRangeEur: string;
  fit: string;
  theyWant: string;
  signal: string;
}

const ACQUIRERS: Acquirer[] = [
  {
    name: "Snyk",
    tier: "competitor",
    priceRangeEur: "1-5M",
    fit: "alto",
    theyWant: "coverage cross-ecosystem (CPAN, Hackage, Hex, Pub — che loro non curano)",
    signal: "storia acquisizioni: FossID, Manifest, Enso. Valutazione $8.5B. Compra dataset complementari.",
  },
  {
    name: "Socket.dev",
    tier: "competitor",
    priceRangeEur: "1-3M",
    fit: "alto",
    theyWant: "MCP-first positioning, dataset agent-native",
    signal: "Series B $65M 2024. Aggressivi su supply chain. Potrebbero voler presidio AI-agent.",
  },
  {
    name: "GitHub (Microsoft)",
    tier: "platform",
    priceRangeEur: "5-20M",
    fit: "medio-alto",
    theyWant: "estensione Dependabot/Advisory Database a ecosistemi minori + MCP layer",
    signal: "pattern storico: acquista adjacent per security tab. npm già loro.",
  },
  {
    name: "Cloudflare",
    tier: "platform",
    priceRangeEur: "5-15M",
    fit: "medio",
    theyWant: "data product (Radar per open source) + posizionamento dev-friendly EU",
    signal: "tendenza a comprare data asset (es. Zaraz). Amano prodotti API-first e neutrali.",
  },
  {
    name: "Anthropic",
    tier: "strategic_ai",
    priceRangeEur: "10-50M",
    fit: "solo se distribution massiva",
    theyWant: "infrastruttura package intel default per Claude, ground-truth per ridurre hallucination",
    signal: "prima dovremmo essere default in Claude Code o citati nei loro docs. Tempo necessario 18-36m.",
  },
  {
    name: "OpenAI",
    tier: "strategic_ai",
    priceRangeEur: "10-50M",
    fit: "solo se distribution massiva",
    theyWant: "package intel per ChatGPT coding e agenti GPT",
    signal: "acquisition playbook meno chiaro di Anthropic. Alta soglia d'ingresso.",
  },
  {
    name: "Datadog",
    tier: "platform",
    priceRangeEur: "3-10M",
    fit: "medio",
    theyWant: "estensione SCA del loro security product",
    signal: "recent push su application security. Hanno budget per bolt-on.",
  },
  {
    name: "Sonatype / JFrog",
    tier: "competitor",
    priceRangeEur: "500k-2M",
    fit: "basso-medio",
    theyWant: "commoditization supply-chain, prezzo basso, acqui-hire",
    signal: "incumbent enterprise lenti. Fallback di ultimo piano, non il target principale.",
  },
  {
    name: "Chainguard",
    tier: "competitor",
    priceRangeEur: "2-8M",
    fit: "medio",
    theyWant: "dataset per ampliare 'secure by default' oltre container images",
    signal: "ben finanziati, growing fast. Cultura engineering-heavy, potrebbero apprezzare codebase pulito.",
  },
  {
    name: "Cursor / Windsurf / Vercel",
    tier: "strategic_ai",
    priceRangeEur: "3-15M",
    fit: "asimmetrico",
    theyWant: "integrazione nativa per dar valore ai loro agenti, differenziazione",
    signal: "scenario sorprendente: se uno di loro ci integra di default, logico step successivo.",
  },
];

// --------------------------------------------------------------------------- //
// Action items — backlog centrato sull'EXIT, non sul revenue
// --------------------------------------------------------------------------- //

const INITIAL_ACTIONS: ActionItem[] = [
  // =========== EXIT — la spina dorsale ===========
  {
    id: "EXIT-1",
    area: "exit",
    title: "Scrivere exit_thesis.md (10 compratori, fit, prezzo, timeline)",
    detail:
      "Documento bussola: lista sopra formalizzata in file, con per ciascun compratore: cosa cerca, cosa DepScope offre, range prezzo, segnali concreti di interesse, timeline realistica. Da rivalutare ogni mese. Ogni decisione tecnica/business va misurata contro questo file.",
    impact: "high",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "EXIT-2",
    area: "exit",
    title: "M&A signal log mensile (cosa compra il mercato, a quale multiplo)",
    detail:
      "Foglio/JSON aggiornato mensilmente: tutte le acquisizioni nel nostro spazio (supply chain security, dev tools, MCP infra, data API). Prezzo, multiplo su ARR/utenti, acquirer. Segnala quando il mercato si apre/chiude. Alimenta l'exit_thesis.",
    impact: "medium",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "EXIT-3",
    area: "exit",
    title: "IP + license audit (due-diligence ready)",
    detail:
      "Ogni exit salta o si svaluta se la DD trova: GPL in codice proprietario, asset di terzi senza licenza, dati scraped senza ToS verificati, commit con credenziali, nomi dominio/trademark contesi. Audit da fare ORA mentre il repo è piccolo. Output: LICENSES.md + DATA_SOURCES.md.",
    impact: "high",
    effort: "M",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "EXIT-4",
    area: "exit",
    title: "Public stats dashboard (trust signal per buyer)",
    detail:
      "Pagina /stats pubblica con numeri onesti: API calls/mese segmentate per tipo client, coverage ecosistemi, freshness dati, uptime. Un compratore serio guarda questa pagina prima di contattarti. Trasparenza = fiducia = multiplo più alto.",
    impact: "medium",
    effort: "S",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "EXIT-5",
    area: "exit",
    title: "Primo warm intro a 1 potenziale acquirer (via network EU/IT)",
    detail:
      "Non cold outreach \"vendimi DepScope\". Piuttosto: intro con un founder o advisor italiano che conosce VP Product di Snyk o GitHub. Messaggio: \"voglio un feedback sul dataset\". La conversazione si apre da sola. Timeline: mese 9-12.",
    impact: "high",
    effort: "M",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "EXIT-6",
    area: "exit",
    title: "Trademark DepScope + clean ownership structure",
    detail:
      "Registrare marchio EU (EUIPO, ~900€ una tantum, 10 anni). Verificare che tutti gli asset (dominio, npm org, GitHub org, repo, server) siano intestati a UNA entità chiara (Cuttalo SRL o nuova NewCo). Asset frammentati = friction in DD, sconto 20-30%.",
    impact: "medium",
    effort: "M",
    owner: "Vincenzo",
    status: "todo",
  },

  // =========== DATA — il moat vero ===========
  {
    id: "DATA-1",
    area: "data",
    title: "Coprire i 8 ecosistemi oggi vuoti (pub, hex, cocoapods, cpan, hackage, cran, conda, homebrew)",
    detail:
      "Snyk/Socket non coprono bene questi. È il nostro differenziale in DD. Top 50 pkg/ecosystem con breaking + bugs + alternatives = 400 entry di credibilità cross-ecosystem. Priorità ALTA nel modello acquisition: è esattamente ciò che un compratore vuole.",
    impact: "high",
    effort: "L",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DATA-2",
    area: "data",
    title: "Crawler automatico GitHub changelog → breaking_changes",
    detail:
      "Cron notturno top-500 package/ecosystem. Parser CHANGELOG.md + sezioni BREAKING. GitHub token free 5k req/h. Senza automation i dati invecchiano in 6 mesi e il moat sparisce.",
    impact: "high",
    effort: "L",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DATA-3",
    area: "data",
    title: "Crawler GitHub issues closed+fix → errors",
    detail:
      "Top 100 repo (react, next, prisma, express, django, fastapi). Label bug + state closed + linked PR. Scale errors da 55 a ~500 entry verificabili con source URL.",
    impact: "high",
    effort: "L",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DATA-4",
    area: "data",
    title: "Signal unico #1: cross-ecosystem typosquat detection",
    detail:
      "Snyk e Socket fanno typosquat intra-ecosystem. Nessuno fa cross (npm \"react-native\" vs pypi \"react-native\" — stesso nome, maintainer diverso = signal). Tabella typosquat_candidates esiste già. Estendere con cross-match. Feature brevettabile, irresistibile in pitch.",
    impact: "high",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DATA-5",
    area: "data",
    title: "Signal unico #2: maintainer trust score",
    detail:
      "Score 0-100 per maintainer basato su: età account, numero commit ultimi 12m, diversità contributi, bad-actor signals, link a profili verified. Tabella maintainer_signals esiste. Va trasformata in score consultabile da API. Differenzia da competitor.",
    impact: "high",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DATA-6",
    area: "data",
    title: "Signal unico #3: agent-query trend report (data product)",
    detail:
      "Aggregato anonimo di cosa chiedono gli agenti AI in tempo reale. \"Questa settimana react 19.2 ha il 340% di query in più: perché?\". Niente vende meglio a Cloudflare/Datadog di un data product originale. Richiede segmentazione accurata source=gpt/claude/cursor/mcp.",
    impact: "medium",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },

  // =========== DISTRIBUTION — proof of traction ===========
  {
    id: "DIST-1",
    area: "distribution",
    title: "Publish MCP server v0.2.0 su npm",
    detail:
      "File aggiornato in /home/deploy/depscope/mcp-server, package.json 0.2.0 pronto. Comando: cd mcp-server && npm publish. Utente logged come depscope su npm. Downloads/settimana = metrica visibile in DD.",
    impact: "high",
    effort: "XS",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "DIST-2",
    area: "distribution",
    title: "Primo git commit + push su GitHub (repo pubblico)",
    detail:
      "Repo github.com/cuttalo/depscope attualmente vuoto. Nessun acquirer guarda un asset senza codice pubblico. Stars/forks/issues sono segnali nel funnel DD. Attenzione: scrub credenziali PRIMA del primo push (già fatto 21 Apr).",
    impact: "high",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "DIST-3",
    area: "distribution",
    title: "Submit Smithery + mcp.so + Anthropic MCP registry",
    detail:
      "Tre registry MCP principali. Richiedono solo repo pubblico + smithery.yaml (già presente). Essere listed = comparire nelle ricerche dev + nelle demo di Cursor/Claude. Signal di adozione.",
    impact: "high",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "DIST-4",
    area: "distribution",
    title: "Google Search Console: re-submit sitemap per 31k pagine",
    detail:
      "Ogni pagina pacchetto indicizzata è una porta SEO. 31k pagine = long-tail enorme. GSC + IndexNow + ping Bing.",
    impact: "medium",
    effort: "XS",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "DIST-5",
    area: "distribution",
    title: "VS Code extension (wedge #1)",
    detail:
      "Estensione che scanna package.json/requirements.txt e mostra risk inline. Installs su marketplace = metrica DD diretta. Target: 3k install in 6 mesi.",
    impact: "high",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DIST-6",
    area: "distribution",
    title: "GitHub Action depscope/check (wedge #2)",
    detail:
      "Action che commenta sulla PR segnalando dep rischiose. Già file action.yml presente. Da finire e pubblicare su marketplace. Target: 500 repo che la usano in 6 mesi.",
    impact: "high",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },

  // =========== FRONTEND / SEO ===========
  {
    id: "FE-1",
    area: "frontend",
    title: "Pagine SSR dettaglio /breaking/{eco}/{pkg}, /error/{hash}",
    detail:
      "Hub /explore/* è client-side → non indicizzabile. URL statici per-package = driver SEO reale. Chi googla \"react 19 breaking changes\" deve atterrare diretto.",
    impact: "high",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "FE-2",
    area: "frontend",
    title: "Landing \"exit narrative\" chiara sul sito",
    detail:
      "Non una pricing page. Una pagina \"About / Vision\" che comunica: dataset cross-ecosystem, agent-native MCP, neutralità. Niente linguaggio SaaS/B2B. Parla alla narrativa di un acquirer (\"the package intel infrastructure\").",
    impact: "medium",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },

  // =========== DX — friction zero per sviluppatori ===========
  {
    id: "DX-1",
    area: "dx",
    title: "/api-docs aggiornato con tutti i 13 endpoint verticali",
    detail:
      "La pagina api-docs è vetrina DX. Se mancano endpoint = prodotto sotto-dimensionato in DD. OpenAPI spec auto-generata da FastAPI è già base, va curata.",
    impact: "medium",
    effort: "S",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DX-2",
    area: "dx",
    title: "SDK Python (pip install depscope) + Node (npm install depscope)",
    detail:
      "Non tutti usano MCP. Wrapper con 5 funzioni chiave. Downloads pypi/npm = vanity metric ma visibile in DD. Target: 1k downloads/mese combinati.",
    impact: "medium",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "DX-3",
    area: "dx",
    title: "Integration snippets (Cursor .mdc, Claude Code hooks, Windsurf, Aider)",
    detail:
      "Pagina /integrate con copy-paste snippets per ogni agent. Converte ogni user in contributor (recommanda DepScope al team). Bassa friction, alto multiplier.",
    impact: "medium",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },

  // =========== RELIABILITY — DD-ready ===========
  {
    id: "REL-1",
    area: "reliability",
    title: "Test suite minimale (pytest + FastAPI TestClient)",
    detail:
      "Zero test oggi = red flag in DD. Serve: 1 test per endpoint pubblico (18 endpoint), 1 per vertical handler. Non per qualità del prodotto oggi, per credibilità in DD domani.",
    impact: "medium",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "REL-2",
    area: "reliability",
    title: "CI/CD via GitHub Actions (lint + test + deploy)",
    detail:
      "Oggi tutto manuale via SSH. CI automatica = segnale maturità engineering in DD. Richiede REL-1 prima.",
    impact: "medium",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
  {
    id: "REL-3",
    area: "reliability",
    title: "Uptime monitoring pubblico + status page",
    detail:
      "UptimeRobot / Betterstack gratis. Status page su status.depscope.dev. 99.9%+ visibile = trust signal. Un compratore che vede downtime page frequenti sconta il prezzo.",
    impact: "low",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },

  // =========== GROWTH — mindshare ===========
  {
    id: "GROW-1",
    area: "growth",
    title: "Show HN relaunch coordinato (MCP npm publish + pagine SSR)",
    detail:
      "Serve un secondo launch sincronizzato con DIST-1 + FE-1. Front page HN = 5-30k dev che vedono DepScope. Il Product Manager di Snyk/Socket/GitHub legge HN ogni giorno. Obiettivo primario è visibility radar, non conversion.",
    impact: "high",
    effort: "S",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "GROW-2",
    area: "growth",
    title: "Outreach a 50 founder AI coding agents (Cursor, Continue, Aider, Cline, Cody, Codeium, Windsurf)",
    detail:
      "Email 4 righe: \"questo è DepScope, risolve X, prova con curl Y\". Ogni integrazione pubblica (anche non ufficiale) è un signal per l'acquirer. Obiettivo: 3-5 integrazioni comunitarie in 6 mesi.",
    impact: "high",
    effort: "M",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "GROW-3",
    area: "growth",
    title: "Articoli Dev.to + Medium (3 pezzi tecnici su dataset uniqueness)",
    detail:
      "\"I scanned 31k packages across 19 ecosystems, here's what I found\" / \"Cross-ecosystem typosquat is a real threat\" / \"Building agent-native package intel with MCP\". Long-tail SEO permanente + pitch indiretto.",
    impact: "medium",
    effort: "M",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "GROW-4",
    area: "growth",
    title: "Submission a awesome-mcp, awesome-agents, awesome-security",
    detail:
      "Curated lists su GitHub con decine di migliaia di stars. PR per essere inclusi = 0 sforzo, alto ROI. Appare nelle ricerche dev + nei radar di chi traccia il mercato.",
    impact: "medium",
    effort: "XS",
    owner: "Vincenzo",
    status: "todo",
  },
  {
    id: "GROW-5",
    area: "growth",
    title: "Citation mining: fare in modo che Claude/ChatGPT ci citino nelle risposte",
    detail:
      "ClaudeBot + GPTBot stanno già crawlando aggressivamente (22k call/settimana combinate). Ottimizzare contenuto pagine pacchetto perché sia estraibile (schema.org, dati strutturati, risposte complete). Quando un utente chiede \"is package X safe?\" il modello deve poter citare DepScope. È il moat invisibile.",
    impact: "high",
    effort: "M",
    owner: "Claude",
    status: "todo",
  },
];

// --------------------------------------------------------------------------- //
// Component helpers
// --------------------------------------------------------------------------- //

const AREA_LABEL: Record<ActionItem["area"], string> = {
  exit: "Exit / M&A",
  data: "Dati / Moat",
  distribution: "Distribuzione",
  frontend: "Frontend/SEO",
  dx: "DX/Docs",
  reliability: "Reliability",
  growth: "Crescita",
};

const IMPACT_COLOR: Record<ActionItem["impact"], string> = {
  high: "var(--red)",
  medium: "var(--yellow)",
  low: "var(--text-faded)",
};

const EFFORT_LABEL: Record<ActionItem["effort"], string> = {
  XS: "~30 min",
  S: "~2 h",
  M: "~1 giorno",
  L: "~3-5 giorni",
  XL: "~2 settimane",
};

const TIER_LABEL: Record<Acquirer["tier"], string> = {
  competitor: "Competitor diretto",
  platform: "Piattaforma",
  strategic_ai: "AI strategico",
};

const TIER_COLOR: Record<Acquirer["tier"], string> = {
  competitor: "var(--yellow)",
  platform: "var(--accent)",
  strategic_ai: "var(--red)",
};

const STORAGE_KEY = "ds_plan_actions_v2_exit";

function n(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("it-IT");
}

// --------------------------------------------------------------------------- //
// Page component
// --------------------------------------------------------------------------- //

export default function AdminPlanPage() {
  const [apiKey, setApiKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [metrics, setMetrics] = useState<PlanMetrics | null>(null);
  const [error, setError] = useState("");
  const [actions, setActions] = useState<ActionItem[]>(INITIAL_ACTIONS);
  const [filter, setFilter] = useState<"all" | ActionItem["status"]>("all");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, ActionItem["status"]>;
        setActions((prev) =>
          prev.map((a) => (parsed[a.id] ? { ...a, status: parsed[a.id] } : a)),
        );
      } catch {}
    }
    const storedKey = localStorage.getItem("ds_admin_key");
    if (storedKey) {
      setApiKey(storedKey);
      void loadWith(storedKey);
    }
  }, []);

  const loadWith = async (key: string) => {
    setError("");
    try {
      const r = await fetch("/api/admin/plan-metrics", {
        headers: { "X-API-Key": key },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: PlanMetrics = await r.json();
      setMetrics(d);
      setAuthed(true);
      localStorage.setItem("ds_admin_key", key);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Accesso negato");
      setAuthed(false);
    }
  };

  const setStatus = (id: string, status: ActionItem["status"]) => {
    const next = actions.map((a) => (a.id === id ? { ...a, status } : a));
    setActions(next);
    const map = Object.fromEntries(next.map((a) => [a.id, a.status]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  };

  const resetStatus = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActions(INITIAL_ACTIONS);
  };

  const doneCount = actions.filter((a) => a.status === "done").length;
  const doingCount = actions.filter((a) => a.status === "doing").length;
  const todoCount = actions.filter((a) => a.status === "todo").length;

  const visible =
    filter === "all" ? actions : actions.filter((a) => a.status === filter);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-1">Admin · Exit Thesis</h1>
          <p className="text-sm text-[var(--text-dim)] mb-4">
            Solo admin. Inserisci la API key amministrativa.
          </p>
          <input
            type="password"
            placeholder="ds_admin_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadWith(apiKey)}
            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-sm font-mono mb-3"
          />
          <button
            onClick={() => loadWith(apiKey)}
            className="w-full px-4 py-2 bg-[var(--accent)] text-black font-medium rounded"
          >
            Entra
          </button>
          {error && (
            <p className="text-xs text-[var(--red)] mt-3 font-mono">{error}</p>
          )}
        </div>
      </div>
    );
  }

  const m = metrics!;
  const v = m.verticals;
  const popolati = v.alternatives + v.breaking_changes + v.errors + v.known_bugs + v.compat_matrix;
  const ecoFull = m.distribution.ecosystems_with_breaking_or_bugs;
  const ecoDecl = m.distribution.total_ecosystems_declared;
  const coverage = Math.round((popolati / Math.max(v.packages, 1)) * 10000) / 100;

  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] mb-2">
            Admin · Exit Thesis
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text)] mb-2">
            DepScope — acquisition-only playbook
          </h1>
          <p className="text-sm text-[var(--text-dim)] max-w-2xl">
            Questa pagina non è più un business plan. È una bussola per un obiettivo unico:
            <strong className="text-[var(--text)]"> essere acquisita in 12-24 mesi</strong> da un player
            strategico per dataset cross-ecosystem + distribuzione agent-native. Nessun SaaS tier, nessun Stripe,
            nessun enterprise pilot. Ogni azione si misura su un solo criterio: rende DepScope più attraente per un compratore?
          </p>
        </header>

        {/* Executive summary — exit-first */}
        <section className="mb-10 border-l-4 border-[var(--accent)] pl-4">
          <h2 className="text-lg font-semibold mb-2">Tesi in una frase</h2>
          <p className="text-sm text-[var(--text)] leading-relaxed">
            DepScope è l&apos;unica infrastruttura di <em>ground truth</em> cross-ecosystem per agenti AI che scrivono codice,
            costruita agent-native su MCP. Non compete con Snyk/Socket sulla monetizzazione: compete sull&apos;<strong>adozione
            da parte degli agenti</strong> (Claude Code, Cursor, Windsurf, ChatGPT coding). Tra 12-24 mesi, uno dei big
            del settore avrà bisogno di comprare quello che avremo costruito: copertura di ecosistemi minori + segnali
            proprietari + presenza default nei flussi agentic. Oggi: {n(v.packages)} pacchetti, {ecoDecl} ecosistemi,
            {" "}{n(m.usage.api_calls_total)} chiamate totali, ZERO revenue target — e va bene così. Il cashflow arriva da Cuttalo,
            non da DepScope.
          </p>
        </section>

        {/* Stato attuale — numeri veri dal DB */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Stato attuale — numeri veri dal DB</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Pacchetti" value={n(v.packages)} sub={`${ecoDecl} ecosistemi`} />
            <Metric label="Vulnerabilità" value={n(v.vulnerabilities)} sub="OSV/CVE" />
            <Metric label="Alternatives" value={n(v.alternatives)} sub="curated" />
            <Metric label="Breaking changes" value={n(v.breaking_changes)} sub={`${ecoFull} eco. coperti`} />
            <Metric label="Errors" value={n(v.errors)} sub="stack-trace → fix" />
            <Metric label="Known bugs" value={n(v.known_bugs)} sub="version-scoped" />
            <Metric label="Compat stacks" value={n(v.compat_matrix)} sub="verified combos" />
            <Metric label="Coverage" value={`${coverage}%`} sub="verticali / packages" />
          </div>

          <h3 className="text-sm font-medium mt-6 mb-2 text-[var(--text-dim)]">Traffico (proof of traction per DD)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="API calls total" value={n(m.usage.api_calls_total)} sub="lifetime" />
            <Metric label="30 giorni" value={n(m.usage.api_calls_30d)} sub="" />
            <Metric label="7 giorni" value={n(m.usage.api_calls_7d)} sub="" />
            <Metric label="IP unici 30d" value={n(m.usage.unique_ips_30d)} sub="" />
          </div>

          <h3 className="text-sm font-medium mt-6 mb-2 text-[var(--text-dim)]">Adozione (vanity per DD, non revenue)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Utenti registrati" value={n(m.users.total)} sub={`${m.users.active_api_keys} API key attive`} />
            <Metric label="MCP npm" value={`v${m.distribution.mcp_npm_version_latest}`} sub="su disco, da publishare" />
            <Metric label="Revenue target" value="0 €" sub="by design — exit-only" />
            <Metric label="Runway" value="∞" sub="Cuttalo sostiene" />
          </div>

          <h3 className="text-sm font-medium mt-6 mb-3 text-[var(--text-dim)]">Copertura per ecosistema (moat → DATA-1 critica)</h3>
          <div className="overflow-x-auto border border-[var(--border)] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="text-left px-3 py-2">Ecosystem</th>
                  <th className="text-right px-3 py-2">Pkg</th>
                  <th className="text-right px-3 py-2">Vulns</th>
                  <th className="text-right px-3 py-2">Alt</th>
                  <th className="text-right px-3 py-2">Breaking</th>
                  <th className="text-right px-3 py-2">Bugs</th>
                  <th className="text-right px-3 py-2">Verticali</th>
                </tr>
              </thead>
              <tbody>
                {m.ecosystems.map((e) => {
                  const hasV = (e.breaking_changes + e.known_bugs + e.alternatives) > 0;
                  return (
                    <tr
                      key={e.ecosystem}
                      className="border-t border-[var(--border)] font-mono tabular-nums"
                    >
                      <td className="px-3 py-2 font-sans font-medium">{e.ecosystem}</td>
                      <td className="text-right px-3 py-2">{n(e.packages)}</td>
                      <td className="text-right px-3 py-2">{n(e.vulnerabilities)}</td>
                      <td className="text-right px-3 py-2">{n(e.alternatives)}</td>
                      <td className="text-right px-3 py-2">{n(e.breaking_changes)}</td>
                      <td className="text-right px-3 py-2">{n(e.known_bugs)}</td>
                      <td className={`text-right px-3 py-2 font-semibold ${hasV ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {hasV ? "✓" : "vuoto"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Potential acquirers */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Compratori potenziali — la bussola</h2>
          <p className="text-sm text-[var(--text-dim)] mb-4 max-w-3xl leading-relaxed">
            Ogni decisione tecnica e di prodotto va misurata contro questa tabella. Se un&apos;azione non rende
            DepScope più attraente per almeno UNO di questi compratori, non va fatta.
          </p>
          <div className="overflow-x-auto border border-[var(--border)] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="text-left px-3 py-2">Compratore</th>
                  <th className="text-left px-3 py-2">Tier</th>
                  <th className="text-left px-3 py-2">Prezzo (€)</th>
                  <th className="text-left px-3 py-2">Fit</th>
                  <th className="text-left px-3 py-2">Cosa vuole</th>
                  <th className="text-left px-3 py-2">Segnale</th>
                </tr>
              </thead>
              <tbody>
                {ACQUIRERS.map((a) => (
                  <tr key={a.name} className="border-t border-[var(--border)] align-top">
                    <td className="px-3 py-3 font-semibold">{a.name}</td>
                    <td className="px-3 py-3">
                      <span
                        className="text-[11px] font-mono uppercase"
                        style={{ color: TIER_COLOR[a.tier] }}
                      >
                        {TIER_LABEL[a.tier]}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{a.priceRangeEur}</td>
                    <td className="px-3 py-3 text-xs">{a.fit}</td>
                    <td className="px-3 py-3 text-xs text-[var(--text)] max-w-sm leading-relaxed">{a.theyWant}</td>
                    <td className="px-3 py-3 text-xs text-[var(--text-dim)] max-w-sm leading-relaxed">{a.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Exit thesis — cosa vendiamo davvero */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Cosa vendiamo quando vendiamo</h2>
          <div className="space-y-3 text-sm text-[var(--text)] leading-relaxed">
            <p>
              <strong>1. Dataset curato cross-ecosystem</strong> — 19 ecosistemi, ~150k pacchetti attesi in 12 mesi,
              signali proprietari (typosquat cross, maintainer trust, cooccurrence). Il codice sorgente è replicabile in 6 mesi;
              i dati no. Il moat è qui.
            </p>
            <p>
              <strong>2. Distribuzione agent-native</strong> — MCP server pubblicato, listed su Smithery/mcp.so/Anthropic registry,
              npm package, VS Code extension, GitHub Action. La metrica che conta in DD: quanti agenti/dev ci usano mensilmente.
            </p>
            <p>
              <strong>3. Brand + dominio + trademark</strong> — depscope.dev, marchio EU, presenza in awesome-list e articoli tecnici.
              Un compratore vuole un asset pulito, non un progetto hobby.
            </p>
            <p>
              <strong>4. Traffico e data signal</strong> — aggregato anonimo di cosa chiedono gli agenti AI. Questo è un data
              product vendibile separatamente (tipo SimilarWeb per open source), interessante per Cloudflare/Datadog.
            </p>
            <p>
              <strong>NON vendiamo</strong>: clienti paganti, ARR, team, certificazioni SOC2, contratti enterprise firmati.
              Il compratore quelli se li costruisce dopo.
            </p>
          </div>
        </section>

        {/* Cost analysis — serio, basato su nuovo OVH RISE-M */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Analisi costi reale — baseline OVH RISE-M dedicato</h2>
          <p className="text-sm text-[var(--text-dim)] mb-4 max-w-3xl leading-relaxed">
            Base di calcolo: server OVH RISE-M dedicato a DepScope (ordine 248764073, upfront 12 mesi).
            Hardware: AMD Ryzen 9 9900X 12C/24T, 64GB RAM, 2x NVMe 476GB RAID1, 1 Gbps. Datacenter RBX6.
            Scadenza 20 aprile 2027. Rinnovo annuale obbligato.
          </p>

          <h3 className="text-sm font-medium mt-4 mb-2 text-[var(--text-dim)]">Costi fissi (ricorrenti)</h3>
          <div className="overflow-x-auto border border-[var(--border)] rounded mb-6">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="text-left px-3 py-2">Voce</th>
                  <th className="text-right px-3 py-2">€/anno (netto)</th>
                  <th className="text-right px-3 py-2">€/anno (IVA incl)</th>
                  <th className="text-right px-3 py-2">€/mese</th>
                  <th className="text-left px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-[var(--text)]">
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">OVH RISE-M dedicato</td>
                  <td className="text-right px-3 py-2">1.139,89</td>
                  <td className="text-right px-3 py-2">1.390,67</td>
                  <td className="text-right px-3 py-2">115,89</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">upfront12, rinnovo apr 2027</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Dominio depscope.dev</td>
                  <td className="text-right px-3 py-2">12,00</td>
                  <td className="text-right px-3 py-2">14,64</td>
                  <td className="text-right px-3 py-2">1,22</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">Cloudflare Registrar</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Domini difensivi (.com, .io, .ai)</td>
                  <td className="text-right px-3 py-2">60,00</td>
                  <td className="text-right px-3 py-2">73,20</td>
                  <td className="text-right px-3 py-2">6,10</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">proteggere brand pre-DD</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Trademark EU (ammortizzato 10 anni)</td>
                  <td className="text-right px-3 py-2">90,00</td>
                  <td className="text-right px-3 py-2">90,00</td>
                  <td className="text-right px-3 py-2">7,50</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">€900 una tantum EUIPO</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Backup S3 OVH (Restic, ~60GB)</td>
                  <td className="text-right px-3 py-2">24,00</td>
                  <td className="text-right px-3 py-2">29,28</td>
                  <td className="text-right px-3 py-2">2,44</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">0,01 €/GB/mese GRA</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Cloudflare (DNS + Proxy)</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">free tier</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Email (mail.cuttalo.com, self-hosted)</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">condiviso con Cuttalo, 0 €/marginal</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">GitHub / npm / pypi / Smithery</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">free tier, public</td>
                </tr>
                <tr className="border-t-2 border-[var(--accent)] bg-[var(--surface)]">
                  <td className="px-3 py-2 font-sans font-semibold">Totale fisso</td>
                  <td className="text-right px-3 py-2 font-semibold">1.325,89</td>
                  <td className="text-right px-3 py-2 font-semibold">1.597,79</td>
                  <td className="text-right px-3 py-2 font-semibold">133,15</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">baseline 100% allocabile a DepScope</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-medium mb-2 text-[var(--text-dim)]">Costi variabili (scalano con traffico)</h3>
          <div className="overflow-x-auto border border-[var(--border)] rounded mb-6">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="text-left px-3 py-2">Voce</th>
                  <th className="text-right px-3 py-2">Oggi</th>
                  <th className="text-right px-3 py-2">Mese 6</th>
                  <th className="text-right px-3 py-2">Mese 12</th>
                  <th className="text-right px-3 py-2">Mese 18</th>
                  <th className="text-left px-3 py-2">Trigger</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-[var(--text)]">
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Traffico stimato (call/giorno)</td>
                  <td className="text-right px-3 py-2">~11k</td>
                  <td className="text-right px-3 py-2">~50k</td>
                  <td className="text-right px-3 py-2">~200k</td>
                  <td className="text-right px-3 py-2">~500k</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">—</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">LLM parsing crawler (opzionale)</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">15</td>
                  <td className="text-right px-3 py-2">40</td>
                  <td className="text-right px-3 py-2">80</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">Haiku 4.5 per changelog enrichment</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Bandwidth OVH</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">1 Gbps unmetered incluso</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Redis / ARC scaling</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">64GB RAM basta fino a 2M call/giorno</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Cloudflare Pro (se serve CDN paid)</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2">20</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">solo se &gt; 500k call/giorno</td>
                </tr>
                <tr className="border-t-2 border-[var(--accent)] bg-[var(--surface)]">
                  <td className="px-3 py-2 font-sans font-semibold">Totale variabile €/mese</td>
                  <td className="text-right px-3 py-2 font-semibold">0</td>
                  <td className="text-right px-3 py-2 font-semibold">15</td>
                  <td className="text-right px-3 py-2 font-semibold">40</td>
                  <td className="text-right px-3 py-2 font-semibold">100</td>
                  <td className="px-3 py-2 font-sans text-xs text-[var(--text-dim)]">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-medium mb-2 text-[var(--text-dim)]">Proiezione 18 mesi — investimento totale</h3>
          <div className="overflow-x-auto border border-[var(--border)] rounded mb-4">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="text-left px-3 py-2">Periodo</th>
                  <th className="text-right px-3 py-2">Fisso (IVA incl)</th>
                  <th className="text-right px-3 py-2">Variabile</th>
                  <th className="text-right px-3 py-2">One-time</th>
                  <th className="text-right px-3 py-2">Totale periodo</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums text-[var(--text)]">
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Mese 1-6</td>
                  <td className="text-right px-3 py-2">799</td>
                  <td className="text-right px-3 py-2">45</td>
                  <td className="text-right px-3 py-2">900 <span className="text-[var(--text-dim)] text-xs font-sans">(trademark)</span></td>
                  <td className="text-right px-3 py-2 font-semibold">1.744</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Mese 7-12</td>
                  <td className="text-right px-3 py-2">799</td>
                  <td className="text-right px-3 py-2">165</td>
                  <td className="text-right px-3 py-2">0</td>
                  <td className="text-right px-3 py-2 font-semibold">964</td>
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-sans">Mese 13-18</td>
                  <td className="text-right px-3 py-2">799</td>
                  <td className="text-right px-3 py-2">450</td>
                  <td className="text-right px-3 py-2">1.500 <span className="text-[var(--text-dim)] text-xs font-sans">(advisor M&A)</span></td>
                  <td className="text-right px-3 py-2 font-semibold">2.749</td>
                </tr>
                <tr className="border-t-2 border-[var(--accent)] bg-[var(--surface)]">
                  <td className="px-3 py-2 font-sans font-semibold">Totale 18 mesi</td>
                  <td className="text-right px-3 py-2 font-semibold">2.397</td>
                  <td className="text-right px-3 py-2 font-semibold">660</td>
                  <td className="text-right px-3 py-2 font-semibold">2.400</td>
                  <td className="text-right px-3 py-2 font-semibold text-[var(--accent)]">5.457 €</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-4 mb-4">
            <p className="text-sm text-[var(--text)] leading-relaxed">
              <strong>Cash out totale stimato in 18 mesi: ~5.500 €</strong> (hardware allocato 100% a DepScope).
              Se exit conservativa <strong>1 M€</strong> → ROI <strong>182x</strong>. Se exit 5 M€ → ROI 909x.
              Se exit non avviene, cash totale bruciato resta comunque 5.500 € (costo sostenibile da Cuttalo senza impatto).
            </p>
          </div>

          <h3 className="text-sm font-medium mb-2 text-[var(--text-dim)]">Economia marginale (cost per call)</h3>
          <ul className="space-y-1 text-xs text-[var(--text-dim)] font-mono">
            <li>• A 11k call/giorno → <strong className="text-[var(--text)]">0,0004 €/call</strong> (costo fisso diluito)</li>
            <li>• A 200k call/giorno → <strong className="text-[var(--text)]">0,000022 €/call</strong></li>
            <li>• A 500k call/giorno → <strong className="text-[var(--text)]">0,000015 €/call</strong></li>
            <li>• Gross margin a qualsiasi scala: 99%+ (infra fissa, bandwidth gratis, compute minimo)</li>
          </ul>

          <p className="text-xs text-[var(--text-faded)] mt-4 leading-relaxed">
            Nota su allocazione: il server ospita anche CT 141 (cuttalo-stage) e CT 142 (mystampo).
            In realtà DepScope occupa ~60% delle risorse. Costo strettamente allocato a DepScope sarebbe ~70 €/mese.
            Per sicurezza DD usiamo l&apos;intero costo server. Se in DD si mostra che il server è condiviso,
            l&apos;acquirer potrebbe scontare la separazione infrastrutturale: motivo in più per avere stack pulito.
          </p>
        </section>

        {/* Roadmap acquisition-focused */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Roadmap 18 mesi — milestone acquisition</h2>
          <ol className="space-y-3 text-sm text-[var(--text)]">
            <li><strong>Mesi 1-2 (Apr-Mag 2026)</strong>: EXIT-1, EXIT-3 (thesis + IP audit). DIST-1..4 (publishing).
              FE-1 (SSR pages). <em>Target</em>: repo pubblico, MCP live su 3 registry, 500 pagine indicizzate.</li>
            <li><strong>Mesi 3-4 (Giu-Lug)</strong>: DATA-4, DATA-5 (signal unici). DIST-5 (VS Code ext). GROW-1 (HN relaunch).
              <em>Target</em>: 2 signal proprietari live, 1k install cumulative, 1 thread HN front-page.</li>
            <li><strong>Mesi 5-6 (Ago-Set)</strong>: DATA-1 (8 ecosistemi vuoti), DATA-2 (crawler auto). DIST-6 (GitHub Action). REL-1..2.
              <em>Target</em>: 100k pacchetti, CI/CD pulita, 500 repo che usano l&apos;action.</li>
            <li><strong>Mesi 7-9 (Ott-Dic)</strong>: GROW-2 (50 founder outreach), GROW-5 (citation mining), EXIT-4 (public stats).
              <em>Target</em>: 3-5 integrazioni comunitarie, menzioni in dev blogs, presenza su Claude/ChatGPT answers.</li>
            <li><strong>Mesi 10-12 (Gen-Mar 2027)</strong>: EXIT-5 (primo warm intro), EXIT-2 log continuo, DATA-6 (agent trend report).
              <em>Target</em>: 1-3 conversazioni quiet con compratori, 10k+ agenti/mese che ci usano.</li>
            <li><strong>Mesi 13-18 (Apr-Set 2027)</strong>: conversazioni multiple in parallelo. Advisor / broker M&A se necessario.
              <em>Target</em>: LOI da 1-3 acquirer, chiusura deal €1M-10M.</li>
          </ol>
        </section>

        {/* Rischi */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Rischi identificati</h2>
          <div className="space-y-3 text-sm text-[var(--text)]">
            <div>
              <strong className="text-[var(--red)]">R1 — Commoditizzazione nativa (alto)</strong>
              <p className="mt-1 text-[var(--text-dim)]">Anthropic/Google/GitHub integrano intelligence simile nei loro agent. Mitigazione: dataset uniqueness + speed, moat cross-ecosystem, diventare partner prima di concorrente.</p>
            </div>
            <div>
              <strong className="text-[var(--red)]">R2 — Nessun segnale buyer in 18 mesi (alto)</strong>
              <p className="mt-1 text-[var(--text-dim)]">Scenario reale: 75% delle exit tentate falliscono. Mitigazione: accettare l&apos;asimmetria (upside enorme, downside limitato al tempo speso), avere piano B di mantenimento a costo zero se exit non arriva.</p>
            </div>
            <div>
              <strong className="text-[var(--yellow)]">R3 — Founder time (medio-alto)</strong>
              <p className="mt-1 text-[var(--text-dim)]">1 persona + Cuttalo. Attenzione a non disperdere energia tra troppi progetti. Darsi scadenza trimestrale: se non progredisce, pausa su DepScope.</p>
            </div>
            <div>
              <strong className="text-[var(--yellow)]">R4 — Dati stale (medio)</strong>
              <p className="mt-1 text-[var(--text-dim)]">Senza crawler automatica, breaking changes invecchiano in 6 mesi → moat sparisce. DATA-2 è critica per mantenere credibilità.</p>
            </div>
            <div>
              <strong className="text-[var(--yellow)]">R5 — IP encumbrance (medio)</strong>
              <p className="mt-1 text-[var(--text-dim)]">Se codebase ha GPL contamination o scraping senza ToS, la DD salta. EXIT-3 (audit) va fatto ora mentre è fattibile.</p>
            </div>
            <div>
              <strong className="text-[var(--text-faded)]">R6 — Liability su dati curati (basso)</strong>
              <p className="mt-1 text-[var(--text-dim)]">Fix errato che causa danno. Disclaimer + source URL sempre visibili. Già presente.</p>
            </div>
          </div>
        </section>

        {/* Action items */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Action items — backlog acquisition-driven</h2>
              <p className="text-xs text-[var(--text-dim)] mt-1">
                {todoCount} da fare · {doingCount} in corso · {doneCount} fatte. Lo stato si salva nel browser.
              </p>
            </div>
            <div className="flex gap-2">
              {(["all", "todo", "doing", "done"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1 rounded border ${
                    filter === f
                      ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-dim)]"
                  }`}
                >
                  {f === "all" ? "tutte" : f === "todo" ? "da fare" : f === "doing" ? "in corso" : "fatte"}
                </button>
              ))}
              <button
                onClick={resetStatus}
                className="text-xs px-3 py-1 rounded border border-[var(--border)] text-[var(--text-faded)]"
                title="Reset stato locale"
              >
                reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--border)] rounded">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Area</th>
                  <th className="text-left px-3 py-2">Azione</th>
                  <th className="text-left px-3 py-2">Impatto</th>
                  <th className="text-left px-3 py-2">Effort</th>
                  <th className="text-left px-3 py-2">Owner</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-3 py-3 font-mono text-xs text-[var(--text-faded)]">{a.id}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-dim)]">
                        {AREA_LABEL[a.area]}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-lg">
                      <div className="font-medium text-[var(--text)]">{a.title}</div>
                      <div className="text-xs text-[var(--text-dim)] mt-1 leading-relaxed">{a.detail}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="text-xs font-mono uppercase"
                        style={{ color: IMPACT_COLOR[a.impact] }}
                      >
                        {a.impact}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-[var(--text-dim)]" title={EFFORT_LABEL[a.effort]}>
                      {a.effort}
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-[var(--text-dim)]">{a.owner}</td>
                    <td className="px-3 py-3">
                      <select
                        value={a.status}
                        onChange={(e) =>
                          setStatus(a.id, e.target.value as ActionItem["status"])
                        }
                        className={`text-xs px-2 py-1 rounded bg-[var(--bg)] border border-[var(--border)] ${
                          a.status === "done"
                            ? "text-[var(--green)]"
                            : a.status === "doing"
                              ? "text-[var(--yellow)]"
                              : "text-[var(--text-dim)]"
                        }`}
                      >
                        <option value="todo">da fare</option>
                        <option value="doing">in corso</option>
                        <option value="done">fatta</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prossime mosse */}
        <section className="mb-10 bg-[var(--surface)] border border-[var(--border)] rounded p-5">
          <h2 className="text-lg font-semibold mb-2">Prossime mosse — ordine temporale</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text)]">
            <li><strong>Questa settimana</strong>: EXIT-1 (thesis scritto), EXIT-3 (IP audit), DIST-1..4 (MCP publish + GitHub push + Smithery). Sblocca visibility.</li>
            <li><strong>2 settimane</strong>: FE-1 (SSR pages) + DX-1 (api-docs). Long-tail SEO + vetrina DX.</li>
            <li><strong>Mese 1</strong>: DATA-4 + DATA-5 (typosquat cross + maintainer trust). I due signal che nessuno ha.</li>
            <li><strong>Mese 2</strong>: DIST-5 (VS Code), DIST-6 (GitHub Action). I due wedge di distribuzione.</li>
            <li><strong>Mese 3</strong>: GROW-1 (HN relaunch sincronizzato con tutto il sopra). Primo vero momento di visibility globale.</li>
            <li><strong>Mese 4-6</strong>: DATA-1 (8 ecosistemi vuoti) + DATA-2 (crawler auto). Il moat diventa irreplicabile.</li>
            <li><strong>Mese 7-12</strong>: GROW-2 outreach, EXIT-5 primi intro warm, DATA-6 agent trend report. Si prepara la conversazione di exit.</li>
            <li><strong>Mese 13+</strong>: conversazioni attive con 3-5 compratori, advisor M&A se necessario.</li>
          </ol>
          <p className="text-xs text-[var(--text-faded)] mt-4 leading-relaxed">
            Regola: ogni item che non è in EXIT / DATA / DIST / GROW è secondario. REL e DX servono alla DD, non al prodotto.
            Se in 18 mesi non c&apos;è segnale buyer → si valuta pausa a costo zero, non pivot a SaaS.
          </p>
        </section>

        <footer className="pt-6 border-t border-[var(--border)] text-xs text-[var(--text-faded)]">
          Bussola acquisition-only. Metrica aggiornata in tempo reale dal DB. Stato azioni salvato in localStorage.
          Pagina solo admin — non indicizzata, non accessibile senza API key amministrativa.
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-faded)] mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums text-[var(--text)]">{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-dim)] mt-0.5">{sub}</div>}
    </div>
  );
}
