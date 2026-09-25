#!/usr/bin/env bash
set -e

REPO_DIR="/home/ubuntu/luma"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/deploy.log"

mkdir -p "$LOG_DIR"

exec >> "$LOG_FILE" 2>&1
echo "=========================================="
echo "⚡ Deployment triggered at $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Trigger source: ${1:-auto}"
echo "=========================================="

cd "$REPO_DIR"

# 1. Check and pull remote git changes if available
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "--> Checking remote git repository..."
  git fetch origin main || echo "Warning: git fetch failed or offline, continuing with local code."
  LOCAL_HASH=$(git rev-parse HEAD)
  REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL_HASH")
  
  if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo "--> Pulling latest remote changes: $LOCAL_HASH -> $REMOTE_HASH"
    git merge origin/main --ff-only || git reset --hard origin/main
  else
    echo "--> Local git commit is up-to-date ($LOCAL_HASH)."
  fi
fi

# 2. Build backend and frontend
export PATH="/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
echo "--> Running build across monorepo..."
pnpm build

# 3. Deploy frontend to /var/www/luma
echo "--> Syncing frontend build to /var/www/luma..."
sudo rm -rf /var/www/luma/*
sudo cp -a apps/web/dist/. /var/www/luma/
sudo chown -R www-data:www-data /var/www/luma
sudo chmod -R a+rX /var/www/luma

# 4. Restart backend service
echo "--> Restarting luma-api.service..."
sudo systemctl restart luma-api

# 5. Reload Nginx
echo "--> Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment finished successfully at $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=========================================="
