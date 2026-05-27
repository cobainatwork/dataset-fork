import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getProject } from '@/lib/db/projects';
import { getProjectRoot, ensureDir } from '@/lib/db/base';
import { getFileMD5 } from '@/lib/util/file';
import { replaceUploadFile } from '@/lib/db/upload-files';

export const dynamic = 'force-dynamic';
export const bodyParser = false;

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

    return NextResponse.json({
      message: 'File replaced successfully',
      newFileId: result.newFileId,
      cleared: result.clearedStats,
    });
  } catch (error) {
    console.error('Error replacing file:', String(error));
    return NextResponse.json({ error: error.message || 'File replace failed' }, { status: 500 });
  }
}
