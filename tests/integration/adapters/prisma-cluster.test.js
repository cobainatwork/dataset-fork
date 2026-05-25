const { PrismaClient } = require('@prisma/client');
const { createPrismaClusterRepository } = require('@/lib/services/embedding/adapters/prisma-cluster');

const prisma = new PrismaClient();
const repo = createPrismaClusterRepository(prisma);

beforeAll(async () => {
  await prisma.projects.upsert({
    where: { id: 'p_test' },
    create: { id: 'p_test', name: 'Test', description: '' },
    update: {},
  });
});

afterEach(async () => {
  await prisma.clusterProject.deleteMany();
  await prisma.questionCluster.deleteMany();
});

afterAll(() => prisma.$disconnect());

describe('prisma cluster repo', () => {
  it('creates and reads a cluster', async () => {
    await repo.create({
      id: 'c1', primaryQuestionId: 'q1', size: 1, projectCount: 1,
      embeddingModel: 'bge-m3', thresholdAtCreate: 0.88, avgSimilarity: 0,
      hasAnswerDivergence: false, version: 0,
    });
    const c = await repo.findById('c1');
    expect(c).not.toBeNull();
    expect(c.primaryQuestionId).toBe('q1');
  });

  it('update increments version (optimistic lock)', async () => {
    await repo.create({
      id: 'c2', primaryQuestionId: 'q2', size: 1, projectCount: 1,
      embeddingModel: 'bge-m3', thresholdAtCreate: 0.88, avgSimilarity: 0,
      hasAnswerDivergence: false, version: 0,
    });
    await repo.update('c2', { size: 2, version: 0 });
    const c = await repo.findById('c2');
    expect(c.size).toBe(2);
    expect(c.version).toBe(1);
  });

  it('update throws on version mismatch', async () => {
    await repo.create({
      id: 'c3', primaryQuestionId: 'q3', size: 1, projectCount: 1,
      embeddingModel: 'bge-m3', thresholdAtCreate: 0.88, avgSimilarity: 0,
      hasAnswerDivergence: false, version: 5,
    });
    await expect(repo.update('c3', { size: 9, version: 0 })).rejects.toThrow();
  });
});
