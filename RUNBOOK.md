# RUNBOOK — DepScope

Operational procedures for outages, vendor lock-in mitigations, and
disaster recovery. Kept deliberately short so it's usable at 3AM.

Production lives in **LXC 140** on OVH RISE-M (`51.255.70.8`).
Old server (`91.134.4.25`, VM 130) runs mail only.

---

## A) GitHub rate limit / token revoked

**Symptom**: `fetch_github_stats`, `fetch_swift`, `changelog_crawler`, or
`/api/maintainer/trust` return empty / 403 / "API rate limit exceeded".

**Immediate**:

1. SSH in: `ssh root@51.255.70.8 && pct enter 140`
2. Check quota:
   ```
   curl -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/rate_limit
   ```
3. If `remaining: 0`, wait for reset (printed in seconds) or rotate to
   backup token.

**Token pool (recommended setup)**:

Add up to 5 tokens to `/home/deploy/depscope/.env`:

```
GH_TOKEN_1=ghp_aaa...
GH_TOKEN_2=ghp_bbb...
GH_TOKEN_3=ghp_ccc...
```

`api/registries.py::_pick_gh_token()` rotates time-bucketed. Quota
grows from 5k/hr to 25k/hr with 5 tokens.

Generate each from different GitHub account:
<https://github.com/settings/personal-access-tokens/new>
(fine-grained, read-only, `public repos` scope).

**If primary token revoked**:
1. Revoke on GitHub (settings/tokens)
2. Create replacement, paste in `.env`
3. `pm2 restart depscope-api`
4. Re-run cron jobs that failed: `scripts/fetch_github_stats.py` etc.

---

## B) Cloudflare outage / WAF block

**Symptom**: public `depscope.dev` 502/522 or blocked.

**Option 1 — Direct origin (fastest, 5 min)**:

Users who know our origin can hit `https://51.255.70.8/` directly (SNI
set to `depscope.dev`, our certs are served from HAProxy).

**Option 2 — DNS swap to bypass CF (30 min)**:

1. Log into Gandi / Cloudflare DNS panel.
2. Change `depscope.dev` A record → `51.255.70.8` with **proxy off** (no
   orange cloud). TTL 300s.
3. Clients resolve direct to origin within 5 minutes.
4. Expect: loss of CDN caching, higher egress, IP exposure.

**Option 3 — Second CDN (Bunny / Fastly, 1h)**:

Pre-configured in `docs/cdn-fallback-bunny.md` (create on first
incident). Bunny CDN has a free tier and supports custom origin.

**Email routing**: if Cloudflare Email Routing dies, our VM 130
(`91.134.4.25:587` SMTP, `10.10.0.130` internal) can take over.

1. Change `depscope.dev` MX records to `mail.cuttalo.com` (priority 10).
2. Postfix on VM 130 already has virtual aliases for
   privacy/security/legal/takedown/admin/info/hello/contact/abuse/postmaster
   → `depscope@cuttalo.com`. Mail flows immediately.

---

## C) Database corruption / accidental DROP

**Backups are multi-tier**:

- **Daily logical dump** (if cron `backup_db.sh` is active): inside
  `/var/backups/depscope/*.dump`. Keeps 7-day rolling.
- **Weekly Restic**: Sun 04:00 → `s3.gra.cloud.ovh.net/backup-cuttalo/restic`.
  Encrypted, rotating snapshots.
- **Pre-migration dump** (manual): `depscope_clean_20260423.dump` (116MB).

**Restore**:

```
# Stop writers
pm2 stop depscope-api depscope-mcp-http

# Create empty DB
sudo -u postgres createdb depscope_restore ENCODING 'UTF8'

# Restore
pg_restore -d depscope_restore /var/backups/depscope/<dump>

# Verify counts
SELECT COUNT(*) FROM packages;   -- expect ~392k
SELECT COUNT(*) FROM vulnerabilities; -- expect ~7.3k

# Swap
ALTER DATABASE depscope RENAME TO depscope_corrupt;
ALTER DATABASE depscope_restore RENAME TO depscope;

# Restart
pm2 start depscope-api depscope-mcp-http
```

---

## D) LXC 140 down (container crash)

1. `ssh root@51.255.70.8`
2. `pct status 140` — should say `stopped`
3. `pct start 140`
4. Wait 30s, then `pct exec 140 -- pm2 list`
5. If pm2 processes not online: `pct enter 140 && su - deploy -c "pm2 resurrect"`

If LXC itself corrupted:

```
pct restore 140 /var/lib/vz/dump/vzdump-lxc-140-<date>.tar.zst --force
```

---

## E) Pm2 process stuck / memory leak

```
pct enter 140
su - deploy
pm2 list
pm2 restart <id>        # soft restart
pm2 reload <id>         # zero-downtime reload
pm2 delete <id> && pm2 start ecosystem.config.js  # nuclear
```

Monitoring: `pm2 monit` shows live CPU/RAM.

---

## F) Disk full

`/` on LXC 140 is 100GB. If >85%:

```
pct exec 140 -- df -h /
pct exec 140 -- du -sh /var/log/depscope/*   # prune old logs
pct exec 140 -- find /var/log -name "*.log" -size +500M -mtime +7 -delete
pct exec 140 -- sudo -u postgres psql depscope -c "VACUUM FULL api_usage;"
```

---

## G) New token / credential rotation quick-ref

All secrets live in `/home/deploy/depscope/.env` (gitignored). After
any rotation, `pm2 restart depscope-api` + verify.

- `DATABASE_URL` — PostgreSQL password. Rotate: `ALTER USER depscope
  WITH PASSWORD '<new>'`, update `.env`, restart.
- `GH_TOKEN` / `GH_TOKEN_1..5` — GitHub PATs.
- `SMTP_PASS` — Dovecot user, rotate via VM 130 MariaDB
  `mailserver.virtual_users` + `doveadm pw -s SHA512-CRYPT`.
- `ADMIN_PASSWORD` — dashboard unlock. Change, restart API, re-login.
- `IP_HASH_SALT` — rotating this breaks all existing `ip_hash` linkage
  (considered permanent; document before changing).

---

## H) Emergency contacts

- **Owner**: info@ideatagliolaser.it
- **Security**: security@depscope.dev → depscope@cuttalo.com
- **OVH support**: <https://help.ovhcloud.com/> (account: login email, order
  IDs in `credentials_new_server.md`)
- **Cloudflare support**: dashboard > Account > Support (Zone ID
  `664e55136e4ac133233903ca1165b0ad`)
- **GitHub**: https://github.com/cuttalo/depscope (org account)

---

## I) Version history of this doc

- 2026-04-23: initial runbook covering GH / CF / DB / LXC / pm2.
