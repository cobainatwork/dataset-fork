// 並行處理陣列的輔助函式，限制併發數
export const processInParallel = async (items, processFunction, concurrencyLimit, onProgress) => {
  const results = [];
  const inProgress = new Set();
  const queue = [...items];
  let completedCount = 0;

  while (queue.length > 0 || inProgress.size > 0) {
    // 如果有空閒槽位且佇列中還有任務，啟動新任務
    while (inProgress.size < concurrencyLimit && queue.length > 0) {
      const item = queue.shift();
      const promise = processFunction(item).then(result => {
        inProgress.delete(promise);
        onProgress && onProgress(++completedCount, items.length);
        return result;
      });
      inProgress.add(promise);
      results.push(promise);
    }

    // 等待其中一個任務完成
    if (inProgress.size > 0) {
      await Promise.race(inProgress);
    }
  }

  return Promise.all(results);
};
