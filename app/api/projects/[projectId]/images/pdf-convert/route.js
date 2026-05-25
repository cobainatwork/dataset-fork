import { NextResponse } from 'next/server';
import { getProjectPath } from '@/lib/db/base';
import { importImagesFromDirectories } from '@/lib/services/images';
import fs from 'fs/promises';
import path from 'path';
import { savePdfAsImages } from '@/lib/util/file';

// PDF 轉圖片並匯入
export async function POST(request, { params }) {
  let tempPdfPath = null;
  let tempImagesDir = null;

  try {
    const { projectId } = params;
    const formData = await request.formData();
    const pdfFile = formData.get('file');

    if (!pdfFile) {
      return NextResponse.json({ error: '請選擇 PDF 檔案' }, { status: 400 });
    }

    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: '只支援 PDF 檔案' }, { status: 400 });
    }

    const projectPath = await getProjectPath(projectId);
    const tempDir = path.join(projectPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // 1. 儲存 PDF 到臨時目錄
    tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${pdfFile.name}`);
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // 2. 建立臨時圖片目錄
    tempImagesDir = path.join(tempDir, `pdf_images_${Date.now()}`);
    await fs.mkdir(tempImagesDir, { recursive: true });

    // 3. 呼叫 pdf2md-js 轉換 PDF 為圖片
    console.log('開始轉換 PDF 為圖片...');
    const imagePaths = await savePdfAsImages(tempPdfPath, tempImagesDir, 3);
    console.log('PDF 轉換完成，生成圖片數量:', imagePaths.length);

    if (!imagePaths || imagePaths.length === 0) {
      throw new Error('PDF 轉換失敗，未生成圖片');
    }

    // 4. 直接呼叫服務層匯入圖片
    const importResult = await importImagesFromDirectories(projectId, [tempImagesDir]);

    // 5. 清理臨時檔案
    try {
      if (tempPdfPath) {
        await fs.unlink(tempPdfPath);
      }
      if (tempImagesDir) {
        const tempImages = await fs.readdir(tempImagesDir);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempImagesDir, img));
        }
        await fs.rmdir(tempImagesDir);
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
      pdfName: pdfFile.name
    });
  } catch (error) {
    console.error('Failed to convert PDF:', error);

    // 清理臨時檔案
    try {
      if (tempPdfPath) {
        await fs.unlink(tempPdfPath).catch(() => {});
      }
      if (tempImagesDir) {
        const tempImages = await fs.readdir(tempImagesDir).catch(() => []);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempImagesDir, img)).catch(() => {});
        }
        await fs.rmdir(tempImagesDir).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('清理臨時檔案失敗:', cleanupErr);
    }

    return NextResponse.json({ error: error.message || 'Failed to convert PDF' }, { status: 500 });
  }
}
