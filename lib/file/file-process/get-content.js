import TurndownService from 'turndown';
import mammoth from 'mammoth';
import { processEpub } from './epub';

/**
 * 獲取檔案內容
 * @param {*} file
 */
export async function getContent(file) {
  let fileContent;
  let fileName = file.name;

  // 如果是 docx 檔案，先轉換為 markdown
  if (file.name.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: image => {
          return mammoth.docx.paragraph({
            children: [
              mammoth.docx.textRun({
                text: ''
              })
            ]
          });
        }
      }
    );
    const turndownService = new TurndownService();
    fileContent = turndownService.turndown(htmlResult.value);
    fileName = file.name.replace('.docx', '.md');
  } else if (file.name.endsWith('.epub')) {
    // 如果是 epub 檔案，轉換為 markdown
    const arrayBuffer = await file.arrayBuffer();
    fileContent = await processEpub(arrayBuffer);
    fileName = file.name.replace('.epub', '.md');
  } else {
    // 對於 md 和 txt 檔案，直接讀取內容
    const reader = new FileReader();
    fileContent = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
    fileName = file.name.replace('.txt', '.md');
  }
  return { fileContent, fileName };
}
