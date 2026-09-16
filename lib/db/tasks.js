'use server';
import { db } from './client';

// Task 表（模型評估 / 盲測 / embedding 回填等任務）的薄存取層
// route 層一律走這些命名函式，不直接 import PrismaClient。

/**
 * 依 ID 取單一任務
 * @param {string} id
 */
export async function getTaskById(id) {
  return await db.task.findUnique({ where: { id } });
}

/**
 * 取符合條件的第一個任務
 * @param {Object} where - Prisma where 條件
 */
export async function findFirstTask(where) {
  return await db.task.findFirst({ where });
}

/**
 * 通用任務查詢
 * @param {Object} args - Prisma findMany 引數（where/orderBy/skip/take...）
 */
export async function findTasks(args) {
  return await db.task.findMany(args);
}

/**
 * 任務數量
 * @param {Object} where - Prisma where 條件
 */
export async function countTasks(where) {
  return await db.task.count({ where });
}

/**
 * 建立任務
 * @param {Object} data - Prisma create data
 */
export async function createTask(data) {
  return await db.task.create({ data });
}

/**
 * 更新任務
 * @param {string} id
 * @param {Object} data - Prisma update data
 */
export async function updateTask(id, data) {
  return await db.task.update({ where: { id }, data });
}

/**
 * 刪除任務
 * @param {string} id
 */
export async function deleteTaskById(id) {
  return await db.task.delete({ where: { id } });
}
