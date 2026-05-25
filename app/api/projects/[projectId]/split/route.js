import { NextResponse } from 'next/server';
import { splitProjectFile, getProjectChunks } from '@/lib/file/text-splitter';
import { getProject, updateProject } from '@/lib/db/projects';
import { getTags } from '@/lib/db/tags';
import { handleDomainTree } from '@/lib/util/domain-tree';

// 處理文字分割請求
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 獲取請求體
    const { fileNames, model, language, domainTreeAction = 'rebuild' } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Please Select Model' }, { status: 400 });
    }

    const project = await getProject(projectId);

    let result = {
      totalChunks: 0,
      chunks: [],
      toc: ''
    };
    for (let i = 0; i < fileNames.length; i++) {
      const fileName = fileNames[i];
      // 分割文字
      const { toc, chunks, totalChunks } = await splitProjectFile(projectId, fileName);
      result.toc += toc;
      result.chunks.push(...chunks);
      result.totalChunks += totalChunks;
      console.log(projectId, fileName, `Text split completed, ${domainTreeAction} domain tree`);
    }

    // 呼叫領域樹處理模組
    const tags = await handleDomainTree({
      projectId,
      action: domainTreeAction,
      newToc: result.toc,
      model,
      language,
      fileNames,
      project
    });

    if (!tags && domainTreeAction !== 'keep') {
      await updateProject(projectId, { ...project });
      return NextResponse.json(
        { error: 'AI analysis failed, please check model configuration, delete file and retry!' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ...result, tags });
  } catch (error) {
    console.error('Text split error:', String(error));
    return NextResponse.json({ error: error.message || 'Text split failed' }, { status: 500 });
  }
}

// 獲取專案中的所有文字塊
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    // 獲取文字塊詳細資訊
    const result = await getProjectChunks(projectId, filter);

    const tags = await getTags(projectId);

    // 返回詳細的文字塊資訊和檔案結果（單個檔案）
    return NextResponse.json({
      chunks: result.chunks,
      ...result.fileResult, // 單個檔案結果，而不是陣列
      tags
    });
  } catch (error) {
    console.error('Failed to get text chunks:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get text chunks' }, { status: 500 });
  }
}
