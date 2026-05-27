const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedFileWithDerived({ projectId, fileId, questionId, datasetId, clusterId }) {
  await prisma.projects.upsert({ where: { id: projectId }, create: { id: projectId, name: 'T', description: '' }, update: {} });
  await prisma.uploadFiles.create({ data: { id: fileId, projectId, fileName: 'f.md', fileExt: '.md', path: '/tmp', size: 1, md5: 'x', lineageId: fileId } });
  await prisma.chunks.create({ data: { id: `${fileId}-c1`, name: 'f-part-1', projectId, fileId, fileName: 'f.md', content: 'hello', summary: '', size: 5 } });
  await prisma.questionCluster.create({ data: { id: clusterId, primaryQuestionId: questionId, size: 1, projectCount: 1, embeddingModel: 'm', thresholdAtCreate: 0.88, version: 0 } });
  await prisma.clusterProject.create({ data: { clusterId, projectId } });
  await prisma.questions.create({ data: { id: questionId, projectId, chunkId: `${fileId}-c1`, question: 'q?', label: '', clusterId, clusterRole: 'primary' } });
  await prisma.datasets.create({ data: { id: datasetId, projectId, questionId, question: 'q?', answer: 'a', chunkName: 'f-part-1', chunkContent: 'hello', model: 'm', questionLabel: '', cot: '' } });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Embeddings"("id","sourceType","sourceId","vector","modelName","dimension","createAt") VALUES ($1,$2,$3,$4::vector,$5,$6,NOW())`,
    `question_${questionId}`, 'question', questionId, `[${new Array(1024).fill(0.1).join(',')}]`, 'm', 1024,
  );
}

describe('delUploadFileInfoById cleanup (docver)', () => {
  const ids = { projectId: 'p_docver', fileId: 'f_docver', questionId: 'q_docver', datasetId: 'd_docver', clusterId: 'cl_docver' };

  afterEach(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "Embeddings" WHERE "sourceId" IN ('${ids.questionId}','${ids.datasetId}')`);
    await prisma.datasets.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.questions.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.chunks.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.clusterProject.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.questionCluster.deleteMany({ where: { id: ids.clusterId } });
    await prisma.uploadFiles.deleteMany({ where: { projectId: ids.projectId } });
  });
  afterAll(() => prisma.$disconnect());

  it('removes Embeddings rows for deleted questions', async () => {
    await seedFileWithDerived(ids);
    const { delUploadFileInfoById } = require('@/lib/db/upload-files');
    await delUploadFileInfoById(ids.fileId);
    const remaining = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "Embeddings" WHERE "sourceId" = $1`, ids.questionId
    );
    expect(remaining[0].n).toBe(0);
  });
});
