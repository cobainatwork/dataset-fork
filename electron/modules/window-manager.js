const { BrowserWindow, shell } = require('electron');
const path = require('path');
const url = require('url');
const { getAppVersion } = require('../util');

let mainWindow;

/**
 * 建立主視窗
 * @param {boolean} isDev 是否為開發環境
 * @param {number} port 服務埠
 * @returns {BrowserWindow} 建立的主視窗
 */
function createWindow(isDev, port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js')
    },
    icon: path.join(__dirname, '../../public/imgs/logo.ico')
  });

  // 設定視窗標題
  mainWindow.setTitle(`Easy Dataset v${getAppVersion()}`);
  const loadingPath = url.format({
    pathname: path.join(__dirname, '..', 'loading.html'),
    protocol: 'file:',
    slashes: true
  });

  // 載入 loading 頁面時使用專門的 preload 指令碼
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(loadingPath);

  // 處理視窗導航事件，將外部連結在瀏覽器中開啟
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // 解析當前 URL 和導航 URL
    const parsedUrl = new URL(navigationUrl);
    const currentHostname = isDev ? 'localhost' : 'localhost';
    const currentPort = port.toString();

    // 檢查是否是外部連結
    if (parsedUrl.hostname !== currentHostname || (parsedUrl.port !== currentPort && parsedUrl.port !== '')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // 處理新視窗開啟請求，將外部連結在瀏覽器中開啟
  mainWindow.webContents.setWindowOpenHandler(({ url: navigationUrl }) => {
    // 解析導航 URL
    const parsedUrl = new URL(navigationUrl);
    const currentHostname = isDev ? 'localhost' : 'localhost';
    const currentPort = port.toString();

    // 檢查是否是外部連結
    if (parsedUrl.hostname !== currentHostname || (parsedUrl.port !== currentPort && parsedUrl.port !== '')) {
      shell.openExternal(navigationUrl);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.maximize();

  return mainWindow;
}

/**
 * 載入應用URL
 * @param {string} appUrl 應用URL
 */
function loadAppUrl(appUrl) {
  if (mainWindow) {
    mainWindow.loadURL(appUrl);
  }
}

/**
 * 在開發環境中開啟開發者工具
 */
function openDevTools() {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * 獲取主視窗
 * @returns {BrowserWindow} 主視窗
 */
function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  loadAppUrl,
  openDevTools,
  getMainWindow
};
