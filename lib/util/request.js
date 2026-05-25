/**
 * 封裝的通用重試函式，用於在操作失敗後自動重試
 * @param {Function} asyncOperation - 需要執行的非同步操作函式
 * @param {Object} options - 配置選項
 * @param {number} options.retries - 重試次數，預設為1
 * @param {number} options.delay - 重試前的延遲時間(毫秒)，預設為0
 * @param {Function} options.onRetry - 重試前的回撥函式，接收錯誤和當前重試次數作為引數
 * @returns {Promise} - 返回非同步操作的結果
 */
export const withRetry = async (asyncOperation, options = {}) => {
  const { retries = 1, delay = 0, onRetry = null } = options;
  let lastError;

  // 嘗試執行操作，包括初次嘗試和後續重試
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await asyncOperation();
    } catch (error) {
      lastError = error;

      // 如果這是最後一次嘗試，則不再重試
      if (attempt === retries) {
        break;
      }

      // 如果提供了重試回撥，則執行
      if (onRetry && typeof onRetry === 'function') {
        onRetry(error, attempt + 1);
      }

      // 如果設定了延遲，則等待指定時間
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // 如果所有嘗試都失敗，則丟擲最後一個錯誤
  throw lastError;
};

/**
 * 封裝的fetch函式，支援自動重試
 * @param {string} url - 請求URL
 * @param {Object} options - fetch選項
 * @param {Object} retryOptions - 重試選項
 * @returns {Promise} - 返回fetch響應
 */
export const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
  return withRetry(() => fetch(url, options), retryOptions);
};

/**
 * 封裝的 fetch 函式
 * @param {string} url - 請求URL
 * @param {Object} options - fetch選項
 * @returns {Promise} - 返回fetch響應
 */
export const request = async (url, options = {}) => {
  try {
    const result = await fetch(url, options);
    const data = await result.json();
    if (!result.ok) {
      throw new Error(`Fetch Error: ${url} ${String(data.error || 'Unknown error')}`);
    }
    return data;
  } catch (error) {
    throw new Error(`Fetch Error: ${url}  ${String(error)} ${options.errMsg || ''}`);
  }
};

export default fetchWithRetry;
