const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('dedup chunk filter (同 chunk 不聚)', () => {
  const ids = {
    projectId: 'p_chkflt', chunkA: 'c_chkflt_A', chunkB: 'c_chkflt_B',
    fileId: 'f_chkflt',
    q1: 'q_chkflt_1', q2: 'q_chkflt_2', q3: 'q_chkflt_3',
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

  it('同 chunk 內兩題高相似度 → 第二題走新 cluster', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v1 = new Array(1024).fill(0.1); v1[0] = 0.5;
    const v2 = new Array(1024).fill(0.1); v2[0] = 0.505;
    const embedding = {
      async embed(text) {
        if (text === 'qA') return v1;
        if (text === 'qB') return v2;
        return new Array(1024).fill(0);
      },
    };
    const vectorStore = createPgvectorStore(prisma);
    const clusterRepo = createPrismaClusterRepo(prisma);
    const config = { modelName: 'test', clusterThreshold: 0.88 };
    const pipeline = createPipeline({ embedding, vectorStore, clusterRepo, config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectId, chunkId: ids.chunkA, question: 'qA', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: 'qA', projectId: ids.projectId, chunkId: ids.chunkA });

    await prisma.questions.create({ data: { id: ids.q2, projectId: ids.projectId, chunkId: ids.chunkA, question: 'qB', label: '' } });
    const r2 = await pipeline.processNewQuestion({ id: ids.q2, text: 'qB', projectId: ids.projectId, chunkId: ids.chunkA });

    expect(r2.clusterId).not.toBe(r1.clusterId);
    expect(r2.created).toBe(true);
  });

  it('不同 chunk 內兩題高相似度 → 第二題仍聚到第一題', async () => {
    const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');
    const { createPrismaClusterRepo } = require('@/lib/services/embedding/adapters/prisma-cluster');
    const { createPipeline } = require('@/lib/services/embedding/pipeline');

    const v = new Array(1024).fill(0.1); v[0] = 0.5;
    const embedding = { async embed() { return v; } };
    const vectorStore = createPgvectorStore(prisma);
    const clusterRepo = createPrismaClusterRepo(prisma);
    const config = { modelName: 'test', clusterThreshold: 0.88 };
    const pipeline = createPipeline({ embedding, vectorStore, clusterRepo, config, db: prisma });

    await prisma.questions.create({ data: { id: ids.q1, projectId: ids.projectId, chunkId: ids.chunkA, question: 'q1', label: '' } });
    const r1 = await pipeline.processNewQuestion({ id: ids.q1, text: 'q1', projectId: ids.projectId, chunkId: ids.chunkA });

    await prisma.questions.create({ data: { id: ids.q3, projectId: ids.projectId, chunkId: ids.chunkB, question: 'q3', label: '' } });
    const r3 = await pipeline.processNewQuestion({ id: ids.q3, text: 'q3', projectId: ids.projectId, chunkId: ids.chunkB });

    expect(r3.clusterId).toBe(r1.clusterId);
    expect(r3.attached).toBe(true);
  });
});
