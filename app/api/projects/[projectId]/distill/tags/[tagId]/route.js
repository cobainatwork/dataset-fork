import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * 更新標籤介面
 */
export async function PUT(request, { params }) {
  try {
    const { projectId, tagId } = params;

    // 驗證引數
    if (!projectId || !tagId) {
      return NextResponse.json({ error: '專案ID和標籤ID不能為空' }, { status: 400 });
    }

    const { label } = await request.json();

    if (!label || !label.trim()) {
      return NextResponse.json({ error: '標籤名稱不能為空' }, { status: 400 });
    }

    // 檢查標籤是否存在
    const existingTag = await db.tags.findUnique({
      where: { id: tagId }
    });

    if (!existingTag) {
      return NextResponse.json({ error: '標籤不存在' }, { status: 404 });
    }

    // 檢查專案ID是否匹配
    if (existingTag.projectId !== projectId) {
      return NextResponse.json({ error: '無許可權編輯此標籤' }, { status: 403 });
    }

    // 檢查新標籤名稱是否已存在（同級標籤）
    const duplicateTag = await db.tags.findFirst({
      where: {
        projectId,
        label: label.trim(),
        parentId: existingTag.parentId,
        id: { not: tagId }
      }
    });

    if (duplicateTag) {
      return NextResponse.json({ error: '同級標籤名稱已存在' }, { status: 400 });
    }

    // 更新標籤
    const updatedTag = await db.tags.update({
      where: { id: tagId },
      data: { label: label.trim() }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('[標籤編輯] 更新標籤失敗:', String(error));
    return NextResponse.json({ error: error.message || '更新標籤失敗' }, { status: 500 });
  }
}
