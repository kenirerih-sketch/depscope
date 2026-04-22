#!/bin/bash
# Complete DepScope CT backup: DB + code + configs + cron + nginx + env.
# Produces a single timestamped .tar.zst in /var/backups/.
set -euo pipefail

STAMP=$(date +%Y%m%d_%H%M%S)
BDIR="/var/backups/depscope"
STAGE="$BDIR/stage_$STAMP"
ARCHIVE="$BDIR/depscope_full_$STAMP.tar.zst"

mkdir -p "$BDIR" "$STAGE"
chmod 777 "$STAGE"
cd "$STAGE"

echo "[1/7] pg_dump (custom format, compressed)"
sudo -u postgres pg_dump -F c -f /tmp/depscope_dump_$STAMP.db depscope
mv /tmp/depscope_dump_$STAMP.db db.dump
echo "  → $(du -h db.dump | cut -f1)"

echo "[2/7] rsync code (skip .venv + .next + node_modules + __pycache__ + .bak)"
mkdir -p depscope
rsync -a \
  --exclude='.venv' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='.next' \
  --exclude='*.bak*' \
  --exclude='*.pyc' \
  --exclude='frontend/.next' \
  --exclude='data/popcon.tsv' \
  /home/deploy/depscope/ depscope/
echo "  → $(du -sh depscope | cut -f1)"

echo "[3/7] ecosystem.config.js + .env"
cp /home/deploy/depscope/ecosystem.config.js ecosystem.config.js
cp /home/deploy/depscope/.env env_file 2>/dev/null || true

echo "[4/7] crontab(s)"
sudo -u deploy crontab -l > crontab_deploy.txt 2>/dev/null || true
crontab -l > crontab_root.txt 2>/dev/null || true

echo "[5/7] nginx config"
mkdir -p nginx
cp -r /etc/nginx/sites-enabled nginx/ 2>/dev/null || true
cp /etc/nginx/nginx.conf nginx/ 2>/dev/null || true

echo "[6/7] PM2 dump + package.json hashes"
sudo -u deploy pm2 save 2>&1 | tail -1
cp /home/deploy/.pm2/dump.pm2 pm2_dump.json 2>/dev/null || true
find /home/deploy/depscope -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" -not -path "*/.next/*" -exec sha256sum {} \; > package_json_hashes.txt

echo "[7/7] tar.zst archive"
cd "$BDIR"
tar --zstd -cf "$ARCHIVE" "stage_$STAMP"
rm -rf "$STAGE"
echo "  → $ARCHIVE $(du -h "$ARCHIVE" | cut -f1)"

echo ""
echo "DONE. Restore plan printed below."
echo ""
cat <<EOF
RESTORE PLAN (if needed)
========================
  1. cd /tmp && tar --zstd -xf $ARCHIVE
  2. pg_restore: sudo -u postgres pg_restore -d depscope --clean --if-exists stage_*/db.dump
  3. rsync -a stage_*/depscope/ /home/deploy/depscope/  # code
  4. cp stage_*/crontab_deploy.txt /tmp/ && sudo -u deploy crontab /tmp/crontab_deploy.txt
  5. cp stage_*/nginx/sites-enabled/* /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx
  6. cp stage_*/ecosystem.config.js /home/deploy/depscope/ && sudo -u deploy pm2 reload all

Remember: .venv + node_modules NOT in backup — re-install via pip / npm.
EOF

ls -la "$ARCHIVE"
