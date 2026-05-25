const { db } = require('@/lib/db/index');

async function getDashboardStats() {
  const [totalEmbedded, totalClusters, crossProject, divergentCount] = await Promise.all([
    db.questions.count({ where: { embeddedAt: { not: null } } }),
    db.questionCluster.count(),
    db.questionCluster.count({ where: { projectCount: { gte: 2 } } }),
    db.questionCluster.count({ where: { hasAnswerDivergence: true } }),
  ]);
  return { totalEmbedded, totalClusters, crossProject, divergentCount };
}

async function getRecentErrors(limit = 100) {
  return db.embeddingUsageLogs.findMany({
    where: { status: 'FAILED' },
    orderBy: { createAt: 'desc' },
    take: limit,
  });
}

async function getLatencyPercentiles() {
  const rows = await db.$queryRawUnsafe(
    `SELECT operation,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY latency) AS p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency) AS p95,
            percentile_cont(0.99) WITHIN GROUP (ORDER BY latency) AS p99
     FROM "EmbeddingUsageLogs"
     WHERE "status" = 'SUCCESS' AND "createAt" > NOW() - INTERVAL '7 days'
     GROUP BY operation`
  );
  return rows;
}

module.exports = { getDashboardStats, getRecentErrors, getLatencyPercentiles };
