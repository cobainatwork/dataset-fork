import { db } from '@/lib/db/index';
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

  for (const q of questions) {
    const t0 = Date.now();
    try {
      await svc.pipeline.processNewQuestion({ id: q.id, text: q.question, projectId: q.projectId, chunkId: q.chunkId });
      await recordEmbeddingUsage(svc, q, t0, { status: 'SUCCESS' });
    } catch (e) {
      console.error(`[embedding-incremental] failed q=${q.id}`, e);
      await recordEmbeddingUsage(svc, q, t0, { status: 'FAILED', error: e });
    }
  }
}

async function recordEmbeddingUsage(svc, q, t0, outcome) {
  await db.embeddingUsageLogs.create({
    data: {
      provider: 'openai-compat',
      model: svc.config.modelName,
      operation: 'embed',
      tokens: 0,
      vectorCount: 1,
      latency: Date.now() - t0,
      status: outcome.status,
      ...(outcome.status === 'FAILED' && {
        errorMessage: String(outcome.error.message || outcome.error).slice(0, 500),
        errorType: classifyError(outcome.error)
      }),
      projectId: q.projectId,
      dateString: new Date().toISOString().slice(0, 10)
    }
  });
}

function classifyError(e) {
  const m = String(e.message || '');
  if (m.includes('timeout')) return 'TIMEOUT';
  if (m.includes('ECONNREFUSED') || m.includes('network')) return 'NETWORK';
  if (m.includes('dimension')) return 'DIMENSION';
  if (m.includes('NaN')) return 'INVALID_VECTOR';
  return 'UNKNOWN';
}
