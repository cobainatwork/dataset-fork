import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { PDFiumLibrary } from '@hyzyla/pdfium';
import fs from 'fs-extra';
import sharp from 'sharp';

export async function getFileMD5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    const stream = createReadStream(filePath);

    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function filterDomainTree(tree = []) {
  for (let i = 0; i < tree.length; i++) {
    const { child } = tree[i];
    delete tree[i].id;
    delete tree[i].projectId;
    delete tree[i].parentId;
    delete tree[i].questionCount;
    filterDomainTree(child);
  }
  return tree;
}

async function renderFunction(options) {
  return await sharp(options.data, {
    raw: {
      width: options.width,
      height: options.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();
}

export const savePdfAsImages = async (pdfData, outputDir, scale = 3) => {
  // 確保輸出目錄存在
  await fs.ensureDir(outputDir);

  // 獲取PDF檔名（不含副檔名）作為字首
  let fileNamePrefix = 'document';
  if (typeof pdfData === 'string') {
    const path = require('path');
    fileNamePrefix = path.basename(pdfData, path.extname(pdfData));
  }

  // 如果pdfData是字串，則當作路徑處理
  let data;
  if (typeof pdfData === 'string') {
    data = new Uint8Array(await fs.readFile(pdfData));
  } else {
    data = new Uint8Array(pdfData);
  }

  // 載入PDF文件
  const library = await PDFiumLibrary.init();
  const document = await library.loadDocument(data);
  const numPages = document.getPageCount();

  console.log(`PDF文件共 ${numPages} 頁，開始生成截圖...`);

  // 儲存生成的影像檔案路徑
  const imagePaths = [];

  // 處理每一頁
  for (const page of document.pages()) {
    const pageIndex = page.number + 1;
    console.log(`生成第 ${pageIndex} 頁截圖...`);

    // 將PDF頁面渲染為PNG圖片
    const image = await page.render({
      scale: scale,
      render: renderFunction
    });

    // 生成檔名和路徑，使用PDF檔名作為字首
    const fileName = `${fileNamePrefix}-${pageIndex.toString().padStart(4, '0')}.png`;
    const filePath = `${outputDir}/${fileName}`;

    // 儲存圖片到檔案
    await fs.writeFile(filePath, Buffer.from(image.data));
    imagePaths.push(filePath);
  }

  document.destroy();
  library.destroy();

  console.log(`PDF截圖完成，共生成 ${imagePaths.length} 張圖片`);
  return imagePaths;
};
