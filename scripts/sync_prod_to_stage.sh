#!/bin/bash
# Sync prod DepScope → stage. Used before risky changes so stage mirrors prod
# and can serve as dress-rehearsal for MCP/codebase refactors.
#
# REQUIRED env vars (set before running):
#   DEPSCOPE_DB_PASSWORD   # PostgreSQL password for depscope role
#   DEPSCOPE_GH_TOKEN      # GitHub fine-grained PAT
#   DEPSCOPE_SMTP_PASS     # SMTP password for depscope@cuttalo.com
#
# Source them from ecosystem.config.js, your shell profile, or a local .env.
# This script refuses to run if any secret is missing.
set -euo pipefail

: "${DEPSCOPE_DB_PASSWORD:?missing — export from .env or ecosystem.config.js}"
: "${DEPSCOPE_GH_TOKEN:?missing}"
: "${DEPSCOPE_SMTP_PASS:?missing}"

PROD=/home/deploy/depscope
STAGE=/home/deploy/depscope-stage

echo "[1/7] Stage DB: restore from prod"
sudo -u postgres pg_dump -F c depscope -f /tmp/prod_to_stage.dump
sudo -u postgres psql -c "DROP DATABASE IF EXISTS depscope_stage;" -c "CREATE DATABASE depscope_stage OWNER depscope ENCODING 'SQL_ASCII' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;"
sudo -u postgres pg_restore -d depscope_stage --no-owner --role=depscope /tmp/prod_to_stage.dump 2>&1 | tail -3
rm /tmp/prod_to_stage.dump

echo "[2/7] Code rsync (api, scripts, mcp-server; skip bak/venv/pycache/next/node_modules)"
sudo -u deploy rsync -a --delete --exclude='*.bak*' --exclude='__pycache__' --exclude='*.pyc' $PROD/api/ $STAGE/api/
sudo -u deploy rsync -a --delete --exclude='*.bak*' --exclude='__pycache__' --exclude='*.pyc' $PROD/scripts/ $STAGE/scripts/
sudo -u deploy rsync -a --delete --exclude='node_modules' $PROD/mcp-server/ $STAGE/mcp-server/

echo "[3/7] Frontend rsync (source only; will rebuild .next on stage)"
sudo -u deploy rsync -a --delete --exclude='node_modules' --exclude='.next' --exclude='tsconfig.tsbuildinfo' $PROD/frontend/ $STAGE/frontend/

echo "[4/7] Regenerate stage ecosystem.config.js from env"
sudo -u deploy tee $STAGE/ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [
    {
      name: "depscope-api-stage",
      cwd: "/home/deploy/depscope-stage",
      script: ".venv/bin/python3",
      args: "run.py",
      env: {
        DEPSCOPE_ADMIN_KEY: "ds_admin_stage_038a5f775217db119be15773f3cc041b",
        ADMIN_API_KEY: "ds_admin_stage_038a5f775217db119be15773f3cc041b",
        DATABASE_URL: "postgresql://depscope:${DEPSCOPE_DB_PASSWORD}@localhost:5432/depscope_stage",
        GH_TOKEN: "${DEPSCOPE_GH_TOKEN}",
        SMTP_HOST: "mail.cuttalo.com",
        SMTP_PORT: "587",
        SMTP_USER: "depscope@cuttalo.com",
        SMTP_PASS: "${DEPSCOPE_SMTP_PASS}",
        PORT: "8100",
        DEPSCOPE_ENV: "stage",
      },
    },
    {
      name: "depscope-mcp-stage",
      cwd: "/home/deploy/depscope-stage/mcp-server",
      script: "http-server.js",
      env: {
        DEPSCOPE_API_URL: "http://127.0.0.1:8100",
        DEPSCOPE_MCP_PORT: "8101",
        DEPSCOPE_MCP_HOST: "127.0.0.1",
        NODE_ENV: "production",
      },
    },
    {
      name: "depscope-web-stage",
      cwd: "/home/deploy/depscope-stage/frontend/.next/standalone",
      script: "server.js",
      env: {
        PORT: "3100",
        HOSTNAME: "0.0.0.0",
        NODE_ENV: "production",
      },
    },
  ],
};
EOF

echo "[5/7] Rebuild stage frontend"
cd $STAGE/frontend
sudo -u deploy npm ci --prefer-offline --no-audit --fund=false 2>&1 | tail -3
sudo -u deploy npm run build 2>&1 | tail -3
sudo -u deploy cp -r .next/static .next/standalone/.next/
sudo -u deploy cp -r public .next/standalone/

echo "[6/7] Reload stage PM2 processes"
sudo -u deploy pm2 startOrReload $STAGE/ecosystem.config.js --only depscope-api-stage,depscope-mcp-stage,depscope-web-stage 2>&1 | tail -3
sudo -u deploy pm2 save

echo "[7/7] Health check"
sleep 3
for port in 8100 8101 3100; do
  echo -n "  port $port: "
  curl -sk -o /dev/null -w "http=%{http_code}\n" "http://127.0.0.1:$port/" -m 5 || echo timeout
done
echo "DONE — stage mirrors prod as of $(date -u +%FT%TZ)"
