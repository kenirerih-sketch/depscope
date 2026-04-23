#!/bin/bash
#
# DepScope daily backup — code + agent/user data only.
#
# EXCLUDES heavy upstream-ingested tables (packages, vulnerabilities,
# malicious_packages, epss_scores, scorecard, kev, maintainer_signals,
# github_stats, known_bugs, breaking_changes, typosquat_candidates,
# package_quality, download_history, health_history, compat_matrix)
# — they're ~1.2 GB and all re-downloadable via cron from upstream.
#
# INCLUDES agent/user-generated data that we cannot rebuild:
#   api_usage, api_sessions, page_views, package_cooccurrence,
#   trend_snapshots, alternatives, migration_paths, errors,
#   outreach_emails, anomaly_reports, contact_messages, email_events,
#   agent_* (6 tables), users + auth tables, gsc_*
#
# Retention: 7 daily + 4 weekly + 12 monthly. Forget + prune.
#
# Schedule: cron daily 03:30 UTC on LXC 140.
#
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
LOG=/var/log/depscope/backup_agent.log
# Use /tmp because postgres user can write there (sudo -u postgres writes the dump);
# restic picks it up and we delete it after. /tmp is never in any backup source list.
TMP_DUMP=/tmp/depscope_agent_data_$DATE.dump

# --- load secrets -------------------------------------------------------
if [ -f /home/deploy/depscope/.env ]; then
  set -a
  # shellcheck source=/dev/null
  . /home/deploy/depscope/.env
  set +a
fi

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY missing from .env}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD missing from .env}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID missing from .env}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY missing from .env}"

export RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

trap 'log "ERROR at line $LINENO"; rm -f "$TMP_DUMP"; exit 1' ERR

log "=== DepScope agent-data backup START ==="

# --- 1. pg_dump only agent/user-generated tables ------------------------
TABLES=(
  api_usage api_sessions page_views
  package_cooccurrence trend_snapshots
  alternatives migration_paths errors compat_matrix
  outreach_emails anomaly_reports contact_messages email_events
  users magic_tokens sessions api_keys subscriptions payments
  agent_opportunities agent_actions agent_plan agent_rules agent_config
  agent_credentials agent_metrics agent_platform_status
  gsc_query_top gsc_daily
)

DUMP_ARGS=()
for t in "${TABLES[@]}"; do
  DUMP_ARGS+=(-t "$t")
done

log "pg_dump ${#TABLES[@]} tables -> $TMP_DUMP"
sudo -u postgres pg_dump -Fc "${DUMP_ARGS[@]}" -f "$TMP_DUMP" depscope
# Make dump owned by deploy so we can remove it at the end.
sudo chown "$(id -u)":"$(id -g)" "$TMP_DUMP" 2>/dev/null || chmod 666 "$TMP_DUMP"
log "  dump size: $(du -h "$TMP_DUMP" | cut -f1)"

# --- 2. restic init (idempotent) ---------------------------------------
if ! restic snapshots --last 1 >/dev/null 2>&1; then
  log "restic repo not initialised at $RESTIC_REPOSITORY — init"
  restic init
fi

# --- 3. restic backup --------------------------------------------------
log "restic backup code + dump + env + infra configs"
restic backup \
  --tag daily_agent_data \
  --exclude '*/node_modules' \
  --exclude '*/.venv' \
  --exclude '*/venv' \
  --exclude '*/.next' \
  --exclude '*/__pycache__' \
  --exclude '*/.git/objects' \
  --exclude '*.log' \
  --exclude '*.pyc' \
  --exclude '*.bak*' \
  --exclude '*.dump' \
  /home/deploy/depscope \
  "$TMP_DUMP" \
  /etc/haproxy/haproxy.cfg \
  /home/deploy/.npmrc \
  2>&1 | tee -a "$LOG"

# --- 4. forget old snapshots + prune ----------------------------------
log "restic forget + prune"
restic forget \
  --tag daily_agent_data \
  --keep-daily 7 --keep-weekly 4 --keep-monthly 12 \
  --prune 2>&1 | tee -a "$LOG"

# --- 5. cleanup local dump --------------------------------------------
rm -f "$TMP_DUMP" || sudo rm -f "$TMP_DUMP"

# --- 6. stats ---------------------------------------------------------
log "repo stats"
restic stats --mode raw-data 2>&1 | tee -a "$LOG"

log "=== DepScope agent-data backup DONE ==="
