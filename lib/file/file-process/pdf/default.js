import pdf2md from '@opendocsg/pdf2md';
import { getProjectRoot } from '@/lib/db/base';
import fs from 'fs';
import path from 'path';

export async function defaultProcessing(projectId, fileName) {
  console.log('executing default pdf conversion strategy......');

  // 獲取專案根目錄
  const projectRoot = await getProjectRoot();
  const projectPath = path.join(projectRoot, projectId);

  // 獲取檔案路徑
  const filePath = path.join(projectPath, 'files', fileName);

  // 讀取檔案
  const pdfBuffer = fs.readFileSync(filePath);

  // 轉換後文件名
  const convertName = fileName.replace(/\.([^.]*)$/, '') + '.md';

  try {
    const text = await pdf2md(pdfBuffer);
    const outputFile = path.join(projectPath, 'files', convertName);
    console.log(`Writing to ${outputFile}...`);
    fs.writeFileSync(path.resolve(outputFile), text);
    console.log('pdf conversion completed!');

    // 返回轉換後的檔名
    return { success: true, fileName: convertName };
  } catch (err) {
    console.error('pdf conversion failed:', err);
    throw err;
  }
}

export default {
  defaultProcessing
};
