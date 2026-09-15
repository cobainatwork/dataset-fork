import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getProject } from '@/lib/db/projects';
import { getProjectRoot, ensureDir } from '@/lib/db/base';
import { getFileMD5 } from '@/lib/util/file';
import { replaceUploadFile } from '@/lib/db/upload-files';
import { createTask } from '@/lib/services/tasks';

export const dynamic = 'force-dynamic';
export const bodyParser = false;

// trust boundary：x-task-config 是 client 輸入。只取 strategy / visionModel，
// visionModel 只接受 plain object（其他型別丟棄），解析失敗回預設。
function parseTaskConfig(rawHeader) {
  let parsed = {};
  try {
    parsed = JSON.parse(rawHeader || '{}');
  } catch (error) {
    console.error('Invalid x-task-config header:', String(error));
  }
  const { strategy, visionModel } = parsed;
  const isPlainObject = visionModel && typeof visionModel === 'object' && !Array.isArray(visionModel);
  return { strategy, visionModel: isPlainObject ? visionModel : undefined };
}

export async function POST(request, { params }) {
  try {
    const { projectId, fileId } = params;
    if (!projectId || !fileId) {
      return NextResponse.json({ error: 'projectId and fileId are required' }, { status: 400 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    const encodedFileName = request.headers.get('x-file-name');
    const fileName = encodedFileName ? decodeURIComponent(encodedFileName) : null;
    if (!fileName) {
      return NextResponse.json({ error: 'Missing x-file-name header' }, { status: 400 });
    }
    if (!fileName.endsWith('.md') && !fileName.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only Markdown/PDF files are supported' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await request.arrayBuffer());
    const projectRoot = await getProjectRoot();
    const filesDir = path.join(projectRoot, projectId, 'files');
    await ensureDir(filesDir);
    const filePath = path.join(filesDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    const stat = await fs.stat(filePath);
    const md5 = await getFileMD5(filePath);
    const ext = path.extname(filePath);

    const result = await replaceUploadFile(fileId, {
      fileName, size: stat.size, md5, fileExt: ext, path: filesDir,
    });

    // 替換後重跑 file-processing（PDF 轉換 + 分塊 + 領域樹 keep）：
    // server 端直接建 task，UI 不再重發 upload chain（x-task-config 為
    // JSON header：{ strategy, visionModel }；解析失敗時用預設值）。
    const { strategy, visionModel } = parseTaskConfig(request.headers.get('x-task-config'));

    const task = await createTask({
      projectId,
      taskType: 'file-processing',
      detail: '檔案替換處理任務',
      // 刻意不傳 modelInfo / language：domainTreeAction 固定 'keep'，
      // handleDomainTree 會在用 model 前短路（與 spec 記錄的 parity 偏離）。
      note: {
        // 'vsionModel' 為既有 task note 欄位名（歷史拼寫），勿改
        vsionModel: visionModel,
        projectId,
        fileList: [{ fileName, fileId: result.newFileId }],
        strategy: strategy || 'default',
        domainTreeAction: 'keep'
      }
    });

    return NextResponse.json({
      message: 'File replaced successfully',
      newFileId: result.newFileId,
      fileName,
      taskId: task.id,
      cleared: result.clearedStats,
    });
  } catch (error) {
    console.error('Error replacing file:', String(error));
    return NextResponse.json({ error: error.message || 'File replace failed' }, { status: 500 });
  }
}
