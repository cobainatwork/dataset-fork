import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getImageById, getImageChunk } from '@/lib/db/images';
import { createImageDataset } from '@/lib/db/imageDatasets';

const prisma = new PrismaClient();

// 建立標註
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { imageId, questionId, question, answerType, answer, note } = await request.json();

    // 驗證必填欄位
    if (!imageId || !question || !answerType || answer === undefined || answer === null) {
      return NextResponse.json({ error: '缺少必要引數：imageId, question, answerType, answer' }, { status: 400 });
    }

    // 驗證圖片存在
    const image = await getImageById(imageId);
    if (!image || image.projectId !== projectId) {
      return NextResponse.json({ error: '圖片不存在' }, { status: 404 });
    }

    // 驗證答案型別
    if (!['text', 'label', 'custom_format'].includes(answerType)) {
      return NextResponse.json({ error: '無效的答案型別' }, { status: 400 });
    }

    // 驗證答案內容
    if (answerType === 'text' && typeof answer !== 'string') {
      return NextResponse.json({ error: '文字型別答案必須是字串' }, { status: 400 });
    }
    if (answerType === 'label' && !Array.isArray(answer)) {
      return NextResponse.json({ error: '標籤型別答案必須是陣列' }, { status: 400 });
    }

    // 序列化答案
    let answerString = answer;
    if (answerType !== 'text' && typeof answerString !== 'string') {
      answerString = JSON.stringify(answer, null, 2);
    }

    // 1. 獲取問題記錄（前端傳遞的 questionId 指向已有的問題）
    if (!questionId) {
      return NextResponse.json({ error: '缺少必要引數：questionId' }, { status: 400 });
    }

    const questionRecord = await prisma.questions.findUnique({
      where: { id: questionId }
    });

    if (!questionRecord) {
      return NextResponse.json({ error: '問題不存在' }, { status: 404 });
    }

    // 驗證問題屬於該圖片
    if (questionRecord.imageId !== imageId) {
      return NextResponse.json({ error: '問題不屬於該圖片' }, { status: 400 });
    }

    // 2. 更新問題為已回答
    await prisma.questions.update({
      where: { id: questionRecord.id },
      data: { answered: true }
    });

    // 3. 建立 ImageDataset 記錄
    const dataset = await createImageDataset(projectId, {
      imageId: image.id,
      imageName: image.imageName,
      questionId: questionRecord.id,
      question,
      answer: answerString,
      answerType,
      model: 'manual',
      note: note || ''
    });

    return NextResponse.json({
      success: true,
      dataset,
      questionId: questionRecord.id
    });
  } catch (error) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create annotation' }, { status: 500 });
  }
}
