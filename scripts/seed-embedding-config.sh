#!/usr/bin/env bash
# ============================================================
# Easy Dataset - seed EmbeddingConfig via API (no copy-paste payload)
# ------------------------------------------------------------
# 用途：避免使用者複製貼上長 JSON 時被 terminal wrap 切斷
#       (例如 "enabled":true 變成 "e\nnabled":true 導致 JSON
#       key 名變成 "e\\nnabled"，被 WRITABLE_FIELDS 過濾掉)。
#
# 用法：
#   方式 A：interactive 提示輸入
#     ./scripts/seed-embedding-config.sh
#
#   方式 B：env vars (script 內不會 echo key)
#     EMBEDDING_ENDPOINT=http://10.2.66.102/v1 \
#     EMBEDDING_API_KEY=gpustack_xxx \
#     EMBEDDING_MODEL=bge-m3-q8_0 \
#     ./scripts/seed-embedding-config.sh
#
#   方式 C：讀 .env (gitignored，記得 chmod 600)
#     echo 'EMBEDDING_ENDPOINT=http://10.2.66.102/v1' >> .env
#     echo 'EMBEDDING_API_KEY=gpustack_xxx' >> .env
#     echo 'EMBEDDING_MODEL=bge-m3-q8_0' >> .env
#     ./scripts/seed-embedding-config.sh
# ============================================================
set -euo pipefail

HOST="${HOST:-http://localhost:1717}"

# 載入 .env (如果存在)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Interactive 補值
if [ -z "${EMBEDDING_ENDPOINT:-}" ]; then
  read -rp "Embedding endpoint (e.g. http://10.2.66.102/v1): " EMBEDDING_ENDPOINT
fi
if [ -z "${EMBEDDING_API_KEY:-}" ]; then
  read -rsp "Embedding API key (input hidden): " EMBEDDING_API_KEY
  echo
fi
if [ -z "${EMBEDDING_MODEL:-}" ]; then
  read -rp "Embedding model name (e.g. bge-m3-q8_0): " EMBEDDING_MODEL
fi

if [ -z "$EMBEDDING_ENDPOINT" ] || [ -z "$EMBEDDING_API_KEY" ] || [ -z "$EMBEDDING_MODEL" ]; then
  echo "ERROR: EMBEDDING_ENDPOINT / EMBEDDING_API_KEY / EMBEDDING_MODEL all required" >&2
  exit 1
fi

# 用檔案傳 payload，避免 shell quote / terminal wrap 把 JSON 弄壞
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

# 注意：multi-line JSON 是合法的 — KV 之間允許 whitespace
cat > "$TMP" <<EOF
{
  "endpoint": "$EMBEDDING_ENDPOINT",
  "apiKey": "$EMBEDDING_API_KEY",
  "modelName": "$EMBEDDING_MODEL",
  "enabled": true
}
EOF

echo "PUT $HOST/api/embedding/config"
resp=$(curl -s -w "\n%{http_code}" -X PUT "$HOST/api/embedding/config" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TMP")

body=$(echo "$resp" | head -n -1)
code=$(echo "$resp" | tail -n 1)

if [ "$code" = "200" ]; then
  echo "  body: $body"
  echo "  HTTP $code"
else
  echo "  HTTP $code (FAIL)"
  echo "  body: $body"
  exit 1
fi

echo
echo "Verifying via GET /api/embedding/config (apiKey redacted):"
curl -s "$HOST/api/embedding/config" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  endpoint={d.get(\"endpoint\")}'); print(f'  modelName={d.get(\"modelName\")}'); print(f'  enabled={d.get(\"enabled\")}'); print(f'  hasApiKey={d.get(\"hasApiKey\")}')"

echo
echo "Verifying via GET /api/embedding/health:"
curl -s "$HOST/api/embedding/health"
echo
