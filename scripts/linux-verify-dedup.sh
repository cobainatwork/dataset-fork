#!/usr/bin/env bash
# ============================================================
# Easy Dataset - dedup feature smoke (no API key required)
# ------------------------------------------------------------
# 用途：Linux 部署後驗證 dedup 後端 routes 都活著。
# 不種 EmbeddingConfig（需要 API key，請手動跑 curl PUT）。
# ============================================================
set -euo pipefail

HOST="${HOST:-http://localhost:1717}"
fail=0

check() {
  local name="$1" url="$2" expected="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [ "$code" = "$expected" ]; then
    printf "  [OK]   %-40s HTTP %s\n" "$name" "$code"
  else
    printf "  [FAIL] %-40s HTTP %s (expected %s)\n" "$name" "$code" "$expected"
    fail=$((fail + 1))
  fi
}

echo "=== dedup feature smoke against $HOST ==="

check "GET /api/projects (sanity)"            "$HOST/api/projects"                          200
check "GET /api/embedding/config"             "$HOST/api/embedding/config"                  200
check "GET /api/embedding/health"             "$HOST/api/embedding/health"                  200
check "GET /api/embedding/stats"              "$HOST/api/embedding/stats"                   200
check "GET /api/embedding/clusters?minSize=2" "$HOST/api/embedding/clusters?minSize=2"      200
check "GET /api/embedding/trust"              "$HOST/api/embedding/trust"                   200
check "GET /duplicates"                       "$HOST/duplicates"                            200
check "GET /trust"                            "$HOST/trust"                                 200
check "GET /monitoring"                       "$HOST/monitoring"                            200

echo
echo "=== /api/embedding/health body ==="
curl -s "$HOST/api/embedding/health"; echo
echo
echo "=== /api/embedding/config (apiKey redacted) ==="
curl -s "$HOST/api/embedding/config"; echo

if [ "$fail" -eq 0 ]; then
  echo
  echo "All checks passed."
  echo "Next step: seed EmbeddingConfig with your real GPUStack/Ollama/etc. endpoint:"
  echo
  echo "  curl -X PUT $HOST/api/embedding/config \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"endpoint\":\"http://YOUR_BACKEND/v1\",\"apiKey\":\"YOUR_KEY\",\"modelName\":\"bge-m3-q8_0\",\"enabled\":true}'"
  echo
  echo "Then re-check health:"
  echo "  curl $HOST/api/embedding/health"
  exit 0
else
  echo
  echo "$fail check(s) failed. Inspect logs: docker compose logs easy-dataset --tail 60"
  exit 1
fi
