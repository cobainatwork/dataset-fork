class OptimisticLockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

const MAX_OPTIMISTIC_LOCK_RETRIES = 5;

/**
 * 以 optimistic lock 紀律執行寫入：version precondition 失敗（OptimisticLockError）
 * 時重試，重試耗盡才拋。fn 每次重試應重新讀取最新 state（由 fn 內部負責），
 * 使重試用上新 version。非 OptimisticLockError 的錯誤直接向上拋。
 * @param {() => Promise<any>} fn
 */
async function withOptimisticRetry(fn) {
  for (let attempt = 0; attempt < MAX_OPTIMISTIC_LOCK_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof OptimisticLockError)) throw e;
    }
  }
  throw new Error('optimistic lock retries exhausted');
}

module.exports = { OptimisticLockError, withOptimisticRetry, MAX_OPTIMISTIC_LOCK_RETRIES };
