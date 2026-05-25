import { NextResponse } from 'next/server';
import { getProject } from '@/lib/db/projects';
import { getDatasets } from '@/lib/db/datasets';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { uploadFiles, createRepo, checkRepoAccess } from '@huggingface/hub';

// 上傳資料集到 HuggingFace
export async function POST(request, { params }) {
  try {
    const projectId = params.projectId;
    const {
      token,
      datasetName,
      isPrivate,
      formatType,
      systemPrompt,
      confirmedOnly,
      includeCOT,
      fileFormat,
      customFields,
      reasoningLanguage
    } = await request.json();

    // 獲取專案資訊
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: '專案不存在' }, { status: 404 });
    }

    // 獲取資料集問題
    const questions = await getDatasets(projectId, confirmedOnly);
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: '沒有可用的資料集問題' }, { status: 400 });
    }

    // 格式化資料集
    const formattedData = formatDataset(questions, formatType, systemPrompt, includeCOT, customFields);

    // 建立臨時目錄
    const tempDir = path.join(os.tmpdir(), `hf-upload-${projectId}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // 建立資料集檔案
    const datasetFilePath = path.join(tempDir, `dataset.${fileFormat}`);
    if (fileFormat === 'json') {
      fs.writeFileSync(datasetFilePath, JSON.stringify(formattedData, null, 2));
    } else if (fileFormat === 'jsonl') {
      const jsonlContent = formattedData.map(item => JSON.stringify(item)).join('\n');
      fs.writeFileSync(datasetFilePath, jsonlContent);
    } else if (fileFormat === 'csv') {
      const csvContent = convertToCSV(formattedData);
      fs.writeFileSync(datasetFilePath, csvContent);
    }

    // 建立 README.md 檔案
    const readmePath = path.join(tempDir, 'README.md');
    const readmeContent = generateReadme(project.name, project.description, formatType);
    fs.writeFileSync(readmePath, readmeContent);

    // 使用 Hugging Face REST API 上傳資料集
    const visibility = isPrivate ? 'private' : 'public';

    try {
      // 準備倉庫配置
      const repo = { type: 'dataset', name: datasetName };

      // 檢查倉庫是否存在
      let repoExists = true;
      try {
        await checkRepoAccess({ repo, accessToken: token });
        console.log(`Repository ${datasetName} exists, continuing to upload files`);
      } catch (error) {
        // If error code is 404, the repository does not exist
        if (error.statusCode === 404) {
          repoExists = false;
          console.log(`Repository ${datasetName} does not exist, preparing to create`);
        } else {
          // Other errors (e.g., permission errors)
          throw new Error(`Failed to check repository access: ${error.message}`);
        }
      }

      // If the repository does not exist, create a new one
      if (!repoExists) {
        try {
          await createRepo({
            repo,
            accessToken: token,
            private: isPrivate,
            license: 'mit',
            description: project.description || 'Dataset created with Easy Dataset'
          });
          console.log(`Successfully created dataset repository: ${datasetName}`);
        } catch (error) {
          throw new Error(`Failed to create dataset repository: ${error.message}`);
        }
      }

      // 2. 上傳資料集檔案
      await uploadFile(token, datasetName, datasetFilePath, `dataset.${fileFormat}`);

      // 3. 上傳 README.md
      await uploadFile(token, datasetName, readmePath, 'README.md');
    } catch (error) {
      console.error('Upload to HuggingFace Failed:', String(error));
      return NextResponse.json({ error: `Upload Error: ${error.message}` }, { status: 500 });
    }

    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 返回成功資訊
    const datasetUrl = `https://huggingface.co/datasets/${datasetName}`;
    return NextResponse.json({
      success: true,
      message: 'Upload successfully HuggingFace',
      url: datasetUrl
    });
  } catch (error) {
    console.error('Upload Faile:', String(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 格式化資料集
function formatDataset(questions, formatType, systemPrompt, includeCOT, customFields) {
  if (formatType === 'alpaca') {
    return questions.map(q => {
      const item = {
        instruction: q.question,
        input: '',
        output: includeCOT && q.cot ? `${q.cot}\n\n${q.answer}` : q.answer
      };

      if (systemPrompt) {
        item.system = systemPrompt;
      }

      return item;
    });
  } else if (formatType === 'sharegpt') {
    return questions.map(q => {
      const messages = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: q.question
      });

      messages.push({
        role: 'assistant',
        content: includeCOT && q.cot ? `${q.cot}\n\n${q.answer}` : q.answer
      });

      return { messages };
    });
  } else if (formatType === 'multilingualthinking') {
    return questions.map(q => {
      const messages = [];

      // Main message block
      const mainMsg = {
        reasoning_language: reasoningLanguage ? reasoningLanguage : 'English',
        user: q.question,
        analysis: includeCOT && q.cot ? `${q.cot}` : null,
        final: q.answer
      };
      if (systemPrompt) {
        mainMsg.developer = systemPrompt;
      }
      messages.push(mainMsg);

      // Optional system prompt
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
          thinking: null
        });
      }

      // User message
      messages.push({
        role: 'user',
        content: q.question,
        thinking: null
      });

      // Assistant message
      messages.push({
        role: 'assistant',
        content: q.answer,
        thinking: includeCOT && q.cot ? `${q.cot}` : null
      });

      return { messages };
    });
  } else if (formatType === 'custom' && customFields) {
    return questions.map(q => {
      const item = {
        [customFields.questionField]: q.question,
        [customFields.answerField]: q.answer
      };

      if (includeCOT && q.cot) {
        item[customFields.cotField] = q.cot;
      }

      if (customFields.includeLabels && q.labels) {
        item.labels = q.labels;
      }

      if (customFields.includeChunk && q.chunkId) {
        item.chunkId = q.chunkId;
      }

      return item;
    });
  }

  // 預設返回 alpaca 格式
  return questions.map(q => ({
    instruction: q.question,
    output: includeCOT && q.cot ? `${q.cot}\n\n${q.answer}` : q.answer
  }));
}

