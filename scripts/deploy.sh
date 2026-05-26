#!/usr/bin/env bash
# ============================================================
# Easy Dataset - Local Deploy Script
# ------------------------------------------------------------
# 用途：Linux 主機上更新與重啟服務。
# 流程：git pull → docker build (本地 image) → docker compose up
#
# 假設：
#   - 當前目錄為 git repo 工作樹根目錄，或腳本由 repo 內呼叫
#   - docker-entrypoint.sh 會在啟動時處理 DB 初始化
#   - schema.prisma 變更後若需同步既有 DB，請手動執行
#     docker compose exec easy-dataset pnpm prisma db push
# ============================================================
set -euo pipefail

# 切換到 repo 根目錄（無論從何處呼叫此腳本）
cd "$(dirname "$0")/.."

echo "[1/3] git pull"
git pull --ff-only

echo "[2/3] docker build -t easy-dataset:local ."
docker build -t easy-dataset:local .

echo "[3/4] docker compose up -d (force-recreate easy-dataset for new image)"
docker compose up -d postgres
docker compose up -d --force-recreate easy-dataset

echo "[4/4] Waiting for app HTTP readiness..."
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT:-1717}/api/projects" || echo "000")
  if [ "$code" = "200" ]; then
    echo "App responding HTTP 200 after ${i}s"
    break
  fi
  sleep 1
done

echo "Deploy complete. Service: http://localhost:${PORT:-1717}"
echo "Next: scripts/linux-verify-dedup.sh to smoke the dedup feature."
