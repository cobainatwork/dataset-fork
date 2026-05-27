#!/usr/bin/env bash
# check-embedding-task.sh — diagnose an embedding-incremental task
# usage:  ./scripts/check-embedding-task.sh [task-id]
# 不傳 task-id 則自動找最新一筆 status=0 (處理中) 的 task

set -euo pipefail

TASK_ID="${1:-}"

if [[ -z "$TASK_ID" ]]; then
  TASK_ID="$(docker compose exec -T postgres bash -lc \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "SELECT id FROM \"Task\" WHERE \"taskType\" = '"'"'embedding-incremental'"'"' AND status = 0 ORDER BY \"startTime\" DESC LIMIT 1;"' \
    | tr -d '[:space:]')"
  if [[ -z "$TASK_ID" ]]; then
    echo "找不到處理中的 embedding-incremental task。"
    exit 0
  fi
  echo "自動選定 task: $TASK_ID"
fi

echo
echo "=== Task 基本資訊 ==="
docker compose exec -T postgres bash -lc \
  "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"SELECT id, status, \\\"startTime\\\", NOW() - \\\"startTime\\\" AS elapsed FROM \\\"Task\\\" WHERE id = '$TASK_ID';\""

echo
echo "=== 進度（這個 task 的 questionIds 中已被 embedded 的筆數） ==="
docker compose exec -T postgres bash -lc \
  "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"
WITH tq AS (
  SELECT jsonb_array_elements_text((detail::jsonb)->'questionIds') AS qid
  FROM \\\"Task\\\" WHERE id = '$TASK_ID'
)
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE q.\\\"embeddedAt\\\" IS NOT NULL) AS embedded_done,
  COUNT(*) FILTER (WHERE q.\\\"embeddedAt\\\" IS NULL) AS pending,
  MAX(q.\\\"embeddedAt\\\") AS last_embedded_at,
  NOW() - MAX(q.\\\"embeddedAt\\\") AS idle_since
FROM tq JOIN \\\"Questions\\\" q ON q.id = tq.qid;
\""

echo
echo "=== 最近 5 分鐘的 embedding usage logs (反映 handler 是否在動) ==="
docker compose exec -T postgres bash -lc \
  "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -c \"SELECT \\\"dateString\\\", status, COUNT(*) AS n FROM \\\"EmbeddingUsageLogs\\\" WHERE \\\"createAt\\\" > NOW() - INTERVAL '5 minutes' GROUP BY 1, 2 ORDER BY 1 DESC;\""

echo
echo "=== docker logs 內最近 50 行的 embedding 相關訊息 ==="
docker compose logs --tail 300 easy-dataset 2>&1 | grep -iE "embedding|error" | tail -50 || true
