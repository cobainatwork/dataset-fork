const { autoUpdater } = require('electron-updater');
const { getAppVersion } = require('../util');

/**
 * 設定自動更新
 * @param {BrowserWindow} mainWindow 主視窗
 */
function setupAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = false;
  autoUpdater.allowDowngrade = false;

  // 檢查更新時出錯
  autoUpdater.on('error', error => {
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
  });

  // 檢查到更新時
  autoUpdater.on('update-available', info => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });

  // 沒有可用更新
  autoUpdater.on('update-not-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  // 下載進度
  autoUpdater.on('download-progress', progressObj => {
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  // 下載完成
  autoUpdater.on('update-downloaded', info => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });
}

/**
 * 檢查更新
 * @param {boolean} isDev 是否為開發環境
 * @returns {Promise<Object>} 更新資訊
 */
async function checkUpdate(isDev) {
  try {
    if (isDev) {
      // 開發環境下模擬更新檢查
      return {
        hasUpdate: false,
        currentVersion: getAppVersion(),
        message: '開發環境下不檢查更新'
      };
    }

    // 返回當前版本資訊，並開始檢查更新
    const result = await autoUpdater.checkForUpdates();
    return {
      checking: true,
      currentVersion: getAppVersion()
    };
  } catch (error) {
    console.error('檢查更新失敗:', error);
    return {
      hasUpdate: false,
      currentVersion: getAppVersion(),
      error: error.message
    };
  }
}

/**
 * 下載更新
 * @returns {Promise<Object>} 下載狀態
 */
async function downloadUpdate() {
  try {
    autoUpdater.downloadUpdate();
    return { downloading: true };
  } catch (error) {
    console.error('下載更新失敗:', error);
    return { error: error.message };
  }
}

/**
 * 安裝更新
 * @returns {Object} 安裝狀態
 */
function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
  return { installing: true };
}

module.exports = {
  setupAutoUpdater,
  checkUpdate,
  downloadUpdate,
  installUpdate
};
