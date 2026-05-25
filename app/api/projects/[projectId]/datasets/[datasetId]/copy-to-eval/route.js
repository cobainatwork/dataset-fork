import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req, { params }) {
  try {
    const { projectId, datasetId } = params;

    // 1. 獲取資料集詳情
    const dataset = await db.datasets.findUnique({
      where: { id: datasetId, projectId }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 2. 嘗試透過 questionId 查詢關聯的 chunkId
    let chunkId = null;
    if (dataset.questionId) {
      const question = await db.questions.findUnique({
        where: { id: dataset.questionId }
      });
      if (question) {
        chunkId = question.chunkId;
      }
    }

    // 3. 建立評估資料集記錄
    // 預設使用 open_ended 型別，因為通常資料集是問答對，適合作為評估
    let evalTags = [];
    try {
      evalTags = JSON.parse(dataset.tags || '[]');
      if (!Array.isArray(evalTags)) evalTags = [];
    } catch (e) {
      evalTags = [];
    }

    // 排除 'Eval' 標籤，並將陣列轉為逗號分隔的字串
    const evalTagsString = evalTags.filter(tag => tag !== 'Eval').join(',');

    const evalDataset = await db.evalDatasets.create({
      data: {
        projectId,
        question: dataset.question,
        questionType: 'open_ended',
        correctAnswer: dataset.answer,
        tags: evalTagsString,
        note: dataset.note,
        chunkId: chunkId,
        options: '' // 開放題不需要選項
      }
    });

    // 4. 更新原資料集，新增 'Eval' 標籤
    let currentTags = [];
    try {
      currentTags = JSON.parse(dataset.tags || '[]');
    } catch (e) {
      // ignore error
    }

    if (!currentTags.includes('Eval')) {
      currentTags.push('Eval');
      await db.datasets.update({
        where: { id: datasetId },
        data: {
          tags: JSON.stringify(currentTags)
        }
      });
    }

    return NextResponse.json({ success: true, evalDataset });
  } catch (error) {
    console.error('Failed to copy dataset to eval:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
