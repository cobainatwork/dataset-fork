import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/services/embedding/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getConfig();
  // Do not expose apiKey to client
  const { apiKey, ...safe } = config;
  return NextResponse.json({ ...safe, hasApiKey: !!apiKey });
}

export async function PUT(request) {
  const body = await request.json();
  const allowed = [
    'endpoint',
    'apiKey',
    'modelName',
    'dimension',
    'hnswM',
    'hnswEfConstruction',
    'hnswEfSearch',
    'enabled',
    'clusterThreshold',
    'divergenceThreshold',
    'scanAnswerDivergence',
    'workerConcurrency',
    'embedBatchSize'
  ];
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  // Dimension changes require manual migration; reject for safety
  if ('dimension' in patch) {
    const current = await getConfig();
    if (patch.dimension !== current.dimension) {
      return NextResponse.json(
        {
          error: 'DIMENSION_CHANGE_REQUIRES_MIGRATION',
          message: 'Dimension changes require manual ALTER TABLE migration. See spec §5.1.2.'
        },
        { status: 400 }
      );
    }
  }

  await saveConfig(patch);
  return NextResponse.json({ ok: true });
}