// 將資料轉換為 CSV 格式
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');

  const rows = data.map(item => {
    return headers
      .map(header => {
        const value = item[header];
        if (typeof value === 'string') {
          // 處理字串中的逗號和引號
          return `"${value.replace(/"/g, '""')}"`;
        } else if (Array.isArray(value)) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\n');
}

// 使用 @huggingface/hub 包上傳檔案到 HuggingFace
async function uploadFile(token, datasetName, filePath, destFileName) {
  try {
    // 準備倉庫配置
    const repo = { type: 'dataset', name: datasetName };

    // 建立檔案 URL
    const fileUrl = new URL(`file://${filePath}`);

    // 使用 @huggingface/hub 包上傳檔案
    await uploadFiles({
      repo,
      accessToken: token,
      files: [
        {
          path: destFileName,
          content: fileUrl
        }
      ],
      commitTitle: `Upload ${destFileName}`,
      commitDescription: `Files uploaded using Easy Dataset`
    });

    return { success: true };
  } catch (error) {
    console.error(`File ${destFileName} Upload Error:`, String(error));
    throw error;
  }
}

// Generate README.md file
function generateReadme(projectName, projectDescription, formatType) {
  return `# ${projectName}

## Description
${projectDescription || 'This dataset was created using the Easy Dataset tool.'}

## Format
This dataset is in ${formatType} format.

## Creation Method
This dataset was created using the [Easy Dataset](https://github.com/ConardLi/easy-dataset) tool.

> Easy Dataset is a specialized application designed to streamline the creation of fine-tuning datasets for Large Language Models (LLMs). It offers an intuitive interface for uploading domain-specific files, intelligently splitting content, generating questions, and producing high-quality training data for model fine-tuning.

`;
}
