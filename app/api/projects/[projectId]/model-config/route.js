import { NextResponse } from 'next/server';
import { createInitModelConfig, getModelConfigByProjectId, saveModelConfig } from '@/lib/db/model-config';
import { DEFAULT_MODEL_SETTINGS, MODEL_PROVIDERS } from '@/constant/model';
import { getProject } from '@/lib/db/projects';
import { sortProvidersByPriority } from '@/lib/util/providerLogo';

function normalizeModelEndpoint(endpoint = '') {
  let normalizedEndpoint = String(endpoint).trim();
  if (!normalizedEndpoint) {
    return '';
  }
  if (normalizedEndpoint.includes('/chat/completions')) {
    normalizedEndpoint = normalizedEndpoint.replace('/chat/completions', '');
  }
  return normalizedEndpoint;
}

// 獲取模型配置列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    // 驗證專案 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    let modelConfigList = await getModelConfigByProjectId(projectId);
    if (!modelConfigList || modelConfigList.length === 0) {
      let insertModelConfigList = [];
      const sortedProviders = sortProvidersByPriority(MODEL_PROVIDERS, item => item.id);
      sortedProviders.forEach(item => {
        let data = {
          projectId: projectId,
          providerId: item.id,
          providerName: item.name,
          endpoint: item.defaultEndpoint,
          apiKey: '',
          modelId: '',
          modelName: '',
          type: 'text',
          temperature: DEFAULT_MODEL_SETTINGS.temperature,
          maxTokens: DEFAULT_MODEL_SETTINGS.maxTokens,
          topK: 0,
          topP: DEFAULT_MODEL_SETTINGS.topP,
          status: 1
        };
        insertModelConfigList.push(data);
      });
      modelConfigList = await createInitModelConfig(insertModelConfigList);
    }
    modelConfigList = sortProvidersByPriority(modelConfigList, item => item.providerId);
    let project = await getProject(projectId);
    return NextResponse.json({ data: modelConfigList, defaultModelConfigId: project.defaultModelConfigId });
  } catch (error) {
    console.error('Error obtaining model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to obtain model configuration' }, { status: 500 });
  }
}

// 儲存模型配置
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    // 獲取請求體
    const modelConfig = await request.json();

    // 驗證請求體
    if (!modelConfig) {
      return NextResponse.json({ error: 'The model configuration cannot be empty ' }, { status: 400 });
    }
    modelConfig.projectId = projectId;
    modelConfig.endpoint = normalizeModelEndpoint(modelConfig.endpoint);
    // 如果沒有 modelId，使用 modelName 補齊（相容舊邏輯）
    if (!modelConfig.modelId && modelConfig.modelName) {
      modelConfig.modelId = modelConfig.modelName;
    }
    // 如果沒有 modelName，使用 modelId 補齊
    if (!modelConfig.modelName && modelConfig.modelId) {
      modelConfig.modelName = modelConfig.modelId;
    }
    if (!modelConfig.topK) {
      modelConfig.topK = 0;
    }
    if (!modelConfig.status) {
      modelConfig.status = 1;
    }
    const parsedMaxTokens = Number(modelConfig.maxTokens ?? DEFAULT_MODEL_SETTINGS.maxTokens);
    if (!Number.isInteger(parsedMaxTokens) || parsedMaxTokens < 1) {
      return NextResponse.json({ error: 'maxTokens must be a positive integer' }, { status: 400 });
    }
    modelConfig.maxTokens = parsedMaxTokens;
    const res = await saveModelConfig(modelConfig);

    return NextResponse.json(res);
  } catch (error) {
    console.error('Error updating model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to update model configuration' }, { status: 500 });
  }
}
