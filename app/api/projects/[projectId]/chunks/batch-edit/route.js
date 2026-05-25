import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 批次編輯文字塊內容
 * POST /api/projects/[projectId]/chunks/batch-edit
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { position, content, chunkIds } = body;

    // 驗證引數
    if (!position || !content || !chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters: position, content, chunkIds' }, { status: 400 });
    }

    if (!['start', 'end'].includes(position)) {
      return NextResponse.json({ error: 'Position must be "start" or "end"' }, { status: 400 });
    }

    // 驗證專案許可權（獲取要編輯的文字塊）
    const chunksToUpdate = await prisma.chunks.findMany({
      where: {
        id: { in: chunkIds },
        projectId: projectId
      },
      select: {
        id: true,
        content: true,
        name: true
      }
    });

    if (chunksToUpdate.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (chunksToUpdate.length !== chunkIds.length) {
      return NextResponse.json({ error: 'Some chunks not found' }, { status: 400 });
    }

    // 準備更新資料
    const updates = chunksToUpdate.map(chunk => {
      let newContent;

      if (position === 'start') {
        // 在開頭新增內容
        newContent = content + '\n\n' + chunk.content;
      } else {
        // 在結尾新增內容
        newContent = chunk.content + '\n\n' + content;
      }

      return {
        where: { id: chunk.id },
        data: {
          content: newContent,
          size: newContent.length,
          updateAt: new Date()
        }
      };
    });

    async function processBatches(items, batchSize, processFn) {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);
      }
      return results;
    }

    const BATCH_SIZE = 50; // 每批處理 50 個
    await processBatches(updates, BATCH_SIZE, update => prisma.chunks.update(update));

    // 記錄操作日誌（可選）
    console.log(`Successfully updated ${chunksToUpdate.length} chunks`);

    return NextResponse.json({
      success: true,
      updatedCount: chunksToUpdate.length,
      message: `Successfully updated ${chunksToUpdate.length} chunks`
    });
  } catch (error) {
    console.error('批次編輯文字塊失敗:', error);

    return NextResponse.json(
      {
        error: 'Batch edit chunks failed',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
