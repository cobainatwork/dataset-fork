import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // empty body is acceptable for guard checks; rejected below if no projectId
  }
  const { projectId } = body || {};
  if (!projectId) {
    return NextResponse.json({ error: 'PROJECT_ID_REQUIRED' }, { status: 400 });
  }

  const existing = await db.task.findFirst({
    where: { taskType: 'embedding-backfill', projectId, status: { in: [0] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'BACKFILL_ALREADY_RUNNING', taskId: existing.id },
      { status: 409 }
    );
  }

  const task = await db.task.create({
    data: {
      taskType: 'embedding-backfill',
      projectId,
      detail: '{}',
      modelInfo: '{}',
      status: 0,
    },
  });
  return NextResponse.json({ ok: true, taskId: task.id });
}
