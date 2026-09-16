import { db } from '@/lib/db/client';
import { getEmbeddingService } from '@/lib/services/embedding/index.js';

export async function processEmbeddingIncrementalTask(task) {
  let detail = task.detail;
  if (typeof detail === 'string') {
    try {
      detail = JSON.parse(detail);
    } catch {
      detail = {};
    }
  }
  const questionIds = detail?.questionIds || [];
  if (!questionIds.length) return;

  const svc = await getEmbeddingService();
  if (!svc.config.enabled) {
    console.log(`[embedding-incremental] skipped (disabled) task=${task.id}`);
    return;
  }

  const force = detail?.force === true;
  const questions = await db.questions.findMany({
    where: force
      ? { id: { in: questionIds } }
      : { id: { in: questionIds }, embeddedAt: null },
    select: { id: true, question: true, projectId: true, chunkId: true },
  });

  // per-question 隔離、usage logging 都在 pipeline 內
  const results = await svc.pipeline.processQuestions(
    questions.map(q => ({ id: q.id, text: q.question, projectId: q.projectId, chunkId: q.chunkId }))
  );
  const failed = results.filter(r => !r.ok).length;
  if (failed) {
    console.log(`[embedding-incremental] ${failed}/${results.length} failed task=${task.id}`);
  }
}
