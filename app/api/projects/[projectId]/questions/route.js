import { NextResponse } from 'next/server';
import {
  getAllQuestionsByProjectId,
  getQuestions,
  getQuestionsIds,
  saveQuestions,
  updateQuestion
} from '@/lib/db/questions';
import { getImageById, getImageChunk } from '@/lib/db/images';

// 獲取專案的所有問題
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    let status = searchParams.get('status');
    let answered = undefined;
    if (status === 'answered') answered = true;
    if (status === 'unanswered') answered = false;
    const chunkName = searchParams.get('chunkName');
    const sourceType = searchParams.get('sourceType') || 'all'; // 'all', 'text', 'image'
    const searchMatchMode = searchParams.get('searchMatchMode') || 'match'; // 'match', 'notMatch'
    let selectedAll = searchParams.get('selectedAll');
    if (selectedAll) {
      let data = await getQuestionsIds(
        projectId,
        answered,
        searchParams.get('input'),
        chunkName,
        sourceType,
        searchMatchMode
      );
      return NextResponse.json(data);
    }
    let all = searchParams.get('all');
    if (all) {
      let data = await getAllQuestionsByProjectId(projectId);
      return NextResponse.json(data);
    }
    // 獲取問題列表
    const questions = await getQuestions(
      projectId,
      parseInt(searchParams.get('page')),
      parseInt(searchParams.get('size')),
      answered,
      searchParams.get('input'),
      chunkName,
      sourceType,
      searchMatchMode
    );

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Failed to get questions:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get questions' }, { status: 500 });
  }
}

// 新增問題
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { question, chunkId, label } = body;

    // 驗證必要引數
    if (!projectId || !question) {
      return NextResponse.json({ error: 'Missing necessary parameters' }, { status: 400 });
    }

    if (!body.chunkId && body.imageId) {
      const chunk = await getImageChunk(projectId);
      body.chunkId = chunk.id;
      body.label = 'image';
    }

    // 新增新問題
    let questions = [body];
    // 儲存更新後的資料
    let data = await saveQuestions(projectId, questions);

    // 返回成功響應
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create question:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to create question' }, { status: 500 });
  }
}

// 更新問題
export async function PUT(request) {
  try {
    const body = await request.json();
    // 儲存更新後的資料
    const { imageId } = body;
    if (imageId) {
      body.imageName = (await getImageById(imageId))?.imageName;
    }
    let data = await updateQuestion(body);
    // 返回更新後的問題資料
    return NextResponse.json(data);
  } catch (error) {
    console.error('更新問題失敗:', String(error));
    return NextResponse.json({ error: error.message || '更新問題失敗' }, { status: 500 });
  }
}
