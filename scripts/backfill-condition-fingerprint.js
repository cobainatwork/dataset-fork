#!/usr/bin/env node
'use strict';

const { PrismaClient } = require('@prisma/client');
const { extractConditionFingerprint } = require('../lib/services/embedding/condition-fingerprint');

const BATCH = 200;

async function main() {
  const prisma = new PrismaClient();
  let cursor;
  let total = 0;
  let withFp = 0;

  while (true) {
    const rows = await prisma.questions.findMany({
      where: { conditionFingerprint: null },
      take: BATCH,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      select: { id: true, question: true },
    });
    if (!rows.length) break;
    for (const r of rows) {
      const fp = extractConditionFingerprint(r.question);
      if (fp) {
        await prisma.questions.update({ where: { id: r.id }, data: { conditionFingerprint: fp } });
        withFp++;
      }
    }
    total += rows.length;
    cursor = rows[rows.length - 1].id;
    console.log(`scanned ${total}, with fingerprint ${withFp}`);
  }
  await prisma.$disconnect();
  console.log('done');
}

main().catch(err => { console.error(err); process.exit(1); });
