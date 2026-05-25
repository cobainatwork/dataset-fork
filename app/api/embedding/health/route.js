import { NextResponse } from 'next/server';
import { getEmbeddingService } from '@/lib/services/embedding';

export async function GET() {
  const svc = await getEmbeddingService();
  const [embeddingOk, vectorOk] = await Promise.all([
    svc.embedding.healthCheck().catch(() => false),
    svc.vectorStore.healthCheck().catch(() => false),
  ]);

  const status = embeddingOk && vectorOk ? 'healthy' : 'unhealthy';
  return NextResponse.json({
    status,
    components: {
      embedding: embeddingOk ? 'ok' : 'down',
      vectorStore: vectorOk ? 'ok' : 'down',
    },
  });
}
