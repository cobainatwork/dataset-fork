const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('dedup project filter (同專案不聚 cluster)', () => {
  const ids = {
    projectA: 'p_pflt_A', projectB: 'p_pflt_B',
    fileA: 'f_pflt_A', fileB: 'f_pflt_B',
    chunkA1: 'c_pflt_A1', chunkA2: 'c_pflt_A2', chunkB1: 'c_pflt_B1',
    q1: 'q_pflt_1', q2: 'q_pflt_2', q3: 'q_pflt_3',
  };

  beforeEach(async () => {
    await prisma.projects.upsert({ where: { id: ids.projectA }, create: { id: ids.projectA, name: 'A', description: '' }, update: {} });
    await prisma.projects.upsert({ where: { id: ids.projectB }, create: { id: ids.projectB, name: 'B', description: '' }, update: {} });
    await prisma.uploadFiles.create({ data: { id: ids.fileA, projectId: ids.projectA, fileName: 'a.md', fileExt: '.md', path: '/tmp', size: 1, md5: 'x', lineageId: ids.fileA } });
    await prisma.uploadFiles.create({ data: { id: ids.fileB, projectId: ids.projectB, fileName: 'b.md', fileExt: '.md', path: '/tmp', size: 1, md5: 'y', lineageId: ids.fileB } });
    await prisma.chunks.create({ data: { id: ids.chunkA1, name: 'cA1', projectId: ids.projectA, fileId: ids.fileA, fileName: 'a.md', content: 'a1', summary: '', size: 1 } });
    await prisma.chunks.create({ data: { id: ids.chunkA2, name: 'cA2', projectId: ids.projectA, fileId: ids.fileA, fileName: 'a.md', content: 'a2', summary: '', size: 1 } });
    await prisma.chunks.create({ data: { id: ids.chunkB1, name: 'cB1', projectId: ids.projectB, fileId: ids.fileB, fileName: 'b.md', content: 'b1', summary: '', size: 1 } });
  });

  afterEach(async () => {
    await prisma.embeddings.deleteMany({ where: { sourceId: { in: [ids.q1, ids.q2, ids.q3] } } });
    await prisma.questions.deleteMany({ where: { projectId: { in: [ids.projectA, ids.projectB] } } });
    await prisma.clusterProject.deleteMany({ where: { projectId: { in: [ids.projectA, ids.projectB] } } });
    await prisma.questionCluster.deleteMany({ where: { primaryQuestionId: { in: [ids.q1, ids.q2, ids.q3] } } });
    await prisma.chunks.deleteMany({ where: { projectId: { in: [ids.projectA, ids.projectB] } } });
    await prisma.uploadFiles.deleteMany({ where: { projectId: { in: [ids.projectA, ids.projectB] } } });
    await prisma.projects.deleteMany({ where: { id: { in: [ids.projectA, ids.projectB] } } });
  });
  afterAll(() => prisma.$disconnect());

  it('同 project 跨 chunk 兩題高相似度 → 第二題走新 cluster (project filter 生效)', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v = new Array(1024).fill(0.1); v[0] = 0.5;
    const embedding = { async embed() { return v; } };
    const vectorStore = createPgvectorStore(prisma);
    const clusterRepo = createPrismaClusterRepo(prisma);
    const config = { modelName: 'test', clusterThreshold: 0.88, fingerprintGuardEnabled: true };
    const pipeline = createPipeline({ embedding, vectorStore, clusterRepo, config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectA, chunkId: ids.chunkA1, question: 'q1', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: 'q1', projectId: ids.projectA, chunkId: ids.chunkA1 });

    await prisma.questions.create({ data: { id: ids.q2, projectId: ids.projectA, chunkId: ids.chunkA2, question: 'q2', label: '' } });
    const r2 = await pipeline.processNewQuestion({ id: ids.q2, text: 'q2', projectId: ids.projectA, chunkId: ids.chunkA2 });

    expect(r2.clusterId).not.toBe(r1.clusterId);
    expect(r2.created).toBe(true);
  });

  it('跨 project 兩題高相似度 → 第二題仍聚到第一題 (project filter 不影響跨專案真重複)', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v = new Array(1024).fill(0.1); v[0] = 0.5;
    const embedding = { async embed() { return v; } };
    const vectorStore = createPgvectorStore(prisma);
    const clusterRepo = createPrismaClusterRepo(prisma);
    const config = { modelName: 'test', clusterThreshold: 0.88, fingerprintGuardEnabled: true };
    const pipeline = createPipeline({ embedding, vectorStore, clusterRepo, config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectA, chunkId: ids.chunkA1, question: 'shared topic', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: 'shared topic', projectId: ids.projectA, chunkId: ids.chunkA1 });

    await prisma.questions.create({ data: { id: ids.q3, projectId: ids.projectB, chunkId: ids.chunkB1, question: 'shared topic', label: '' } });
    const r3 = await pipeline.processNewQuestion({ id: ids.q3, text: 'shared topic', projectId: ids.projectB, chunkId: ids.chunkB1 });

    expect(r3.clusterId).toBe(r1.clusterId);
    expect(r3.attached).toBe(true);
  });
});
