const fs = require('fs');
const path = require('path');

/**
 * 設定應用日誌系統
 * @param {Object} app Electron app 物件
 * @returns {string} 日誌檔案路徑
 */
function setupLogging(app) {
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFilePath = path.join(logDir, `app-${new Date().toISOString().slice(0, 10)}.log`);

  // 建立自定義日誌函式
  global.appLog = (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // 同時輸出到控制檯和日誌檔案
    console.log(message);
    fs.appendFileSync(logFilePath, logEntry);
  };

  // 捕獲全域性未處理異常並記錄
  process.on('uncaughtException', error => {
    global.appLog(`未捕獲的異常: ${error.stack || error}`, 'error');
  });

  return logFilePath;
}

/**
 * 設定 IPC 日誌處理程式
 * @param {Object} ipcMain IPC 主程序物件
 * @param {Object} app Electron app 物件
 * @param {boolean} isDev 是否為開發環境
 */
function setupIpcLogging(ipcMain, app, isDev) {
  ipcMain.on('log', (event, { level, message }) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // 只在客戶端環境下寫入檔案
    if (!isDev || true) {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, logEntry);
    }

    // 同時輸出到控制檯
    console[level](message);
  });
}

/**
 * 清理日誌檔案
 * @param {Object} app Electron app 物件
 * @returns {Promise<void>}
 */
async function clearLogs(app) {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  if (fs.existsSync(logsDir)) {
    // 讀取目錄下所有檔案
    const files = await fs.promises.readdir(logsDir);
    // 刪除所有檔案
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      await fs.promises.unlink(filePath);
      global.appLog(`已刪除日誌檔案: ${filePath}`);
    }
  }
}

module.exports = {
  setupLogging,
  setupIpcLogging,
  clearLogs
};
