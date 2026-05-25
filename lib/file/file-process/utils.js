/**
 * 名字太長影響 UI 顯示，擷取檔名
 * @param {*} filename
 */
export function handleLongFileName(filename) {
  if (filename.length <= 13) {
    return filename;
  }
  const front = filename.substring(0, 7);
  const back = filename.substring(filename.length - 5);
  return `${front}···${back}`;
}
