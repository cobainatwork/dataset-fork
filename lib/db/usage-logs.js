'use server';
import { db } from './client';

// LLM usage log（llmUsageLogs）存取層

/**
 * 記錄一筆 LLM 使用日誌
 * @param {Object} data - Prisma create data
 */
export async function addUsageLog(data) {
  return await db.llmUsageLogs.create({ data });
}

/**
 * 日誌數量
 * @param {Object} where - Prisma where 條件
 */
export async function countUsageLogs(where) {
  return await db.llmUsageLogs.count({ where });
}

/**
 * 通用日誌查詢
 * @param {Object} args - Prisma findMany 引數（where/select/distinct...）
 */
export async function findUsageLogs(args) {
  return await db.llmUsageLogs.findMany(args);
}
