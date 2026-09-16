/**
 * pipeline unit 測試（C3）：全部走 fake adapter，不需 Postgres。
 * seam：createPipeline({ embedding, vectorStore, clusterRepo, questionStore, config })
 */
const { createPipeline } = require('@/lib/services/embedding/pipeline');
const { OptimisticLockError } = require('@/lib/services/embedding/errors');
const { extractConditionFingerprint } = require('@/lib/services/embedding/condition-fingerprint');

const CONFIG = {
  modelName: 'fake-model',
  clusterThreshold: 0.88,
  divergenceThreshold: 0.7,
  fingerprintGuardEnabled: true,
};

function cosine(a, b) {
  const d = Math.hypot(...a) * Math.hypot(...b);
  return d === 0 ? 0 : a.reduce((s, v, i) => s + v * b[i], 0) / d;
}

function makeFakeEmbedding(vecFor) {
  return {
    embed: async t => new Float32Array(vecFor(t)),
    embedBatch: async ts => ts.map(t => new Float32Array(vecFor(t))),
    dimension: () => 2,
    healthCheck: async () => true,
  };
}

function makeFakeVectorStore() {
  const collections = new Map(); // sourceType -> Map(id -> point)
  return {
    collections,
    async upsert(sourceType, list) {
      const m = collections.get(sourceType) || new Map();
      for (const p of list) m.set(p.id, { ...p });
      collections.set(sourceType, m);
    },
    async search(sourceType, vector, opts = {}) {
      const m = collections.get(sourceType) || new Map();
      const exclude = new Set(opts.excludeIds || []);
      return [...m.entries()]
        .filter(([id]) => !exclude.has(id))
        .map(([id, p]) => ({ id, score: cosine(vector, p.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.top || 5);
    },
  };
}

function makeFakeClusterRepo(seed = {}) {
  const clusters = new Map(Object.entries(seed).map(([id, c]) => [id, { ...c }]));
  let seq = 0;
  let lockFailuresLeft = 0;
  return {
    clusters,
    setLockFailures(n) { lockFailuresLeft = n; },
    async findById(id) {
      const c = clusters.get(id);
      return c ? { ...c } : null;
    },
    async create(cluster) {
      const id = cluster.id || `c_fake_${++seq}`;
      const row = { ...cluster, id };
      clusters.set(id, row);
      return row;
    },
    async update(id, patch) {
      const { version, ...fields } = patch;
      const c = clusters.get(id);
      if (!c || c.version !== version) throw new OptimisticLockError(`cluster ${id} version mismatch`);
      if (lockFailuresLeft > 0) {
        lockFailuresLeft--;
        throw new OptimisticLockError(`cluster ${id} version mismatch`);
      }
      Object.assign(c, fields, { version: c.version + 1 });
    },
  };
}

function makeFakeQuestionStore(seed = {}) {
  const questions = new Map(Object.entries(seed.questions || {}).map(([id, q]) => [id, { ...q }]));
  const datasets = [...(seed.datasets || [])];
  const calls = { links: [], usageLogs: [], divergence: [] };
  return {
    questions,
    calls,
    async updateFingerprint(id, fp) {
      const q = questions.get(id);
      if (q) q.conditionFingerprint = fp;
    },
    async linkToCluster(id, info) {
      calls.links.push({ id, ...info });
      const q = questions.get(id);
      if (q) Object.assign(q, { clusterId: info.clusterId, clusterRole: info.role, similarityScore: info.similarity });
    },
    async findByIds(ids) {
      return ids.flatMap(id => {
        const q = questions.get(id);
        return q ? [{ id, clusterId: q.clusterId ?? null, conditionFingerprint: q.conditionFingerprint ?? null }] : [];
      });
    },
    async findExcludedQuestionIds({ chunkId, projectId } = {}) {
      return [...questions.entries()]
        .filter(([, q]) => (chunkId && q.chunkId === chunkId) || (projectId && q.projectId === projectId))
        .map(([id]) => id);
    },
    async findConfirmedDatasets(clusterId) {
      return datasets
        .filter(d => d.clusterId === clusterId && d.confirmed)
        .map(({ id, answer, projectId }) => ({ id, answer, projectId }));
    },
    async recordDivergence(clusterId, info) {
      calls.divergence.push({ clusterId, ...info });
    },
    async logEmbeddingUsage(entry) {
      calls.usageLogs.push(entry);
    },
  };
}

// 向量：A/B 相同方向（cos 1.0），C 正交（cos 0）
const VEC = { A: [1, 0], B: [1, 0], C: [0, 1] };
const vecFor = t => {
  const v = VEC[t];
  if (!v) throw new Error(`no vector for ${t}`);
  return v;
};

function buildPipeline({ store, repo, vs, embedding }) {
  return createPipeline({
    embedding: embedding || makeFakeEmbedding(vecFor),
    vectorStore: vs,
    clusterRepo: repo,
    questionStore: store,
    config: CONFIG,
  });
}

describe('pipeline.processQuestions (fake adapters)', () => {
  it('creates a cluster for a question with no close neighbors', async () => {
    const store = makeFakeQuestionStore({ questions: { q1: { chunkId: 'ch1', projectId: 'p1' } } });
    const repo = makeFakeClusterRepo();
    const vs = makeFakeVectorStore();
    const pipeline = buildPipeline({ store, repo, vs });

    const results = await pipeline.processQuestions([{ id: 'q1', text: 'A', projectId: 'p1', chunkId: 'ch1' }]);

    expect(results).toEqual([{ id: 'q1', ok: true }]);
    expect(repo.clusters.size).toBe(1);
    const cluster = [...repo.clusters.values()][0];
    expect(cluster).toMatchObject({
      primaryQuestionId: 'q1',
      size: 1,
      projectCount: 1,
      avgSimilarity: 0,
      embeddingModel: 'fake-model',
      thresholdAtCreate: 0.88,
      version: 0,
    });
    expect(store.questions.get('q1').clusterId).toBe(cluster.id);
    expect(store.calls.links).toEqual([
      expect.objectContaining({ id: 'q1', clusterId: cluster.id, role: 'primary', similarity: 0 }),
    ]);
    expect(store.questions.get('q1').conditionFingerprint).toBe(extractConditionFingerprint('A'));
    expect(vs.collections.get('question').get('q1')).toMatchObject({
      payload: { projectId: 'p1', modelName: 'fake-model' },
    });
    expect(store.calls.usageLogs).toHaveLength(1);
    expect(store.calls.usageLogs[0]).toMatchObject({ status: 'SUCCESS', vectorCount: 1, model: 'fake-model' });
  });

  it('attaches a cross-project near-duplicate to the existing cluster', async () => {
    const store = makeFakeQuestionStore({
      questions: {
        q1: { clusterId: 'c1', projectId: 'p1', chunkId: 'ch1' },
        q2: { projectId: 'p2', chunkId: 'ch2' },
      },
    });
    const repo = makeFakeClusterRepo({
      c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1, avgSimilarity: 0, version: 0 },
    });
    const vs = makeFakeVectorStore();
    await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
    const pipeline = buildPipeline({ store, repo, vs });

    const results = await pipeline.processQuestions([{ id: 'q2', text: 'B', projectId: 'p2', chunkId: 'ch2' }]);

    expect(results).toEqual([{ id: 'q2', ok: true }]);
    expect(repo.clusters.size).toBe(1);
    const cluster = repo.clusters.get('c1');
    expect(cluster.size).toBe(2);
    expect(cluster.version).toBe(1);
    expect(cluster.avgSimilarity).toBeCloseTo(1.0);
    expect(store.questions.get('q2').clusterId).toBe('c1');
    expect(store.questions.get('q2').clusterRole).toBe('member');
  });

  it('creates a new cluster when no match is above the threshold', async () => {
    const store = makeFakeQuestionStore({
      questions: {
        q1: { clusterId: 'c1', projectId: 'p1', chunkId: 'ch1' },
        q2: { projectId: 'p2', chunkId: 'ch2' },
      },
    });
    const repo = makeFakeClusterRepo({
      c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1, avgSimilarity: 0, version: 0 },
    });
    const vs = makeFakeVectorStore();
    await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
    const pipeline = buildPipeline({ store, repo, vs });

    await pipeline.processQuestions([{ id: 'q2', text: 'C', projectId: 'p2', chunkId: 'ch2' }]);

    expect(repo.clusters.size).toBe(2);
    expect(store.questions.get('q2').clusterRole).toBe('primary');
  });

  it('retries the attach on optimistic lock conflict', async () => {
    const store = makeFakeQuestionStore({
      questions: {
        q1: { clusterId: 'c1', projectId: 'p1', chunkId: 'ch1' },
        q2: { projectId: 'p2', chunkId: 'ch2' },
      },
    });
    const repo = makeFakeClusterRepo({
      c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1, avgSimilarity: 0, version: 0 },
    });
    repo.setLockFailures(2);
    const vs = makeFakeVectorStore();
    await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
    const pipeline = buildPipeline({ store, repo, vs });

    const results = await pipeline.processQuestions([{ id: 'q2', text: 'B', projectId: 'p2', chunkId: 'ch2' }]);

    expect(results).toEqual([{ id: 'q2', ok: true }]);
    expect(repo.clusters.get('c1').size).toBe(2);
    expect(repo.clusters.get('c1').version).toBe(1);
  });

  it('isolates a failing question and records a FAILED usage log', async () => {
    const store = makeFakeQuestionStore({
      questions: {
        q1: { clusterId: 'c1', projectId: 'p1', chunkId: 'ch1' },
        q2: { projectId: 'p2', chunkId: 'ch2' },
        q3: { projectId: 'p3', chunkId: 'ch3' },
      },
    });
    const repo = makeFakeClusterRepo({
      c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1, avgSimilarity: 0, version: 0 },
    });
    repo.setLockFailures(5); // retries exhausted
    const vs = makeFakeVectorStore();
    await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
    const pipeline = buildPipeline({ store, repo, vs });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const results = await pipeline.processQuestions([
      { id: 'q2', text: 'B', projectId: 'p2', chunkId: 'ch2' },
      { id: 'q3', text: 'C', projectId: 'p3', chunkId: 'ch3' },
    ]);

    expect(results).toEqual([{ id: 'q2', ok: false }, { id: 'q3', ok: true }]);
    expect(store.calls.usageLogs).toHaveLength(2);
    expect(store.calls.usageLogs[0]).toMatchObject({
      status: 'FAILED',
      errorType: 'UNKNOWN',
      projectId: 'p2',
      errorMessage: expect.stringContaining('optimistic lock'),
    });
    expect(store.calls.usageLogs[1]).toMatchObject({ status: 'SUCCESS', projectId: 'p3' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[embedding-pipeline] failed q=q2', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  describe('fingerprint guard', () => {
    const TXT_LUMP = '依躉繳方式投保金福利，保費折扣率為何';
    const TXT_2Y = '依 2 年期繳費方式投保金福利，保費折扣率為何';
    const allSameVec = () => makeFakeEmbedding(() => VEC.A);

    function guardSetup({ q2Text = TXT_2Y, q3Text = TXT_LUMP } = {}) {
      const store = makeFakeQuestionStore({
        questions: {
          q1: { clusterId: 'c1', projectId: 'p1', chunkId: 'ch1', conditionFingerprint: extractConditionFingerprint(TXT_LUMP) },
          q2: { projectId: 'p2', chunkId: 'ch2' },
          q3: { projectId: 'p3', chunkId: 'ch3' },
        },
      });
      const repo = makeFakeClusterRepo({
        c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1, avgSimilarity: 0, version: 0 },
      });
      const vs = makeFakeVectorStore();
      return { store, repo, vs, q2Text, q3Text };
    }

    it('creates a new cluster when the top match has a different condition fingerprint', async () => {
      const { store, repo, vs, q2Text } = guardSetup();
      await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
      const pipeline = buildPipeline({ store, repo, vs, embedding: allSameVec() });

      await pipeline.processQuestions([{ id: 'q2', text: q2Text, projectId: 'p2', chunkId: 'ch2' }]);

      expect(store.questions.get('q2').clusterRole).toBe('primary');
      expect(store.questions.get('q2').clusterId).not.toBe('c1');
      expect(repo.clusters.get('c1').size).toBe(1);
    });

    it('attaches when the top match shares the condition fingerprint', async () => {
      const { store, repo, vs, q2Text, q3Text } = guardSetup();
      await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
      // q2 先另建新 cluster（fingerprint 不同）→ 其 vector 已入 store，q3 必須跳過它選 q1
      const pipeline = buildPipeline({ store, repo, vs, embedding: allSameVec() });
      await pipeline.processQuestions([
        { id: 'q2', text: q2Text, projectId: 'p2', chunkId: 'ch2' },
        { id: 'q3', text: q3Text, projectId: 'p3', chunkId: 'ch3' },
      ]);

      expect(store.questions.get('q3').clusterId).toBe('c1');
      expect(store.questions.get('q3').clusterRole).toBe('member');
      expect(repo.clusters.get('c1').size).toBe(2);
    });

    it('attaches when the candidate has no fingerprint (guard skipped)', async () => {
      const { store, repo, vs } = guardSetup();
      await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
      const pipeline = buildPipeline({ store, repo, vs, embedding: allSameVec() });

      // q2 是無條件 token 的一般敘述題（fingerprint null）→ guard 不作用、直接附上
      await pipeline.processQuestions([{ id: 'q2', text: '一般敘述題沒有條件 token', projectId: 'p2', chunkId: 'ch2' }]);

      expect(store.questions.get('q2').clusterId).toBe('c1');
      expect(store.questions.get('q2').clusterRole).toBe('member');
    });
  });

  it('excludes same-chunk and same-project questions from neighbor search', async () => {
    const store = makeFakeQuestionStore({
      questions: {
        q1: { clusterId: 'c1', projectId: 'p1', chunkId: 'chA' },
        q2: { projectId: 'p1', chunkId: 'chB' }, // 同 project
        q3: { projectId: 'p2', chunkId: 'chA' }, // 同 chunk
      },
    });
    const repo = makeFakeClusterRepo({
      c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1, avgSimilarity: 0, version: 0 },
    });
    const vs = makeFakeVectorStore();
    await vs.upsert('question', [{ id: 'q1', vector: VEC.A }]);
    const pipeline = buildPipeline({ store, repo, vs, embedding: makeFakeEmbedding(() => VEC.A) });

    await pipeline.processQuestions([
      { id: 'q2', text: 'B', projectId: 'p1', chunkId: 'chB' },
      { id: 'q3', text: 'B', projectId: 'p2', chunkId: 'chA' },
    ]);

    // q1 被同 project（q2）與同 chunk（q3）排除；q3 與 q2 是跨 project 近重複 → 附上 q2 的新 cluster
    expect(repo.clusters.size).toBe(2);
    expect(store.questions.get('q2').clusterRole).toBe('primary');
    expect(store.questions.get('q3').clusterRole).toBe('member');
    expect(store.questions.get('q3').clusterId).toBe(store.questions.get('q2').clusterId);
    expect(repo.clusters.get('c1').size).toBe(1);
  });

  describe('processAnswerDivergence', () => {
    function divSetup(datasets, vecs) {
      const store = makeFakeQuestionStore({ datasets });
      const repo = makeFakeClusterRepo();
      const vs = makeFakeVectorStore();
      const pipeline = buildPipeline({ store, repo, vs, embedding: makeFakeEmbedding(t => vecs[t]) });
      return { store, vs, pipeline };
    }

    it('marks non-divergent when fewer than 2 confirmed datasets', async () => {
      const { store, pipeline } = divSetup([{ id: 'd1', clusterId: 'cx', confirmed: true, answer: 'a1', projectId: 'p1' }], { a1: [1, 0] });

      await pipeline.processAnswerDivergence('cx');

      expect(store.calls.divergence).toEqual([
        { clusterId: 'cx', hasAnswerDivergence: false, divergenceScore: 1.0 },
      ]);
    });

    it('flags a cluster divergent when confirmed answers disagree', async () => {
      const { store, vs, pipeline } = divSetup(
        [
          { id: 'd1', clusterId: 'cx', confirmed: true, answer: 'ansA', projectId: 'p1' },
          { id: 'd2', clusterId: 'cx', confirmed: true, answer: 'ansB', projectId: 'p2' },
          { id: 'd3', clusterId: 'cx', confirmed: false, answer: 'ignored', projectId: 'p1' },
        ],
        { ansA: [1, 0], ansB: [-1, 0] },
      );

      await pipeline.processAnswerDivergence('cx');

      expect(store.calls.divergence).toEqual([
        { clusterId: 'cx', hasAnswerDivergence: true, divergenceScore: -1, flag: 'divergent' },
      ]);
      expect([...vs.collections.get('answer').keys()]).toEqual(['d1', 'd2']);
    });

    it('flags a cluster consistent when confirmed answers agree', async () => {
      const { store, pipeline } = divSetup(
        [
          { id: 'd1', clusterId: 'cx', confirmed: true, answer: 'ansA', projectId: 'p1' },
          { id: 'd2', clusterId: 'cx', confirmed: true, answer: 'ansC', projectId: 'p2' },
        ],
        { ansA: [1, 0], ansC: [0.8, 0.6] },
      );

      await pipeline.processAnswerDivergence('cx');

      expect(store.calls.divergence).toHaveLength(1);
      expect(store.calls.divergence[0].clusterId).toBe('cx');
      expect(store.calls.divergence[0].hasAnswerDivergence).toBe(false);
      expect(store.calls.divergence[0].divergenceScore).toBeCloseTo(0.8);
      expect(store.calls.divergence[0].flag).toBe('consistent');
    });
  });
});
