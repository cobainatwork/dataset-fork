/**
 * 並行處理陣列的輔助函式，限制併發數
 * @param {Array} items - 要處理的專案陣列
 * @param {Function} processFunction - 處理單個專案的函式
 * @param {number} concurrencyLimit - 併發限制數量
 * @returns {Promise<Array>} 處理結果陣列
 */
export async function processInParallel(items, processFunction, concurrencyLimit = 2) {
  const results = [];
  const inProgress = new Set();
  const queue = [...items];

  while (queue.length > 0 || inProgress.size > 0) {
    // 如果有空閒槽位且佇列中還有任務，啟動新任務
    while (inProgress.size < concurrencyLimit && queue.length > 0) {
      const item = queue.shift();
      const promise = processFunction(item).then(result => {
        inProgress.delete(promise);
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
}

export default processInParallel;
