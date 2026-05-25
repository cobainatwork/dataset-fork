import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 獲取任務詳情
export async function GET(request, { params }) {
  try {
    const { projectId, taskId } = params;

    // 驗證必填引數
    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          code: 400,
          error: '缺少必要引數'
        },
        { status: 400 }
      );
    }

    // 查詢任務詳情
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        projectId
      }
    });

    if (!task) {
      return NextResponse.json(
        {
          code: 404,
          error: '任務不存在'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      data: task,
      message: '獲取任務詳情成功'
    });
  } catch (error) {
    console.error('獲取任務詳情失敗:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: '獲取任務詳情失敗',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// 更新任務狀態
export async function PATCH(request, { params }) {
  try {
    const { projectId, taskId } = params;
    const data = await request.json();

    // 驗證必填引數
    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          code: 400,
          error: '缺少必要引數'
        },
        { status: 400 }
      );
    }

    // 獲取要更新的欄位
    const { status, completedCount, totalCount, detail, note, endTime } = data;

    // 構建更新資料
    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (completedCount !== undefined) {
      updateData.completedCount = completedCount;
    }

    if (totalCount !== undefined) {
      updateData.totalCount = totalCount;
    }

    if (detail !== undefined) {
      updateData.detail = detail;
    }

    if (note !== undefined) {
      updateData.note = note;
    }

    // 如果狀態變為已完成、失敗或已中斷，自動新增結束時間
    if (status === 1 || status === 2 || status === 3) {
      updateData.endTime = endTime || new Date();
    }

    // 更新任務
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId
      },
      data: updateData
    });

    return NextResponse.json({
      code: 0,
      data: updatedTask,
      message: '更新任務狀態成功'
    });
  } catch (error) {
    console.error('更新任務狀態失敗:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: '更新任務狀態失敗',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// 刪除任務
export async function DELETE(request, { params }) {
  try {
    const { projectId, taskId } = params;

    // 驗證必填引數
    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          code: 400,
          error: '缺少必要引數'
        },
        { status: 400 }
      );
    }

    // 刪除任務
    await prisma.task.delete({
      where: {
        id: taskId,
        projectId
      }
    });

    return NextResponse.json({
      code: 0,
      message: '刪除任務成功'
    });
  } catch (error) {
    console.error('刪除任務失敗:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: '刪除任務失敗',
        message: error.message
      },
      { status: 500 }
    );
  }
}
