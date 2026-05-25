import { NextResponse } from 'next/server';
import { getProject } from '@/lib/db/projects';
import path from 'path';
import { getProjectRoot, ensureDir } from '@/lib/db/base';
import { promises as fs } from 'fs';
import {
  checkUploadFileInfoByMD5,
  createUploadFileInfo,
  delUploadFileInfoById,
  getUploadFilesPagination
} from '@/lib/db/upload-files';
import { getFileMD5 } from '@/lib/util/file';
import { batchSaveTags } from '@/lib/db/tags';
import { getProjectChunks, getProjectTocByName } from '@/lib/file/text-splitter';
import { handleDomainTree } from '@/lib/util/domain-tree';

// Replace the deprecated config export with the new export syntax
export const dynamic = 'force-dynamic';
// This tells Next.js not to parse the request body automatically
export const bodyParser = false;

// 獲取專案檔案列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10; // 每頁10個檔案，支援分頁
    const fileName = searchParams.get('fileName') || '';
    const getAllIds = searchParams.get('getAllIds') === 'true'; // 新增：獲取所有檔案ID的標誌

    // 如果請求所有檔案ID，直接返回ID列表
    if (getAllIds) {
      const allFiles = await getUploadFilesPagination(projectId, 1, 9999, fileName); // 獲取所有檔案
      const allFileIds = allFiles.data?.map(file => String(file.id)) || [];
      return NextResponse.json({ allFileIds });
    }
    // 獲取檔案列表
    const files = await getUploadFilesPagination(projectId, page, pageSize, fileName);

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error obtaining file list:', String(error));
    return NextResponse.json({ error: error.message || 'Error obtaining file list' }, { status: 500 });
  }
}

// 刪除檔案
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const domainTreeAction = searchParams.get('domainTreeAction') || 'keep';

    // 從請求體中獲取模型資訊和語言環境
    const requestData = await request.json();
    const model = requestData.model;
    const language = requestData.language || 'en';

    // 驗證專案ID和檔名
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    if (!fileId) {
      return NextResponse.json({ error: 'The file name cannot be empty' }, { status: 400 });
    }

    // 獲取專案資訊
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // 刪除檔案及其相關的文字塊、問題和資料集
    const { stats, fileName, fileInfo } = await delUploadFileInfoById(fileId);
    const deleteToc = await getProjectTocByName(projectId, fileName);
    try {
      const projectRoot = await getProjectRoot();
      const projectPath = path.join(projectRoot, projectId);
      const tocDir = path.join(projectPath, 'toc');
      const baseName = path.basename(fileInfo.fileName, path.extname(fileInfo.fileName));
      const tocPath = path.join(tocDir, `${baseName}-toc.json`);

      // 檢查檔案是否存在再刪除
      await fs.unlink(tocPath);
      console.log(`成功刪除 TOC 檔案: ${tocPath}`);
    } catch (error) {
      console.error(`刪除 TOC 檔案失敗:`, String(error));
      // 即使 TOC 檔案刪除失敗，不影響整體結果
    }

    // 如果選擇了保持領域樹不變，直接返回刪除結果
    if (domainTreeAction === 'keep') {
      return NextResponse.json({
        message: '檔案刪除成功',
        stats: stats,
        domainTreeAction: 'keep',
        cascadeDelete: true
      });
    }

    // 處理領域樹更新
    try {
      // 獲取專案的所有檔案
      const { chunks, toc } = await getProjectChunks(projectId);

      // 如果不存在文字塊，說明專案已經沒有檔案了
      if (!chunks || chunks.length === 0) {
        // 清空領域樹
        await batchSaveTags(projectId, []);
        return NextResponse.json({
          message: '檔案刪除成功，領域樹已清空',
          stats: stats,
          domainTreeAction,
          cascadeDelete: true
        });
      }

      // 呼叫領域樹處理模組
      await handleDomainTree({
        projectId,
        action: domainTreeAction,
        allToc: toc,
        model,
        language,
        deleteToc,
        project
      });
    } catch (error) {
      console.error('Error updating domain tree after file deletion:', String(error));
      // 即使領域樹更新失敗，也不影響檔案刪除的結果
    }

    return NextResponse.json({
      message: '檔案刪除成功',
      stats: stats,
      domainTreeAction,
      cascadeDelete: true
    });
  } catch (error) {
    console.error('Error deleting file:', String(error));
    return NextResponse.json({ error: error.message || 'Error deleting file' }, { status: 500 });
  }
}

// 上傳檔案
export async function POST(request, { params }) {
  console.log('File upload request processing, parameters:', params);
  const { projectId } = params;

  // 驗證專案ID
  if (!projectId) {
    console.log('The project ID cannot be empty, returning 400 error');
    return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
  }

  // 獲取專案資訊
  const project = await getProject(projectId);
  if (!project) {
    console.log('The project does not exist, returning 404 error');
    return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
  }
  console.log('Project information retrieved successfully:', project.name || project.id);

  try {
    console.log('Try using alternate methods for file upload...');

    // 檢查請求頭中是否包含檔名
    const encodedFileName = request.headers.get('x-file-name');
    const fileName = encodedFileName ? decodeURIComponent(encodedFileName) : null;
    console.log('Get file name from request header:', fileName);

    if (!fileName) {
      console.log('The request header does not contain a file name');
      return NextResponse.json(
        { error: 'The request header does not contain a file name (x-file-name)' },
        { status: 400 }
      );
    }

    // 檢查檔案型別
    if (!fileName.endsWith('.md') && !fileName.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only Markdown files are supported' }, { status: 400 });
    }

    // 直接從請求體中讀取二進位制資料
    const fileBuffer = Buffer.from(await request.arrayBuffer());

    // 儲存檔案
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const filesDir = path.join(projectPath, 'files');

    await ensureDir(filesDir);

    const filePath = path.join(filesDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    //獲取檔案大小
    const stats = await fs.stat(filePath);
    //獲取檔案md5
    const md5 = await getFileMD5(filePath);
    //獲取副檔名
    const ext = path.extname(filePath);

    // let res = await checkUploadFileInfoByMD5(projectId, md5);
    // if (res) {
    //   return NextResponse.json({ error: `【${fileName}】該檔案已在此專案中存在` }, { status: 400 });
    // }

    let fileInfo = await createUploadFileInfo({
      projectId,
      fileName,
      size: stats.size,
      md5,
      fileExt: ext,
      path: filesDir
    });

    console.log('The file upload process is complete, and a successful response is returned');
    return NextResponse.json({
      message: 'File uploaded successfully',
      fileName,
      filePath,
      fileId: fileInfo.id
    });
  } catch (error) {
    console.error('Error processing file upload:', String(error));
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'File upload failed: ' + (error.message || 'Unknown error')
      },
      { status: 500 }
    );
  }
}
