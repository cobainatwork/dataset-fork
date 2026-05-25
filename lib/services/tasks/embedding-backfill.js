const { db } = require('@/lib/db/index');
const { getEmbeddingService } = require('@/lib/services/embedding/index.js');

const BATCH_SIZE = 100;

async function processEmbeddingBackfillTask(task) {
  const svc = await getEmbeddingService();
  if (!svc.config.enabled) {
    console.log(`[embedding-backfill] skipped (disabled) task=${task.id}`);
    return;
  }

  const projectId = task.projectId;
  let processed = 0;
  let cursor = null;

  while (true) {
    const batch = await db.questions.findMany({
      where: { projectId, embeddedAt: null },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, question: true, projectId: true },
    });
    if (!batch.length) break;

    for (const q of batch) {
      try {
        await svc.pipeline.processNewQuestion({ id: q.id, text: q.question, projectId: q.projectId });
        processed++;
      } catch (e) {
        console.error(`[embedding-backfill] failed q=${q.id}`, e);
      }
    }
    cursor = batch[batch.length - 1].id;
  }

  console.log(`[embedding-backfill] complete task=${task.id} processed=${processed}`);
}

module.exports = { processEmbeddingBackfillTask };
