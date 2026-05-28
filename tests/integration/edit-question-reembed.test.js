const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = { projectId: 'p_edit_reembed', fileId: 'f_edit', chunkId: 'f_edit-c1', questionId: 'q_edit', clusterId: 'cl_edit' };

async function seedQuestionWithEmbedding(text, vectorFillValue = 0.1) {
  await prisma.projects.upsert({ where: { id: ids.projectId }, create: { id: ids.projectId, name: 'T', description: '' }, update: {} });
  await prisma.uploadFiles.upsert({
    where: { id: ids.fileId },
    create: { id: ids.fileId, projectId: ids.projectId, fileName: 'e.md', fileExt: '.md', path: '/tmp', size: 1, md5: 'x', lineageId: ids.fileId },
    update: {},
  });
  await prisma.chunks.upsert({
    where: { id: ids.chunkId },
    create: { id: ids.chunkId, name: 'e-part-1', projectId: ids.projectId, fileId: ids.fileId, fileName: 'e.md', content: 'c', summary: '', size: 1 },
    update: {},
  });
  await prisma.questions.upsert({
    where: { id: ids.questionId },
    create: { id: ids.questionId, projectId: ids.projectId, chunkId: ids.chunkId, question: text, label: '' },
    update: { question: text },
  });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Embeddings"("id","sourceType","sourceId","vector","modelName","dimension","createAt")
     VALUES ($1,$2,$3,$4::vector,$5,$6,NOW())
     ON CONFLICT ("sourceType","sourceId") DO UPDATE SET "vector"=EXCLUDED."vector"`,
    `question_${ids.questionId}`, 'question', ids.questionId, `[${new Array(1024).fill(vectorFillValue).join(',')}]`, 'm', 1024,
  );
}

async function readVectorFirstElement() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT (vector::text) AS v FROM "Embeddings" WHERE "sourceType"='question' AND "sourceId"=$1`,
    ids.questionId,
  );
  if (!rows.length) return null;
  // pgvector renders as "[v1,v2,...]"; parse the first element
  const txt = rows[0].v;
  const first = txt.replace(/^\[/, '').split(',')[0];
  return parseFloat(first);
}

describe('updateQuestion re-embeds on text change', () => {
  afterEach(async () => {
    await prisma.embeddings.deleteMany({ where: { sourceType: 'question', sourceId: ids.questionId } });
    await prisma.questions.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.chunks.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.uploadFiles.deleteMany({ where: { projectId: ids.projectId } });
    await prisma.projects.deleteMany({ where: { id: ids.projectId } });
  });
  afterAll(() => prisma.$disconnect());

  it('enqueues embedding-incremental task when question text changes', async () => {
    await seedQuestionWithEmbedding('原始問題：什麼是 A？', 0.1);
    const beforeTaskCount = await prisma.task.count({ where: { taskType: 'embedding-incremental' } });

    const { updateQuestion } = require('@/lib/db/questions');
    await updateQuestion({ id: ids.questionId, question: '編輯後問題：請說明 A 的內容。' });

    const afterTaskCount = await prisma.task.count({ where: { taskType: 'embedding-incremental' } });
    expect(afterTaskCount).toBe(beforeTaskCount + 1);

    // cleanup created task
    await prisma.task.deleteMany({ where: { taskType: 'embedding-incremental', detail: { contains: ids.questionId } } });
  });

  it('does NOT enqueue when only non-text fields change', async () => {
    await seedQuestionWithEmbedding('保持不變', 0.2);
    const beforeTaskCount = await prisma.task.count({ where: { taskType: 'embedding-incremental' } });

    const { updateQuestion } = require('@/lib/db/questions');
    await updateQuestion({ id: ids.questionId, label: 'edited-label', answered: true });

    const afterTaskCount = await prisma.task.count({ where: { taskType: 'embedding-incremental' } });
    expect(afterTaskCount).toBe(beforeTaskCount);
  });
});
