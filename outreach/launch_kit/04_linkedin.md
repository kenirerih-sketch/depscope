# LinkedIn — founder posts (IT + EN, auto-schedulato)

**Automatico via cron** dal server oggi:
- **07:00 UTC (09:00 IT)** → post IT sul tuo profilo personale
- **14:00 UTC (16:00 IT / 10am ET)** → post EN sul tuo profilo personale

Entrambi vengono postati dallo script `/home/deploy/depscope/scripts/post_linkedin.py` usando l'access token OAuth salvato. Nessuna azione manuale.

## Testi

### IT (su profilo personale, target rete italiana)
File: `/home/deploy/depscope/content/linkedin/post_it.txt`

### EN (6h dopo, audience internazionale)
File: `/home/deploy/depscope/content/linkedin/post_en.txt`

## Dopo il post

- Controlla `/admin/launch` → grafico crescita visite post-lancio
- Rispondi ai commenti (non automatizzato — manuale nel feed LinkedIn) entro 2-3h dal post
- Non postare altro lo stesso giorno sul profilo — LinkedIn distribuisce meglio un singolo post/giorno

## Rules

- NO numeri di adoption nostri (traffic, downloads, %).
- Solo scala industriale (milioni di agent, miliardi di richieste).
- Positioning "infrastruttura aperta", non "free".
- Tone: founder diretto, non PR.
