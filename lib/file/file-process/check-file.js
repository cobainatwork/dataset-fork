import { FILE } from '@/constant';

/**
 * 檢查檔案大小
 */
export function checkMaxSize(files) {
  const oversizedFiles = files.filter(file => file.size > FILE.MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    throw new Error(`Max 50MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
  }
}

/**
 * 獲取可以上傳的檔案
 * @param {*} files
 * @returns
 */
export function getvalidFiles(files) {
  return files.filter(
    file =>
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.epub')
  );
}

/**
 * 檢查不能上傳的檔案
 * @param {*} files
 * @returns
 */
export function checkInvalidFiles(files) {
  const invalidFiles = files.filter(
    file =>
      !file.name.endsWith('.md') &&
      !file.name.endsWith('.txt') &&
      !file.name.endsWith('.docx') &&
      !file.name.endsWith('.pdf') &&
      !file.name.endsWith('.epub')
  );
  if (invalidFiles.length > 0) {
    throw new Error(`Unsupported File Format: ${invalidFiles.map(f => f.name).join(', ')}`);
  }
  return invalidFiles;
}
