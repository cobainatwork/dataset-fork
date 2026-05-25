import { NextResponse } from 'next/server';
import { getTags, createTag, updateTag, deleteTag } from '@/lib/db/tags';
import { getQuestionsByTagName } from '@/lib/db/questions';

// 獲取專案的標籤樹
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // 獲取標籤樹
    const tags = await getTags(projectId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to obtain the label tree:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to obtain the label tree' }, { status: 500 });
  }
}

// 更新專案的標籤樹
export async function PUT(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // 獲取請求體
    const { tags } = await request.json();
    if (tags.id === undefined || tags.id === null || tags.id === '') {
      console.log('createTag', tags);
      let res = await createTag(projectId, tags.label, tags.parentId);
      return NextResponse.json({ tags: res });
    } else {
      let res = await updateTag(tags.label, tags.id);
      return NextResponse.json({ tags: res });
    }
  } catch (error) {
    console.error('Failed to update tags:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to update tags' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    const { tagName } = await request.json();
    console.log('tagName', tagName);
    let data = await getQuestionsByTagName(projectId, tagName);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to obtain the label tree:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to obtain the label tree' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // 獲取要刪除的標籤ID
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '標籤 ID 是必需的' }, { status: 400 });
    }

    console.log(`正在刪除標籤: ${id}`);
    const result = await deleteTag(id);
    console.log(`刪除標籤成功: ${id}`);

    return NextResponse.json({ success: true, message: '刪除標籤成功', data: result });
  } catch (error) {
    console.error('刪除標籤失敗:', String(error));
    return NextResponse.json(
      {
        error: error.message || '刪除標籤失敗',
        success: false
      },
      { status: 500 }
    );
  }
}
