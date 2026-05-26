import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const cluster = await db.questionCluster.findUnique({
    where: { id: params.id },
    include: {
      ClusterProject: true,
      Feedback: { orderBy: { createAt: 'desc' }, take: 50 },
    },
  });
  if (!cluster) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const members = await db.questions.findMany({
    where: { clusterId: params.id },
    select: { id: true, question: true, projectId: true, clusterRole: true, similarityScore: true },
  });

  return NextResponse.json({ cluster, members });
}

export async function POST(request, { params }) {
  const { verdict, note, similarityAtTime } = await request.json();
  if (!['correct', 'incorrect', 'partial'].includes(verdict)) {
    return NextResponse.json({ error: 'INVALID_VERDICT' }, { status: 400 });
  }
  const fb = await db.clusterFeedback.create({
    data: { clusterId: params.id, verdict, note: note || '', similarityAtTime: similarityAtTime || 0 },
  });
  return NextResponse.json({ ok: true, feedbackId: fb.id });
}
