const { PrismaClient } = require('@prisma/client');
const { createPipeline } = require('@/lib/services/embedding/pipeline');
const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
const { createPrismaClusterRepository } = require('@/lib/services/embedding/adapters/prisma-cluster');

const prisma = new PrismaClient();

function fakeEmbeddingProvider() {
  const seed = (text) => new Array(1024).fill(0).map((_, i) => Math.sin(text.length * (i + 1)));
  return {
    embed: async (t) => seed(t),
    embedBatch: async (ts) => ts.map(seed),
    dimension: () => 1024,
    healthCheck: async () => true,
  };
}

beforeAll(async () => {
  await prisma.projects.upsert({ where: { id: 'p_test' }, create: { id: 'p_test', name: 'X', description: '' }, update: {} });
  // Chunks row required for Questions FK
  await prisma.chunks.upsert({
    where: { id: 'ch_test' },
    create: { id: 'ch_test', name: 'X', projectId: 'p_test', fileId: 'f1', fileName: 'f1', content: '', summary: '', size: 0 },
    update: {},
  });
});

afterEach(async () => {
  await prisma.$executeRawUnsafe(`DELETE FROM "Embeddings"`);
  await prisma.clusterProject.deleteMany();
  await prisma.questionCluster.deleteMany();
  await prisma.questions.deleteMany();
});

afterAll(() => prisma.$disconnect());

function buildPipeline() {
  return createPipeline({
    embedding: fakeEmbeddingProvider(),
    vectorStore: createPgvectorStore(prisma),
    clusterRepo: createPrismaClusterRepository(prisma),
    db: prisma,
    config: { clusterThreshold: 0.88, modelName: 'fake' },
  });
}

describe('pipeline F1', () => {
  it('creates new cluster for isolated question', async () => {
    await prisma.questions.create({
      data: { id: 'q1', question: 'What is the capital of France?', label: 'geo', projectId: 'p_test', chunkId: 'ch_test' },
    });

    const pipeline = buildPipeline();
    await pipeline.processNewQuestion({ id: 'q1', text: 'What is the capital of France?', projectId: 'p_test' });

    const q = await prisma.questions.findUnique({ where: { id: 'q1' } });
    expect(q.clusterId).toBeTruthy();
    expect(q.clusterRole).toBe('primary');
    const c = await prisma.questionCluster.findUnique({ where: { id: q.clusterId } });
    expect(c.size).toBe(1);
  });

  it('attaches second similar question to first question cluster', async () => {
    // Same-length texts produce identical fake vectors (cosine sim = 1.0)
    const text = 'What is the capital of France?';
    await prisma.questions.create({
      data: { id: 'q1', question: text, label: 'geo', projectId: 'p_test', chunkId: 'ch_test' },
    });
    await prisma.questions.create({
      data: { id: 'q2', question: text, label: 'geo', projectId: 'p_test', chunkId: 'ch_test' },
    });

    const pipeline = buildPipeline();
    await pipeline.processNewQuestion({ id: 'q1', text, projectId: 'p_test' });
    await pipeline.processNewQuestion({ id: 'q2', text, projectId: 'p_test' });

    const q2 = await prisma.questions.findUnique({ where: { id: 'q2' } });
    expect(q2.clusterRole).toBe('member');
    expect(q2.similarityScore).toBeGreaterThanOrEqual(0.88);

    const cluster = await prisma.questionCluster.findUnique({ where: { id: q2.clusterId } });
    expect(cluster.size).toBe(2);
  });
});
