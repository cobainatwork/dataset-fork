const { app, dialog, ipcMain } = require('electron');
const { setupLogging, setupIpcLogging } = require('./modules/logger');
const { createWindow, loadAppUrl, openDevTools, getMainWindow } = require('./modules/window-manager');
const { createMenu } = require('./modules/menu');
const { startNextServer } = require('./modules/server');
const { setupAutoUpdater } = require('./modules/updater');
const { initializeDatabase } = require('./modules/database');
const { clearCache } = require('./modules/cache');
const { setupIpcHandlers } = require('./modules/ipc-handlers');

// 是否是開發環境
const isDev = process.env.NODE_ENV === 'development';
const port = 1717;
let mainWindow;

// 當 Electron 完成初始化時建立視窗
app.whenReady().then(async () => {
  try {
    // 設定日誌系統
    setupLogging(app);

    // 設定 IPC 處理程式
    setupIpcHandlers(app, isDev);
    setupIpcLogging(ipcMain, app, isDev);

    // 初始化資料庫
    await initializeDatabase(app);

    // 建立主視窗
    mainWindow = createWindow(isDev, port);

    // 建立選單
    createMenu(mainWindow, () => clearCache(app));

    // 在開發環境中載入 localhost URL
    if (isDev) {
      loadAppUrl(`http://localhost:${port}`);
      openDevTools();
    } else {
      // 在生產環境中啟動 Next.js 服務
      const appUrl = await startNextServer(port, app);
      loadAppUrl(appUrl);
    }

    // 設定自動更新
    setupAutoUpdater(mainWindow);

    // 應用啟動完成後的一段時間後自動檢查更新
    setTimeout(() => {
      if (!isDev) {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.checkForUpdates().catch(err => {
          console.error('Automatic update check failed:', err);
        });
      }
    }, 10000); // Check for updates after 10 seconds
  } catch (error) {
    console.error('An error occurred during application initialization:', error);
    dialog.showErrorBox(
      'Application Initialization Error',
      `An error occurred during startup, which may affect application functionality.
    Error details: ${error.message}`
    );
  }
});

// 當所有視窗關閉時退出應用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow(isDev, port);
  }
});

// 應用退出前清理
app.on('before-quit', () => {
  console.log('應用正在退出...');
});
