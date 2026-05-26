const { OptimisticLockError } = require('../errors');

function createPrismaClusterRepository(prisma) {
  async function findById(id) {
    return prisma.questionCluster.findUnique({ where: { id } });
  }

  async function create(cluster) {
    return prisma.questionCluster.create({ data: cluster });
  }

  async function update(id, patch) {
    const { version, ...fields } = patch;
    if (version === undefined) throw new Error('update requires version (optimistic lock)');
    const result = await prisma.questionCluster.updateMany({
      where: { id, version },
      data: { ...fields, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new OptimisticLockError(`cluster ${id} version mismatch`);
    }
  }

  async function attachQuestion(questionId, info) {
    return prisma.questions.update({
      where: { id: questionId },
      data: {
        clusterId: info.clusterId,
        clusterRole: info.role,
        similarityScore: info.similarity,
      },
    });
  }

  return { findById, create, update, attachQuestion };
}

module.exports = { createPrismaClusterRepository };
