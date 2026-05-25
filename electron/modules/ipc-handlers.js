const { ipcMain } = require('electron');
const { checkUpdate, downloadUpdate, installUpdate } = require('./updater');

/**
 * 設定 IPC 處理程式
 * @param {Object} app Electron app 物件
 * @param {boolean} isDev 是否為開發環境
 */
function setupIpcHandlers(app, isDev) {
  // 獲取使用者資料路徑
  ipcMain.on('get-user-data-path', event => {
    event.returnValue = app.getPath('userData');
  });

  // 檢查更新
  ipcMain.handle('check-update', async () => {
    return await checkUpdate(isDev);
  });

  // 下載更新
  ipcMain.handle('download-update', async () => {
    return await downloadUpdate();
  });

  // 安裝更新
  ipcMain.handle('install-update', () => {
    return installUpdate();
  });
}

module.exports = {
  setupIpcHandlers
};
