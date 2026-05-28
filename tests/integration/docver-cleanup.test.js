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
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Embeddings"("id","sourceType","sourceId","vector","modelName","dimension","createAt") VALUES ($1,$2,$3,$4::vector,$5,$6,NOW())`,
    `answer_${datasetId}`, 'answer', datasetId, `[${new Array(1024).fill(0.2).join(',')}]`, 'm', 1024,
  );
}

describe('delUploadFileInfoById cleanup (docver)', () => {
  const ids = { projectId: 'p_docver', fileId: 'f_docver', questionId: 'q_docver', datasetId: 'd_docver', clusterId: 'cl_docver' };

  afterEach(async () => {
    await prisma.embeddings.deleteMany({ where: { sourceId: { in: [ids.questionId, ids.datasetId] } } });
    await prisma.datasets.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.questions.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.chunks.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.clusterProject.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.questionCluster.deleteMany({ where: { id: ids.clusterId } });
    await prisma.documentReplacement.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.uploadFiles.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.projects.deleteMany({ where: { id: ids.projectId } });
  });
  afterAll(() => prisma.$disconnect());

  it('removes Embeddings rows for deleted questions', async () => {
    await seedFileWithDerived(ids);
    const { delUploadFileInfoById } = require('@/lib/db/upload-files');
    await delUploadFileInfoById(ids.fileId);
    const remaining = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "Embeddings" WHERE "sourceId" IN ($1,$2)`, ids.questionId, ids.datasetId
    );
    expect(remaining[0].n).toBe(0);
  });

  it('cluster-maintenance removes a cluster whose only member was deleted', async () => {
    await seedFileWithDerived(ids);
    const { delUploadFileInfoById } = require('@/lib/db/upload-files');
    await delUploadFileInfoById(ids.fileId);
    // 直接跑 maintenance handler（繞過非同步派發的時序）
    const { processClusterMaintenanceTask } = require('@/lib/services/tasks/cluster-maintenance');
    await processClusterMaintenanceTask({});
    const c = await prisma.questionCluster.findUnique({ where: { id: ids.clusterId } });
    expect(c).toBeNull();
  });

  it('replaceUploadFile keeps lineageId and records replacement', async () => {
    await seedFileWithDerived(ids);
    const { replaceUploadFile } = require('@/lib/db/upload-files');
    const res = await replaceUploadFile(ids.fileId, { fileName: 'f2.md', size: 2, md5: 'y', fileExt: '.md', path: '/tmp' });
    const newFile = await prisma.uploadFiles.findUnique({ where: { id: res.newFileId } });
    expect(newFile.lineageId).toBe(ids.fileId);          // 沿用舊檔 lineageId（= 舊檔 id）
    const old = await prisma.uploadFiles.findUnique({ where: { id: ids.fileId } });
    expect(old).toBeNull();                               // 舊檔已清除
    const rec = await prisma.documentReplacement.findFirst({ where: { lineageId: ids.fileId } });
    expect(rec?.newFileId).toBe(res.newFileId);
    // 收尾
    await prisma.documentReplacement.deleteMany({ where: { lineageId: ids.fileId } });
    await prisma.uploadFiles.deleteMany({ where: { id: res.newFileId } });
  });

  it('replaceUploadFile preserves the new physical file when it collides with the old name', async () => {
    // 同名替換：使用者拿同名 PDF 蓋舊版。replace API 已把新檔寫到 path/fileName，
    // 此時 replaceUploadFile 清理舊 row 時不可把同路徑同名的實體檔當「舊檔」刪掉。
    const os = require('os');
    const fsp = require('fs').promises;
    const path = require('path');
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'docver-fs-'));
    const sharedName = 'same.md';
    const sharedFilePath = path.join(tmpDir, sharedName);

    try {
      // Seed 舊 row（path 指向真實 tmp 目錄）
      await prisma.projects.upsert({ where: { id: ids.projectId }, create: { id: ids.projectId, name: 'T', description: '' }, update: {} });
      await prisma.uploadFiles.create({
        data: { id: ids.fileId, projectId: ids.projectId, fileName: sharedName, fileExt: '.md', path: tmpDir, size: 5, md5: 'old', lineageId: ids.fileId },
      });
      // 模擬 replace API 已寫入的新檔（同 path 同名）
      const newContent = 'BRAND NEW CONTENT';
      await fsp.writeFile(sharedFilePath, newContent);

      // Act：呼叫 replaceUploadFile
      const { replaceUploadFile } = require('@/lib/db/upload-files');
      const res = await replaceUploadFile(ids.fileId, {
        fileName: sharedName, size: newContent.length, md5: 'new', fileExt: '.md', path: tmpDir,
      });

      // Assert：實體檔仍存在且內容是新版
      const stat = await fsp.stat(sharedFilePath);
      expect(stat.size).toBe(newContent.length);
      const read = await fsp.readFile(sharedFilePath, 'utf8');
      expect(read).toBe(newContent);

      // 收尾 DB
      await prisma.documentReplacement.deleteMany({ where: { lineageId: ids.fileId } });
      await prisma.uploadFiles.deleteMany({ where: { id: res.newFileId } });
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
