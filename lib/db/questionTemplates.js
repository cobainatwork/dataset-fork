/**
 * 問題模板資料訪問層（通用）
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 獲取問題模板列表
 * @param {String} projectId 專案ID
 * @param {Object} options 查詢選項
 * @returns {Promise<Array>}
 */
export async function getTemplates(projectId, options = {}) {
  const { sourceType, search } = options;

  const where = {
    projectId
  };

  if (sourceType) {
    where.sourceType = sourceType;
  }

  if (search) {
    where.question = {
      contains: search
    };
  }

  const templates = await prisma.questionTemplates.findMany({
    where,
    orderBy: [{ order: 'asc' }, { createAt: 'desc' }]
  });

  // 解析 JSON 欄位
  return templates.map(template => ({
    ...template,
    labels: template.labels ? JSON.parse(template.labels) : [],
    customFormat: template.customFormat ? JSON.parse(template.customFormat) : null
  }));
}

/**
 * 獲取單個模板
 * @param {String} templateId 模板ID
 * @returns {Promise<Object>}
 */
export async function getTemplateById(templateId) {
  const template = await prisma.questionTemplates.findUnique({
    where: { id: templateId }
  });

  if (!template) {
    return null;
  }

  return {
    ...template,
    labels: template.labels ? JSON.parse(template.labels) : [],
    customFormat: template.customFormat ? JSON.parse(template.customFormat) : null
  };
}

/**
 * 建立問題模板
 * @param {String} projectId 專案ID
 * @param {Object} data 模板資料
 * @returns {Promise<Object>}
 */
export async function createTemplate(projectId, data) {
  const { question, sourceType, answerType, description, labels, customFormat, order } = data;

  const template = await prisma.questionTemplates.create({
    data: {
      projectId,
      question,
      sourceType,
      answerType,
      description: description || '',
      labels: labels ? JSON.stringify(labels) : '',
      customFormat: customFormat ? JSON.stringify(customFormat) : '',
      order: order || 0
    }
  });

  return {
    ...template,
    labels: template.labels ? JSON.parse(template.labels) : [],
    customFormat: template.customFormat ? JSON.parse(template.customFormat) : null
  };
}

/**
 * 更新問題模板
 * @param {String} templateId 模板ID
 * @param {Object} data 更新資料
 * @returns {Promise<Object>}
 */
export async function updateTemplate(templateId, data) {
  const updateData = { ...data };

  // 序列化 JSON 欄位
  if (data.labels !== undefined) {
    updateData.labels = JSON.stringify(data.labels);
  }
  if (data.customFormat !== undefined) {
    updateData.customFormat = JSON.stringify(data.customFormat);
  }

  const template = await prisma.questionTemplates.update({
    where: { id: templateId },
    data: updateData
  });

  return {
    ...template,
    labels: template.labels ? JSON.parse(template.labels) : [],
    customFormat: template.customFormat ? JSON.parse(template.customFormat) : null
  };
}

/**
 * 刪除問題模板
 * @param {String} templateId 模板ID
 * @returns {Promise<void>}
 */
export async function deleteTemplate(templateId) {
  await prisma.questionTemplates.delete({
    where: { id: templateId }
  });
}

/**
 * 獲取模板使用統計
 * @param {String} templateId 模板ID
 * @returns {Promise<Number>}
 */
export async function getTemplateUsageCount(templateId) {
  // 統計關聯此模板的問題數量
  const count = await prisma.questions.count({
    where: { templateId }
  });

  return count;
}

/**
 * 批次獲取模板使用統計
 * @param {Array<String>} templateIds 模板ID列表
 * @returns {Promise<Object>} { templateId: count }
 */
export async function getTemplatesUsageCount(templateIds) {
  const questions = await prisma.questions.groupBy({
    by: ['templateId'],
    _count: {
      templateId: true
    },
    where: {
      templateId: {
        in: templateIds
      }
    }
  });

  const result = {};
  questions.forEach(q => {
    result[q.templateId] = q._count.templateId;
  });

  return result;
}

export default {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsageCount,
  getTemplatesUsageCount
};
