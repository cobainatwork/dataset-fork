import { NextResponse } from 'next/server';
import templateDb from '@/lib/db/questionTemplates';
import { generateQuestionsFromTemplateEdit } from '@/lib/services/questions/template';

// 獲取單個模板
export async function GET(request, { params }) {
  try {
    const { templateId } = params;

    const template = await templateDb.getTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 獲取使用統計
    const usageCount = await templateDb.getTemplateUsageCount(templateId);

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        usageCount
      }
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return NextResponse.json({ error: error.message || 'Failed to get template' }, { status: 500 });
  }
}

// 更新問題模板
export async function PUT(request, { params }) {
  try {
    const { projectId, templateId } = params;
    const data = await request.json();

    const { question, sourceType, answerType, description, labels, customFormat, order, autoGenerate } = data;

    // 驗證資料來源型別
    if (sourceType && !['image', 'text'].includes(sourceType)) {
      return NextResponse.json({ error: '無效的資料來源型別' }, { status: 400 });
    }

    // 驗證答案型別
    if (answerType && !['text', 'label', 'custom_format'].includes(answerType)) {
      return NextResponse.json({ error: '無效的答案型別' }, { status: 400 });
    }

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (sourceType !== undefined) updateData.sourceType = sourceType;
    if (answerType !== undefined) updateData.answerType = answerType;
    if (description !== undefined) updateData.description = description;
    if (labels !== undefined) updateData.labels = labels;
    if (customFormat !== undefined) updateData.customFormat = customFormat;
    if (order !== undefined) updateData.order = order;

    const template = await templateDb.updateTemplate(templateId, updateData);

    let generationResult = null;

    // 如果啟用自動生成，則為還未建立此模板問題的資料來源建立問題
    if (autoGenerate) {
      try {
        generationResult = await generateQuestionsFromTemplateEdit(projectId, template);
      } catch (error) {
        console.error('編輯模式自動生成問題失敗:', error);
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
    console.error('Failed to update template:', error);
    return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 });
  }
}

// 刪除問題模板
export async function DELETE(request, { params }) {
  try {
    const { templateId } = params;

    // 檢查是否有關聯的問題
    const usageCount = await templateDb.getTemplateUsageCount(templateId);
    if (usageCount > 0) {
      return NextResponse.json({ error: `此模板已被 ${usageCount} 個問題使用，無法刪除` }, { status: 400 });
    }

    await templateDb.deleteTemplate(templateId);

    return NextResponse.json({
      success: true,
      message: '模板刪除成功'
    });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
