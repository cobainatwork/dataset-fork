const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('dedup fingerprint guard (跨 chunk 條件變體不聚)', () => {
  const ids = {
    projectId: 'p_fpg', fileId: 'f_fpg',
    chunkA: 'c_fpg_A', chunkB: 'c_fpg_B',
    q1: 'q_fpg_1', q2: 'q_fpg_2', q3: 'q_fpg_3',
  };

  beforeEach(async () => {
    await prisma.projects.upsert({ where: { id: ids.projectId }, create: { id: ids.projectId, name: 'T', description: '' }, update: {} });
    await prisma.uploadFiles.create({ data: { id: ids.fileId, projectId: ids.projectId, fileName: 'f.md', fileExt: '.md', path: '/tmp', size: 1, md5: 'x', lineageId: ids.fileId } });
    await prisma.chunks.create({ data: { id: ids.chunkA, name: 'cA', projectId: ids.projectId, fileId: ids.fileId, fileName: 'f.md', content: 'a', summary: '', size: 1 } });
    await prisma.chunks.create({ data: { id: ids.chunkB, name: 'cB', projectId: ids.projectId, fileId: ids.fileId, fileName: 'f.md', content: 'b', summary: '', size: 1 } });
  });

  afterEach(async () => {
    await prisma.embeddings.deleteMany({ where: { sourceId: { in: [ids.q1, ids.q2, ids.q3] } } });
    await prisma.questions.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.clusterProject.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.questionCluster.deleteMany({ where: { primaryQuestionId: { in: [ids.q1, ids.q2, ids.q3] } } });
    await prisma.chunks.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.uploadFiles.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.projects.deleteMany({ where: { id: ids.projectId } });
  });
  afterAll(() => prisma.$disconnect());

  it('跨 chunk 兩題 cosine 高 + fingerprint 不同 → 第二題走新 cluster', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v = new Array(1024).fill(0.1); v[0] = 0.5;
    const embedding = { async embed() { return v; } };
    const config = { modelName: 'test', clusterThreshold: 0.88, fingerprintGuardEnabled: true };
    const pipeline = createPipeline({ embedding, vectorStore: createPgvectorStore(prisma), clusterRepo: createPrismaClusterRepo(prisma), config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectId, chunkId: ids.chunkA, question: '依躉繳方式投保金福利，保費折扣率為何', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: '依躉繳方式投保金福利，保費折扣率為何', projectId: ids.projectId, chunkId: ids.chunkA });

    await prisma.questions.create({ data: { id: ids.q2, projectId: ids.projectId, chunkId: ids.chunkB, question: '依 2 年期繳費方式投保金福利，保費折扣率為何', label: '' } });
    const r2 = await pipeline.processNewQuestion({ id: ids.q2, text: '依 2 年期繳費方式投保金福利，保費折扣率為何', projectId: ids.projectId, chunkId: ids.chunkB });

    expect(r2.clusterId).not.toBe(r1.clusterId);
    expect(r2.created).toBe(true);
  });

  it('跨 chunk 月繳 vs 年繳 cosine 高 + fingerprint 不同 → 第二題走新 cluster', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v = new Array(1024).fill(0.1); v[0] = 0.5;
    const embedding = { async embed() { return v; } };
    const config = { modelName: 'test', clusterThreshold: 0.88, fingerprintGuardEnabled: true };
    const pipeline = createPipeline({ embedding, vectorStore: createPgvectorStore(prisma), clusterRepo: createPrismaClusterRepo(prisma), config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectId, chunkId: ids.chunkA, question: '依月繳方式投保 X 險，保費為何', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: '依月繳方式投保 X 險，保費為何', projectId: ids.projectId, chunkId: ids.chunkA });

    await prisma.questions.create({ data: { id: ids.q3, projectId: ids.projectId, chunkId: ids.chunkB, question: '依年繳方式投保 X 險，保費為何', label: '' } });
    const r3 = await pipeline.processNewQuestion({ id: ids.q3, text: '依年繳方式投保 X 險，保費為何', projectId: ids.projectId, chunkId: ids.chunkB });

    expect(r3.clusterId).not.toBe(r1.clusterId);
    expect(r3.created).toBe(true);
  });

  it('跨 chunk 兩題 cosine 高 + fingerprint 都 null → 沿用既有聚類', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v = new Array(1024).fill(0.1); v[0] = 0.5;
    const embedding = { async embed() { return v; } };
    const config = { modelName: 'test', clusterThreshold: 0.88, fingerprintGuardEnabled: true };
    const pipeline = createPipeline({ embedding, vectorStore: createPgvectorStore(prisma), clusterRepo: createPrismaClusterRepo(prisma), config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectId, chunkId: ids.chunkA, question: '一般敘述題沒有條件 token', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: '一般敘述題沒有條件 token', projectId: ids.projectId, chunkId: ids.chunkA });

    await prisma.questions.create({ data: { id: ids.q3, projectId: ids.projectId, chunkId: ids.chunkB, question: '另一個一般敘述題沒有條件 token', label: '' } });
    const r3 = await pipeline.processNewQuestion({ id: ids.q3, text: '另一個一般敘述題沒有條件 token', projectId: ids.projectId, chunkId: ids.chunkB });

    expect(r3.clusterId).toBe(r1.clusterId);
    expect(r3.attached).toBe(true);
  });
});
