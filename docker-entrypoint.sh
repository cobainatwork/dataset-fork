#!/bin/sh
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "${GREEN}=== Easy Dataset Database Initialization ===${NC}"

cd /app

echo "${YELLOW}Running prisma migrate deploy...${NC}"
pnpm prisma migrate deploy

echo "${GREEN}=== Database ready. Starting application... ===${NC}"
exec "$@"
