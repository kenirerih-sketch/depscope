#!/bin/bash
# PostgreSQL SQL_ASCII -> UTF8 migration for DepScope.
#
# WHY: api/registries.py has _sanitize_str / _safe_json_dumps workarounds
# because the DB encoding can't represent unicode maintainer names, some
# package descriptions, etc. Going to UTF8 removes the workaround and
# prevents silent data drops.
#
# WHEN: schedule 2h maintenance window (weekends, low-traffic). Expect
# ~5-10 min actual downtime at cutover, rest is safety buffer.
#
# HOW: dump the existing SQL_ASCII DB, restore into a fresh UTF8 one,
# verify row counts, swap DATABASE_URL, reindex. Old DB kept as
# `depscope_old_ascii_<date>` for rollback (do NOT drop for 72h).
#
# USAGE: ./migrate_utf8.sh           # dry-run (dump only, no swap)
#        ./migrate_utf8.sh --execute # full migration + swap

set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
OLD_DB=depscope
NEW_DB=depscope_utf8
BACKUP_DB=depscope_old_ascii_$DATE
DUMP_FILE=/var/backups/depscope/migrate_$DATE.dump
ENV_FILE=/home/deploy/depscope/.env
LOG_FILE=/var/log/depscope/migrate_utf8_$DATE.log

MODE=${1:-dry-run}

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

log "=== DepScope SQL_ASCII -> UTF8 migration ==="
log "mode=$MODE"

# --- 0. Pre-checks -------------------------------------------------------
log "step 0: pre-checks"
if ! command -v pg_dump >/dev/null 2>&1; then
  log "ERROR: pg_dump not found"; exit 1
fi
if ! sudo -u postgres psql -lqt | cut -d '|' -f 1 | grep -qw "$OLD_DB"; then
  log "ERROR: source DB '$OLD_DB' not found"; exit 1
fi
CUR_ENCODING=$(sudo -u postgres psql -tAc "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname='$OLD_DB'")
log "current encoding of $OLD_DB: $CUR_ENCODING"
if [ "$CUR_ENCODING" = "UTF8" ]; then
  log "DB is already UTF8 — nothing to do"; exit 0
fi

OLD_ROWS_PACKAGES=$(sudo -u postgres psql -tAc "SELECT COUNT(*) FROM packages" -d "$OLD_DB")
OLD_ROWS_VULNS=$(sudo -u postgres psql -tAc "SELECT COUNT(*) FROM vulnerabilities" -d "$OLD_DB")
OLD_ROWS_USAGE=$(sudo -u postgres psql -tAc "SELECT COUNT(*) FROM api_usage" -d "$OLD_DB")
log "baseline row counts: packages=$OLD_ROWS_PACKAGES vulns=$OLD_ROWS_VULNS usage=$OLD_ROWS_USAGE"

# --- 1. Dump -------------------------------------------------------------
log "step 1: pg_dump $OLD_DB -> $DUMP_FILE"
mkdir -p /var/backups/depscope
sudo -u postgres pg_dump -Fc -f "$DUMP_FILE" "$OLD_DB"
log "dump size: $(du -h "$DUMP_FILE" | cut -f1)"

if [ "$MODE" != "--execute" ]; then
  log "DRY RUN COMPLETE. Dump at $DUMP_FILE. Run again with --execute to swap."
  exit 0
fi

# --- 2. Stop writers -----------------------------------------------------
log "step 2: stop pm2 writers (api + mcp)"
su - deploy -c "pm2 stop depscope-api depscope-mcp-http"

# --- 3. Create UTF8 DB ---------------------------------------------------
log "step 3: create UTF8 DB $NEW_DB"
sudo -u postgres dropdb "$NEW_DB" 2>/dev/null || true
sudo -u postgres createdb "$NEW_DB" --encoding=UTF8 --template=template0 --locale=C.UTF-8 --owner=depscope

# --- 4. Restore ----------------------------------------------------------
log "step 4: pg_restore -> $NEW_DB"
sudo -u postgres pg_restore -d "$NEW_DB" --no-owner --no-privileges "$DUMP_FILE"

# --- 5. Verify ------------------------------------------------------------
log "step 5: verify row counts"
NEW_ROWS_PACKAGES=$(sudo -u postgres psql -tAc "SELECT COUNT(*) FROM packages" -d "$NEW_DB")
NEW_ROWS_VULNS=$(sudo -u postgres psql -tAc "SELECT COUNT(*) FROM vulnerabilities" -d "$NEW_DB")
NEW_ROWS_USAGE=$(sudo -u postgres psql -tAc "SELECT COUNT(*) FROM api_usage" -d "$NEW_DB")
log "new row counts: packages=$NEW_ROWS_PACKAGES vulns=$NEW_ROWS_VULNS usage=$NEW_ROWS_USAGE"

if [ "$OLD_ROWS_PACKAGES" != "$NEW_ROWS_PACKAGES" ] || [ "$OLD_ROWS_VULNS" != "$NEW_ROWS_VULNS" ]; then
  log "ERROR: row count mismatch — aborting swap. Old DB left untouched."
  log "Restore pm2: su - deploy -c 'pm2 start depscope-api depscope-mcp-http'"
  su - deploy -c "pm2 start depscope-api depscope-mcp-http"
  exit 1
fi
log "row counts match — proceeding with swap"

# --- 6. Rename databases --------------------------------------------------
log "step 6: rename DBs (swap)"
# depscope -> depscope_old_ascii_<date>  (kept for rollback)
sudo -u postgres psql postgres -c "ALTER DATABASE $OLD_DB RENAME TO $BACKUP_DB;"
# depscope_utf8 -> depscope
sudo -u postgres psql postgres -c "ALTER DATABASE $NEW_DB RENAME TO $OLD_DB;"

# --- 7. Reindex + analyze -------------------------------------------------
log "step 7: REINDEX + ANALYZE"
sudo -u postgres psql -d "$OLD_DB" -c "REINDEX DATABASE $OLD_DB;" || log "reindex warning (ok)"
sudo -u postgres psql -d "$OLD_DB" -c "ANALYZE;"

# --- 8. Restart app -------------------------------------------------------
log "step 8: restart pm2"
su - deploy -c "pm2 start depscope-api depscope-mcp-http"

sleep 5

# --- 9. Smoke test --------------------------------------------------------
log "step 9: smoke test"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/stats)
log "/api/stats returned HTTP=$HTTP"
if [ "$HTTP" != "200" ]; then
  log "ERROR: smoke test failed. Rollback: rename $BACKUP_DB back to $OLD_DB and restart."
  exit 1
fi

log "=== MIGRATION COMPLETE ==="
log "Old DB kept as: $BACKUP_DB (drop after 72h verification)"
log "Verify application for 72h, then:"
log "  sudo -u postgres dropdb $BACKUP_DB"
log "Post-cleanup: remove _sanitize_str / _scrub_pii / _safe_json_dumps"
log "workarounds in api/registries.py if desired."
