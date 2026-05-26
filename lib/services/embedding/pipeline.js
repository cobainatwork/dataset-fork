const { decideClusterAssignment, computeNextAvgSimilarity } = require('./domain/cluster');
const { classifyAnswers, pairwiseCosineAvg } = require('./domain/divergence');
const { OptimisticLockError } = require('./errors');

const MAX_NEIGHBORS = 5;
const MAX_OPTIMISTIC_LOCK_RETRIES = 5;

function createPipeline({ embedding, vectorStore, clusterRepo, config, db }) {
  async function linkQuestionToCluster({ questionId, projectId, clusterId, role, similarity }) {
    await db.clusterProject.upsert({
      where: { clusterId_projectId: { clusterId, projectId } },
      create: { clusterId, projectId },
      update: {},
    });
    await db.questions.update({
      where: { id: questionId },
      data: {
        clusterId,
        clusterRole: role,
        similarityScore: similarity,
        embeddingModel: config.modelName,
        embeddedAt: new Date(),
      },
    });
  }

  async function createClusterFor({ questionId, projectId }) {
    const created = await clusterRepo.create({
      primaryQuestionId: questionId,
      size: 1,
      projectCount: 1,
      avgSimilarity: 0,
      hasAnswerDivergence: false,
      embeddingModel: config.modelName,
      thresholdAtCreate: config.clusterThreshold,
      version: 0,
    });
    await linkQuestionToCluster({
      questionId,
      projectId,
      clusterId: created.id,
      role: 'primary',
      similarity: 0,
    });
    return { clusterId: created.id, created: true };
  }

  async function attachQuestionToCluster({ questionId, projectId, decision }) {
    for (let attempt = 0; attempt < MAX_OPTIMISTIC_LOCK_RETRIES; attempt++) {
      const cluster = await clusterRepo.findById(decision.clusterId);
      if (!cluster) throw new Error(`Cluster ${decision.clusterId} not found`);
      try {
        await clusterRepo.update(cluster.id, {
          size: cluster.size + 1,
          version: cluster.version,
          avgSimilarity: computeNextAvgSimilarity({
            currentAvg: cluster.avgSimilarity || 0,
            currentSize: cluster.size,
            newSimilarity: decision.similarity,
          }),
        });
        await linkQuestionToCluster({
          questionId,
          projectId,
          clusterId: cluster.id,
          role: 'member',
          similarity: decision.similarity,
        });
        return { clusterId: cluster.id, attached: true };
      } catch (e) {
        if (!(e instanceof OptimisticLockError)) throw e;
      }
    }
    throw new Error(`Cluster ${decision.clusterId} optimistic lock retries exhausted`);
  }

  async function decideForQuestion({ questionId, vector }) {
    const matches = await vectorStore.search('question', vector, {
      top: MAX_NEIGHBORS,
      excludeIds: [questionId],
    });
    const matchIds = matches.map(m => m.id);
    const matchedQuestions = matchIds.length
      ? await db.questions.findMany({
          where: { id: { in: matchIds } },
          select: { id: true, clusterId: true },
        })
      : [];
    const clusterByQid = Object.fromEntries(matchedQuestions.map(q => [q.id, q.clusterId]));
    return decideClusterAssignment({
      matches,
      threshold: config.clusterThreshold,
      currentClusterFor: qid => clusterByQid[qid] || null,
    });
  }

  async function processNewQuestion({ id, text, projectId }) {
    const vector = Array.from(await embedding.embed(text));
    await vectorStore.upsert('question', [
      { id, vector, payload: { projectId, modelName: config.modelName } },
    ]);

    const decision = await decideForQuestion({ questionId: id, vector });

    return decision.action === 'create'
      ? createClusterFor({ questionId: id, projectId })
      : attachQuestionToCluster({ questionId: id, projectId, decision });
  }

  async function processAnswerDivergence(clusterId) {
    const datasets = await db.datasets.findMany({
      where: { clusterId, confirmed: true },
      select: { id: true, answer: true, projectId: true },
    });
    if (datasets.length < 2) {
      await db.questionCluster.update({
        where: { id: clusterId },
        data: { hasAnswerDivergence: false, divergenceScore: 1.0, version: { increment: 1 } },
      });
      return;
    }
    const vectors = [];
    for (const d of datasets) {
      const v = await embedding.embed(d.answer);
      const arr = Array.from(v);
      vectors.push(arr);
      await vectorStore.upsert('answer', [{ id: d.id, vector: arr, payload: { projectId: d.projectId } }]);
    }
    const avg = pairwiseCosineAvg(vectors);
    const flag = classifyAnswers({ avgSim: avg, divergenceThreshold: config.divergenceThreshold });

    await db.$transaction([
      db.questionCluster.update({
        where: { id: clusterId },
        data: {
          hasAnswerDivergence: flag === 'divergent',
          divergenceScore: avg,
          version: { increment: 1 },
        },
      }),
      db.datasets.updateMany({
        where: { clusterId },
        data: { divergenceFlag: flag },
      }),
    ]);
  }

  return { processNewQuestion, processAnswerDivergence };
}

module.exports = { createPipeline };
