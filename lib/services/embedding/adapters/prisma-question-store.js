/**
 * question store seam 的 prisma adapter：pipeline 對 Questions /
 * ClusterProject / Datasets / EmbeddingUsageLogs 的全部 prisma writes
 * 收在這一個模組。
 */
function createPrismaQuestionStore(prisma) {
  async function updateFingerprint(id, fingerprint) {
    await prisma.questions.update({
      where: { id },
      data: { conditionFingerprint: fingerprint },
    });
  }

  async function linkToCluster(id, { projectId, clusterId, role, similarity, modelName }) {
    await prisma.clusterProject.upsert({
      where: { clusterId_projectId: { clusterId, projectId } },
      create: { clusterId, projectId },
      update: {},
    });
    await prisma.questions.update({
      where: { id },
      data: {
        clusterId,
        clusterRole: role,
        similarityScore: similarity,
        embeddingModel: modelName,
        embeddedAt: new Date(),
      },
    });
  }

  async function findByIds(ids) {
    if (!ids.length) return [];
    return prisma.questions.findMany({
      where: { id: { in: ids } },
      select: { id: true, clusterId: true, conditionFingerprint: true },
    });
  }

  async function findExcludedQuestionIds({ chunkId, projectId } = {}) {
    const conds = [];
    if (chunkId) conds.push({ chunkId });
    if (projectId) conds.push({ projectId });
    if (!conds.length) return [];
    const rows = await prisma.questions.findMany({ where: { OR: conds }, select: { id: true } });
    return rows.map(r => r.id);
  }

  async function findConfirmedDatasets(clusterId) {
    return prisma.datasets.findMany({
      where: { clusterId, confirmed: true },
      select: { id: true, answer: true, projectId: true },
    });
  }

  async function recordDivergence(clusterId, { hasAnswerDivergence, divergenceScore, flag }) {
    await prisma.$transaction([
      prisma.questionCluster.update({
        where: { id: clusterId },
        data: { hasAnswerDivergence, divergenceScore, version: { increment: 1 } },
      }),
      ...(flag
        ? [prisma.datasets.updateMany({ where: { clusterId }, data: { divergenceFlag: flag } })]
        : []),
    ]);
  }

  async function logEmbeddingUsage(entry) {
    await prisma.embeddingUsageLogs.create({ data: entry });
  }

  return {
    updateFingerprint,
    linkToCluster,
    findByIds,
    findExcludedQuestionIds,
    findConfirmedDatasets,
    recordDivergence,
    logEmbeddingUsage,
  };
}

module.exports = { createPrismaQuestionStore };
