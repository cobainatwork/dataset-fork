import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') || undefined;
  const onlyDivergent = url.searchParams.get('onlyDivergent') === 'true';
  const minSize = parseInt(url.searchParams.get('minSize') || '2', 10);

  const where = {
    size: { gte: minSize },
    ...(onlyDivergent ? { hasAnswerDivergence: true } : {}),
    ...(projectId ? { ClusterProject: { some: { projectId } } } : {}),
  };

  const clusters = await db.questionCluster.findMany({
    where,
    take: 100,
    orderBy: { size: 'desc' },
    include: {
      ClusterProject: { select: { projectId: true } },
    },
  });

  return NextResponse.json({ clusters });
}
