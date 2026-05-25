const { clearLogs } = require('./logger');
const { clearDatabaseCache } = require('./database');

/**
 * 清除快取函式 - 清理logs和local-db目錄
 * @param {Object} app Electron app 物件
 * @returns {Promise<boolean>} 操作是否成功
 */
async function clearCache(app) {
  // 清理日誌目錄
  await clearLogs(app);

  // 清理資料庫快取
  await clearDatabaseCache(app);

  return true;
}

module.exports = {
  clearCache
};
