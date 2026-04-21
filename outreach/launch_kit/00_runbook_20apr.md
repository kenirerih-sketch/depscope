# Launch Day Runbook — Lunedì 20 Aprile 2026

Tutti gli orari in **UTC**. Italia = UTC+2 (ora legale).

## 11:30 UTC — Prep (T-30m)
- Verifica `/admin/launch` apri nel browser, localStorage con admin key pronto
- Verifica `pm2 list` su VM 140: `depscope-api` + `depscope-web` entrambi `online`
- Test manuale:
  ```bash
  curl -sI https://depscope.dev/
  curl -s https://depscope.dev/api/check/npm/express | head -c 300
  ```
  Entrambi OK.
- Tieni aperti: Gmail (per reply veloci), HN submit form, Reddit, X, LinkedIn, Mastodon

## 12:00 UTC — Main fire (T=0)
Tre cron job partono **insieme in automatico**:
1. `publish_article.py` → pubblica il draft Dev.to (id 3521010, titolo "The Hidden Cost of AI Coding Agents")
2. `send_outreach_campaign.py` → inizia a inviare 79 email a giornalisti, 1 ogni 90-210s (campagna dura ~3h)
3. `intelligence.py` (unrelated cron, continua a girare)

Monitoring: `/admin/launch` mostra sent counter crescere. Refresh 60s.

## 12:05 UTC — Manual HN submit (T+5m)
Vai su https://news.ycombinator.com/submit
- Title: `Show HN: DepScope – shared package health API for AI coding agents`
- URL: `https://depscope.dev`
- Subito dopo submit → aggiungi primo commento con il testo dal file `01_hacker_news.md`

## 12:10 UTC — Mastodon post
Se hai account @depscope@hachyderm.io (o simile), copia-incolla da `05_mastodon_and_indie.md` sez. Mastodon.

## 12:15 UTC — Twitter/X thread
Posta gli 8 tweet da `03_x_twitter.md`. Thread, non post singolo. Ogni tweet reply al precedente.

## 12:30 UTC — LinkedIn post
Posta testo IT da `04_linkedin.md` sul profilo personale Vincenzo Rubino. Se hai Cuttalo Company Page, rilancia lì dopo 1h.

## 13:00 UTC — Reddit r/programming
Copia-incolla da `02_reddit.md` sez. r/programming. Solo link + self-text vuoto. Dopo 20 min, aggiungi top comment con context tecnico.

## 15:00 UTC — Reddit r/node
Stesso flow ma da sez. r/node.

## 17:00 UTC — Reddit r/devops
Stesso flow ma da sez. r/devops.

## 19:00 UTC — Reddit r/MachineLearning
Stesso flow ma da sez. r/MachineLearning. Flair [P] Project obbligatorio.

## 20:00 UTC — IndieHackers + Hashnode
- IndieHackers: post da `05_mastodon_and_indie.md` sez. IndieHackers
- Hashnode: crosspost con canonical Dev.to

## Monitoring continuo
Tieni `/admin/launch` aperta con tab "Metrics" + refresh automatico ogni 60s. Controlla:
- **email sent** → deve salire da 0 a 79 nell'arco di 3h
- **email opened** → primo open dovrebbe arrivare entro 5-10 min dal primo invio
- **email clicked** → 1-3 click attesi in 24h
- **API calls 24h** → watch per spike
- **Dev.to views** → cresce se HN/Reddit funzionano
- **GitHub stars** → cresce se HN performa

## Regole durante il giorno
- **Rispondi a OGNI commento** entro 15-30 min
- **Non difenderti** se critica: "fair point, looking into it" > argomentare
- **Non postare lo stesso link 2 volte** sulla stessa piattaforma
- **Non fare self-upvote o chiedere a terzi** — rilevato e penalizzante ovunque
- **Non spammare risposte** con link al sito — bannato HN/Reddit

## Se va male
- HN buried / flagged: normale al primo tentativo, non ripostare per 2 settimane
- Reddit -5 veloce: delete + skip subreddit
- Email bounces: controlla `/admin/launch` per SMTP errors, non reinviare
- Server down: check PM2, reset se crash, scrive a status.depscope.dev (se esiste)

## Giorno dopo (21 apr)
- Raccogli dati: open rate email, HN position max, Reddit combined upvotes, Dev.to views
- Rispondi alle email di giornalisti che hanno risposto (se ci sono)
- Follow-up solo a chi ha OPENATO ma non risposto: subject "Re: [original]" — dopo 48h

## File in questa cartella (/tmp/launch_kit/)
- `00_runbook_20apr.md` (questo)
- `01_hacker_news.md`
- `02_reddit.md`
- `03_x_twitter.md`
- `04_linkedin.md`
- `05_mastodon_and_indie.md`
