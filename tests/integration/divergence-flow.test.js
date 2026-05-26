const { PrismaClient } = require('@prisma/client');
const { createPipeline } = require('@/lib/services/embedding/pipeline');
const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
const { createPrismaClusterRepository } = require('@/lib/services/embedding/adapters/prisma-cluster');

const prisma = new PrismaClient();

function makeProvider(textToVec) {
  return {
    embed: async (t) => textToVec(t),
    embedBatch: async (ts) => ts.map(textToVec),
    dimension: () => 1024,
    healthCheck: async () => true,
  };
}

function buildPipeline(textToVec) {
  return createPipeline({
    embedding: makeProvider(textToVec),
    vectorStore: createPgvectorStore(prisma),
    clusterRepo: createPrismaClusterRepository(prisma),
    db: prisma,
    config: { clusterThreshold: 0.88, divergenceThreshold: 0.70, modelName: 'fake' },
  });
}

beforeAll(async () => {
  await prisma.projects.upsert({
    where: { id: 'p_f1' },
    create: { id: 'p_f1', name: 'F1', description: '' },
    update: {},
  });
  await prisma.chunks.upsert({
    where: { id: 'ch_f1' },
    create: { id: 'ch_f1', name: 'X', projectId: 'p_f1', fileId: 'f1', fileName: 'f1', content: '', summary: '', size: 0 },
    update: {},
  });
});

afterEach(async () => {
  await prisma.$executeRawUnsafe(`DELETE FROM "Embeddings"`);
  await prisma.datasets.deleteMany();
  await prisma.clusterProject.deleteMany();
  await prisma.questionCluster.deleteMany();
  await prisma.questions.deleteMany();
});

afterAll(() => prisma.$disconnect());

describe('F4 answer divergence', () => {
  it('marks cluster divergent when answers disagree', async () => {
    // Vec for question — same length text gets same vector; that's fine, cluster created
    // Vec for answer — first char determines vector direction (drastically different vectors)
    const textToVec = (text) => {
      const base = new Array(1024).fill(0);
      const seed = text.charCodeAt(0) || 0;
      return base.map((_, i) => Math.cos((seed + i) * 0.1));
    };

    const pipeline = buildPipeline(textToVec);

    // Create 2 questions in a cluster (use processNewQuestion to wire cluster)
    await prisma.questions.create({
      data: { id: 'q1', question: 'What is X?', label: 'topic', projectId: 'p_f1', chunkId: 'ch_f1' },
    });
    await prisma.questions.create({
      data: { id: 'q2', question: 'What is X?', label: 'topic', projectId: 'p_f1', chunkId: 'ch_f1' },
    });
    await pipeline.processNewQuestion({ id: 'q1', text: 'What is X?', projectId: 'p_f1' });
    await pipeline.processNewQuestion({ id: 'q2', text: 'What is X?', projectId: 'p_f1' });

    const q2 = await prisma.questions.findUnique({ where: { id: 'q2' } });
    const clusterId = q2.clusterId;
    expect(clusterId).toBeTruthy();

    // Create 2 confirmed datasets with disagreeing answers
    await prisma.datasets.create({
      data: {
        id: 'd1', projectId: 'p_f1', questionId: 'q1', question: 'What is X?',
        answer: 'A: apples are red', answerType: 'text', chunkName: 'X', chunkContent: '',
        model: 'fake', questionLabel: 'topic', cot: '', confirmed: true, clusterId,
      },
    });
    await prisma.datasets.create({
      data: {
        id: 'd2', projectId: 'p_f1', questionId: 'q2', question: 'What is X?',
        answer: 'Z: zebra stripes', answerType: 'text', chunkName: 'X', chunkContent: '',
        model: 'fake', questionLabel: 'topic', cot: '', confirmed: true, clusterId,
      },
    });

    await pipeline.processAnswerDivergence(clusterId);

    const cluster = await prisma.questionCluster.findUnique({ where: { id: clusterId } });
    expect(cluster.hasAnswerDivergence).toBe(true);
    expect(cluster.divergenceScore).toBeLessThan(0.70);

    const dsAfter = await prisma.datasets.findMany({ where: { clusterId } });
    for (const d of dsAfter) {
      expect(d.divergenceFlag).toBe('divergent');
    }
  }, 30000);

  it('marks consistent when answers agree', async () => {
    const textToVec = (text) => {
      const base = new Array(1024).fill(0);
      const seed = text.length;
      return base.map((_, i) => Math.cos((seed + i) * 0.1));
    };
    const pipeline = buildPipeline(textToVec);

    await prisma.questions.create({
      data: { id: 'q3', question: 'Q', label: 't', projectId: 'p_f1', chunkId: 'ch_f1' },
    });
    await prisma.questions.create({
      data: { id: 'q4', question: 'Q', label: 't', projectId: 'p_f1', chunkId: 'ch_f1' },
    });
    await pipeline.processNewQuestion({ id: 'q3', text: 'Q', projectId: 'p_f1' });
    await pipeline.processNewQuestion({ id: 'q4', text: 'Q', projectId: 'p_f1' });

    const q4 = await prisma.questions.findUnique({ where: { id: 'q4' } });
    const clusterId = q4.clusterId;

    await prisma.datasets.create({
      data: {
        id: 'd3', projectId: 'p_f1', questionId: 'q3', question: 'Q',
        answer: 'same answer', answerType: 'text', chunkName: 'X', chunkContent: '',
        model: 'fake', questionLabel: 't', cot: '', confirmed: true, clusterId,
      },
    });
    await prisma.datasets.create({
      data: {
        id: 'd4', projectId: 'p_f1', questionId: 'q4', question: 'Q',
        answer: 'same answer', answerType: 'text', chunkName: 'X', chunkContent: '',
        model: 'fake', questionLabel: 't', cot: '', confirmed: true, clusterId,
      },
    });

    await pipeline.processAnswerDivergence(clusterId);

    const cluster = await prisma.questionCluster.findUnique({ where: { id: clusterId } });
    expect(cluster.hasAnswerDivergence).toBe(false);
  }, 30000);
});
