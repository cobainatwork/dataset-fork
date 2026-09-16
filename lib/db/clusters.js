'use server';
import { db } from './client';

// Question cluster / cluster feedback 存取層（embedding cluster 管理 route 用）

/**
 * 取單個 cluster，附 project 關聯與最近 50 則 feedback
 */
export async function getClusterWithDetails(id) {
  return await db.questionCluster.findUnique({
    where: { id },
    include: {
      ClusterProject: true,
      Feedback: { orderBy: { createAt: 'desc' }, take: 50 },
    },
  });
}

/**
 * 列出 cluster（附 project 關聯）
 * @param {Object} filters
 * @param {string} [filters.projectId]
 * @param {boolean} [filters.onlyDivergent]
 * @param {number} [filters.minSize]
 */
export async function listClusters({ projectId, onlyDivergent = false, minSize = 2 } = {}) {
  return await db.questionCluster.findMany({
    where: {
      size: { gte: minSize },
      ...(onlyDivergent ? { hasAnswerDivergence: true } : {}),
      ...(projectId ? { ClusterProject: { some: { projectId } } } : {}),
    },
    take: 100,
    orderBy: { size: 'desc' },
    include: {
      ClusterProject: { select: { projectId: true } },
    },
  });
}

export async function getRecentClusterFeedback(limit = 5000) {
  return await db.clusterFeedback.findMany({ orderBy: { createAt: 'desc' }, take: limit });
}

export async function createClusterFeedback(data) {
  return await db.clusterFeedback.create({ data });
}
