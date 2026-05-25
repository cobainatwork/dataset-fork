import { NextResponse } from 'next/server';
import { getProjectPath } from '@/lib/db/base';
import { importImagesFromDirectories } from '@/lib/services/images';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';

// 壓縮包解壓並匯入圖片
export async function POST(request, { params }) {
  let tempZipPath = null;
  let tempExtractDir = null;

  try {
    const { projectId } = params;
    const formData = await request.formData();
    const zipFile = formData.get('file');

    if (!zipFile) {
      return NextResponse.json({ error: '請選擇壓縮包檔案' }, { status: 400 });
    }

    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: '只支援 ZIP 格式的壓縮包' }, { status: 400 });
    }

    const projectPath = await getProjectPath(projectId);
    const tempDir = path.join(projectPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // 1. 儲存壓縮包到臨時目錄
    tempZipPath = path.join(tempDir, `temp_${Date.now()}_${zipFile.name}`);
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    await fs.writeFile(tempZipPath, zipBuffer);

    // 2. 建立臨時解壓目錄
    tempExtractDir = path.join(tempDir, `zip_extract_${Date.now()}`);
    await fs.mkdir(tempExtractDir, { recursive: true });

    // 3. 使用 adm-zip 解壓檔案
    console.log('開始解壓壓縮包...');
    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();

    // 支援的圖片副檔名
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    let extractedCount = 0;

    // 遍歷壓縮包中的所有檔案
    for (const entry of zipEntries) {
      // 跳過目錄和隱藏檔案
      if (
        entry.isDirectory ||
        entry.entryName.startsWith('__MACOSX') ||
        path.basename(entry.entryName).startsWith('.')
      ) {
        continue;
      }

      const ext = path.extname(entry.entryName).toLowerCase();
      if (imageExtensions.includes(ext)) {
        // 提取檔名（不包含路徑）
        const fileName = path.basename(entry.entryName);
        const targetPath = path.join(tempExtractDir, fileName);

        // 解壓檔案
        zip.extractEntryTo(entry, tempExtractDir, false, true, false, fileName);
        extractedCount++;
      }
    }

    console.log(`壓縮包解壓完成，提取圖片數量: ${extractedCount}`);

    if (extractedCount === 0) {
      throw new Error('壓縮包中沒有找到支援的圖片檔案');
    }

    // 4. 呼叫服務層匯入圖片
    const importResult = await importImagesFromDirectories(projectId, [tempExtractDir]);

    // 5. 清理臨時檔案
    try {
      if (tempZipPath) {
        await fs.unlink(tempZipPath);
      }
      if (tempExtractDir) {
        const tempImages = await fs.readdir(tempExtractDir);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempExtractDir, img));
        }
        await fs.rmdir(tempExtractDir);
      }
      const tempDirContents = await fs.readdir(tempDir);
      if (tempDirContents.length === 0) {
        await fs.rmdir(tempDir);
      }
    } catch (cleanupErr) {
      console.warn('清理臨時檔案失敗:', cleanupErr);
    }

    return NextResponse.json({
      success: true,
      count: importResult.count,
      images: importResult.images,
      zipName: zipFile.name
    });
  } catch (error) {
    console.error('Failed to import ZIP:', error);

    // 清理臨時檔案
    try {
      if (tempZipPath) {
        await fs.unlink(tempZipPath).catch(() => {});
      }
      if (tempExtractDir) {
        const tempImages = await fs.readdir(tempExtractDir).catch(() => []);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempExtractDir, img)).catch(() => {});
        }
        await fs.rmdir(tempExtractDir).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('清理臨時檔案失敗:', cleanupErr);
    }

    return NextResponse.json({ error: error.message || 'Failed to import ZIP' }, { status: 500 });
  }
}
