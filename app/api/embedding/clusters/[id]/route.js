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
    select: {
      id: true,
      question: true,
      projectId: true,
      clusterRole: true,
      similarityScore: true,
      createAt: true,
      chunk: { select: { fileName: true, name: true } },
      project: { select: { name: true } },
    },
  });

  // 撈 confirmed 答案（一個 question 可能有多筆 dataset，取最新一筆 confirmed）
  const memberIds = members.map(m => m.id);
  const datasets = memberIds.length
    ? await db.datasets.findMany({
        where: { questionId: { in: memberIds } },
        select: {
          questionId: true,
          answer: true,
          confirmed: true,
          divergenceFlag: true,
          createAt: true,
        },
        orderBy: { createAt: 'desc' },
      })
    : [];
  // 每 questionId 優先取 confirmed=true、否則最新一筆
  const answerByQid = {};
  for (const ds of datasets) {
    const existing = answerByQid[ds.questionId];
    if (!existing || (!existing.confirmed && ds.confirmed)) {
      answerByQid[ds.questionId] = ds;
    }
  }

  const enriched = members.map(m => ({
    ...m,
    answer: answerByQid[m.id]
      ? {
          text: answerByQid[m.id].answer,
          confirmed: answerByQid[m.id].confirmed,
          divergenceFlag: answerByQid[m.id].divergenceFlag,
        }
      : null,
  }));

  // 跨專案列出名稱，前端 chip 展開用
  const projectIds = cluster.ClusterProject.map(cp => cp.projectId);
  const projects = projectIds.length
    ? await db.projects.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      })
    : [];
  const projectNames = projects.map(p => ({ id: p.id, name: p.name }));

  return NextResponse.json({ cluster, members: enriched, projectNames });
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
