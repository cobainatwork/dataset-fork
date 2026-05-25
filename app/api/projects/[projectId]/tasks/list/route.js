import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 獲取專案的所有任務列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // 可選引數: 任務型別和任務狀態
    const taskType = searchParams.get('taskType');
    const statusStr = searchParams.get('status');

    // 分頁引數
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 構建查詢條件
    const where = { projectId };

    if (taskType) {
      where.taskType = taskType;
    }

    if (statusStr && !isNaN(parseInt(statusStr))) {
      where.status = parseInt(statusStr);
    }

    // 獲取任務總數
    const total = await prisma.task.count({ where });

    // 獲取任務列表，按建立時間降序排序，並應用分頁
    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        createAt: 'desc'
      },
      skip: page * limit,
      take: limit
    });

    return NextResponse.json({
      code: 0,
      data: tasks,
      total,
      page,
      limit,
      message: '任務列表獲取成功'
    });
  } catch (error) {
    console.error('獲取任務列表失敗:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: '獲取任務列表失敗',
        message: error.message
      },
      { status: 500 }
    );
  }
}
