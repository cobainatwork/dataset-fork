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

echo "[3/3] docker compose up -d"
docker compose up -d

echo "Deploy complete. Service: http://localhost:${PORT:-1717}"
