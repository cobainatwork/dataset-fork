const { decideClusterAssignment, computeNextAvgSimilarity } = require('./domain/cluster');
const { classifyAnswers, pairwiseCosineAvg } = require('./domain/divergence');
const { OptimisticLockError } = require('./errors');
const { extractConditionFingerprint } = require('./condition-fingerprint');

const MAX_NEIGHBORS = 5;
const MAX_OPTIMISTIC_LOCK_RETRIES = 5;

/**
 * 建立 dedup pipeline。所有 DB 存取走 seam（embedding / vectorStore /
 * clusterRepo / questionStore），本模組不持有裸 PrismaClient。
 *
 * @param {Object} deps
 * @param {import('./ports').IEmbeddingProvider} deps.embedding
 * @param {import('./ports').IVectorStore} deps.vectorStore
 * @param {import('./ports').IClusterRepository} deps.clusterRepo
 * @param {import('./ports').IQuestionStore} deps.questionStore
 * @param {Object} deps.config
 */
function createPipeline({ embedding, vectorStore, clusterRepo, questionStore, config }) {
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
    await questionStore.linkToCluster(questionId, {
      projectId,
      clusterId: created.id,
      role: 'primary',
      similarity: 0,
      modelName: config.modelName,
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
        await questionStore.linkToCluster(questionId, {
          projectId,
          clusterId: cluster.id,
          role: 'member',
          similarity: decision.similarity,
          modelName: config.modelName,
        });
        return { clusterId: cluster.id, attached: true };
      } catch (e) {
        if (!(e instanceof OptimisticLockError)) throw e;
      }
    }
    throw new Error(`Cluster ${decision.clusterId} optimistic lock retries exhausted`);
  }

  async function processOneQuestion({ id, text, projectId, chunkId }) {
    const candidateFingerprint = extractConditionFingerprint(text);
    // fingerprint update（DB I/O）與 embed（外部 API I/O）互相獨立，
    // 平行化省一次 round-trip 延遲。失敗語意：embed 失敗→無 cluster、留 orphan
    // fingerprint（safe，retry 時 deterministic 重寫同值）；update 失敗→純 throw、
    // vector 計算結果丟棄、整個 processOneQuestion fail。
    const [, embedded] = await Promise.all([
      questionStore.updateFingerprint(id, candidateFingerprint),
      embedding.embed(text),
    ]);
    const vector = Array.from(embedded);
    await vectorStore.upsert('question', [
      { id, vector, payload: { projectId, modelName: config.modelName } },
    ]);

    // 排除集經 questionStore 解析成 id 列表，vector store seam 只看 excludeIds，
    // 不接觸 Questions 表（原 pgvector JOIN 洩漏點）。
    // ponytail: excludeIds 內含同 project 全部 question id，大專案下是數千 id 的
    // SQL array 參數（舊 JOIN 在 DB 內過濾）；若大專案 dedup 變慢，改回 DB 內過濾。
    const excludedIds = await questionStore.findExcludedQuestionIds({ chunkId, projectId });
    const matches = await vectorStore.search('question', vector, {
      top: MAX_NEIGHBORS,
      excludeIds: [id, ...excludedIds],
    });
    const matchedQuestions = matches.length
      ? await questionStore.findByIds(matches.map(m => m.id))
      : [];
    const clusterByQid = {};
    const fpByQid = {};
    for (const q of matchedQuestions) {
      clusterByQid[q.id] = q.clusterId;
      fpByQid[q.id] = q.conditionFingerprint || null;
    }
    const decision = decideClusterAssignment({
      matches,
      threshold: config.clusterThreshold,
      currentClusterFor: qid => clusterByQid[qid] || null,
      fingerprintFor: qid => fpByQid[qid] || null,
      candidateFingerprint,
      fingerprintGuardEnabled: config.fingerprintGuardEnabled !== false,
    });

    return decision.action === 'create'
      ? createClusterFor({ questionId: id, projectId })
      : attachQuestionToCluster({ questionId: id, projectId, decision });
  }

  function usageEntry(q, t0, outcome) {
    return {
      provider: 'openai-compat',
      model: config.modelName,
      operation: 'embed',
      tokens: 0,
      vectorCount: 1,
      latency: Date.now() - t0,
      status: outcome.status,
      ...(outcome.status === 'FAILED' && {
        errorMessage: String(outcome.error.message || outcome.error).slice(0, 500),
        errorType: classifyError(outcome.error),
      }),
      projectId: q.projectId,
      dateString: new Date().toISOString().slice(0, 10),
    };
  }

  /**
   * 批次處理問題：per-question 隔離（單題失敗不中斷批次），
   * 每題記一筆 embedding usage log。
   * @param {import('./ports').QuestionInput[]} questions
   * @returns {Promise<{ id: string, ok: boolean }[]>}
   */
  async function processQuestions(questions) {
    const results = [];
    for (const q of questions) {
      const t0 = Date.now();
      try {
        await processOneQuestion(q);
        await questionStore.logEmbeddingUsage(usageEntry(q, t0, { status: 'SUCCESS' }));
        results.push({ id: q.id, ok: true });
      } catch (e) {
        console.error(`[embedding-pipeline] failed q=${q.id}`, e);
        try {
          await questionStore.logEmbeddingUsage(usageEntry(q, t0, { status: 'FAILED', error: e }));
        } catch (logErr) {
          // usage log 失敗不能中斷批次
          console.error(`[embedding-pipeline] usage log failed q=${q.id}`, logErr);
        }
        results.push({ id: q.id, ok: false });
      }
    }
    return results;
  }

  /**
   * 掃描 cluster 已確認答案的離散度。
   * 注意：目前無生產呼叫者（保留給手動觸發路徑），僅測試覆蓋。
   */
  async function processAnswerDivergence(clusterId) {
    const datasets = await questionStore.findConfirmedDatasets(clusterId);
    if (datasets.length < 2) {
      await questionStore.recordDivergence(clusterId, { hasAnswerDivergence: false, divergenceScore: 1.0 });
      return;
    }
    const vectors = [];
    for (const d of datasets) {
      const arr = Array.from(await embedding.embed(d.answer));
      vectors.push(arr);
      await vectorStore.upsert('answer', [{ id: d.id, vector: arr, payload: { projectId: d.projectId } }]);
    }
    const avg = pairwiseCosineAvg(vectors);
    const flag = classifyAnswers({ avgSim: avg, divergenceThreshold: config.divergenceThreshold });

    await questionStore.recordDivergence(clusterId, {
      hasAnswerDivergence: flag === 'divergent',
      divergenceScore: avg,
      flag,
    });
  }

  return { processQuestions, processAnswerDivergence };
}

function classifyError(e) {
  const m = String(e.message || '');
  if (m.includes('timeout')) return 'TIMEOUT';
  if (m.includes('ECONNREFUSED') || m.includes('network')) return 'NETWORK';
  if (m.includes('dimension')) return 'DIMENSION';
  if (m.includes('NaN')) return 'INVALID_VECTOR';
  return 'UNKNOWN';
}

module.exports = { createPipeline };
