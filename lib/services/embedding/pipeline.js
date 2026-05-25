const { decideClusterAssignment } = require('./domain/cluster');

function createPipeline({ embedding, vectorStore, clusterRepo, config, db }) {
  async function processNewQuestion({ id, text, projectId }) {
    const vec = await embedding.embed(text);
    await vectorStore.upsert('question', [{ id, vector: Array.from(vec), payload: { projectId, modelName: config.modelName } }]);

    const matches = await vectorStore.search('question', Array.from(vec), { top: 5, excludeIds: [id] });

    const matchIds = matches.map(m => m.id);
    const matchedQuestions = matchIds.length
      ? await db.questions.findMany({ where: { id: { in: matchIds } }, select: { id: true, clusterId: true } })
      : [];
    const clusterByQid = Object.fromEntries(matchedQuestions.map(q => [q.id, q.clusterId]));

    const decision = decideClusterAssignment({
      matches,
      threshold: config.clusterThreshold,
      currentClusterFor: (qid) => clusterByQid[qid] || null,
    });

    if (decision.action === 'create') {
      const created = await clusterRepo.create({
        primaryQuestionId: id,
        size: 1,
        projectCount: 1,
        avgSimilarity: 0,
        hasAnswerDivergence: false,
        embeddingModel: config.modelName,
        thresholdAtCreate: config.clusterThreshold,
        version: 0,
      });
      const clusterId = created.id;
      await db.clusterProject.upsert({
        where: { clusterId_projectId: { clusterId, projectId } },
        create: { clusterId, projectId },
        update: {},
      });
      await db.questions.update({
        where: { id },
        data: { clusterId, clusterRole: 'primary', similarityScore: 0, embeddingModel: config.modelName, embeddedAt: new Date() },
      });
      return { clusterId, created: true };
    } else {
      for (let attempt = 0; attempt < 5; attempt++) {
        const cluster = await clusterRepo.findById(decision.clusterId);
        if (!cluster) throw new Error(`Cluster ${decision.clusterId} not found`);
        try {
          await clusterRepo.update(cluster.id, {
            size: cluster.size + 1,
            version: cluster.version,
          });
          await db.clusterProject.upsert({
            where: { clusterId_projectId: { clusterId: cluster.id, projectId } },
            create: { clusterId: cluster.id, projectId },
            update: {},
          });
          await db.questions.update({
            where: { id },
            data: {
              clusterId: cluster.id,
              clusterRole: 'member',
              similarityScore: decision.similarity,
              embeddingModel: config.modelName,
              embeddedAt: new Date(),
            },
          });
          return { clusterId: cluster.id, attached: true };
        } catch (e) {
          if (!String(e.message).includes('OPTIMISTIC_LOCK')) throw e;
        }
      }
      throw new Error(`Cluster ${decision.clusterId} optimistic lock retries exhausted`);
    }
  }

  return { processNewQuestion };
}

module.exports = { createPipeline };
