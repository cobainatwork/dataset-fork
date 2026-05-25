import { NextResponse } from 'next/server';
import templateDb from '@/lib/db/questionTemplates';
import { generateQuestionsFromTemplate, checkTemplateGenerationAvailability } from '@/lib/services/questions/template';

// 獲取問題模板列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType');
    const search = searchParams.get('search');

    const templates = await templateDb.getTemplates(projectId, { sourceType, search });

    // 獲取使用統計
    const templateIds = templates.map(t => t.id);
    const usageCounts = await templateDb.getTemplatesUsageCount(templateIds);

    // 新增使用統計到模板資料
    const templatesWithUsage = templates.map(template => ({
      ...template,
      usageCount: usageCounts[template.id] || 0
    }));

    return NextResponse.json({
      success: true,
      templates: templatesWithUsage
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to get templates' }, { status: 500 });
  }
}

// 建立問題模板
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const data = await request.json();

    const { question, sourceType, answerType, description, labels, customFormat, order, autoGenerate } = data;

    // 驗證必填欄位
    if (!question || !sourceType || !answerType) {
      return NextResponse.json({ error: '缺少必要引數：question, sourceType, answerType' }, { status: 400 });
    }

    // 驗證資料來源型別
    if (!['image', 'text'].includes(sourceType)) {
      return NextResponse.json({ error: '無效的資料來源型別' }, { status: 400 });
    }

    // 驗證答案型別
    if (!['text', 'label', 'custom_format'].includes(answerType)) {
      return NextResponse.json({ error: '無效的答案型別' }, { status: 400 });
    }

    // 如果是標籤型別，驗證 labels
    if (answerType === 'label' && (!labels || !Array.isArray(labels) || labels.length === 0)) {
      return NextResponse.json({ error: '標籤型別問題必須提供標籤列表' }, { status: 400 });
    }

    // 如果是自定義格式，驗證 customFormat
    if (answerType === 'custom_format' && !customFormat) {
      return NextResponse.json({ error: '自定義格式問題必須提供格式定義' }, { status: 400 });
    }

    const template = await templateDb.createTemplate(projectId, {
      question,
      sourceType,
      answerType,
      description,
      labels: answerType === 'label' ? labels : [],
      customFormat: answerType === 'custom_format' ? customFormat : null,
      order: order || 0
    });

    let generationResult = null;

    // 如果啟用自動生成，則為所有相關資料來源建立問題
    if (autoGenerate) {
      try {
        // 先檢查是否有可用的資料來源
        const availability = await checkTemplateGenerationAvailability(projectId, sourceType);

        if (availability.available) {
          generationResult = await generateQuestionsFromTemplate(projectId, template);
        } else {
          generationResult = {
            success: false,
            successCount: 0,
            failCount: 0,
            message: availability.message
          };
        }
      } catch (error) {
        console.error('自動生成問題失敗:', error);
        generationResult = {
          success: false,
          successCount: 0,
          failCount: 0,
          message: '自動生成問題時發生錯誤'
        };
      }
    }

    return NextResponse.json({
      success: true,
      template,
      generation: generationResult
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
