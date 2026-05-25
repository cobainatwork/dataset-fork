const { contextBridge, ipcRenderer } = require('electron');

// 在渲染程序中暴露安全的 API
contextBridge.exposeInMainWorld('electron', {
  // 獲取應用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 獲取當前語言
  getLanguage: () => {
    // 嘗試從本地儲存獲取語言設定
    const storedLang = localStorage.getItem('i18nextLng');
    // 如果存在則返回，否則返回系統語言或預設為中文
    return storedLang || navigator.language.startsWith('zh') ? 'zh' : 'en';
  },

  // 獲取使用者資料目錄
  getUserDataPath: () => {
    try {
      return ipcRenderer.sendSync('get-user-data-path');
    } catch (error) {
      console.error('獲取使用者資料目錄失敗:', error);
      return null;
    }
  },

  // 更新相關 API
  updater: {
    // 檢查更新
    checkForUpdates: () => ipcRenderer.invoke('check-update'),

    // 下載更新
    downloadUpdate: () => ipcRenderer.invoke('download-update'),

    // 安裝更新
    installUpdate: () => ipcRenderer.invoke('install-update'),

    // 監聽更新事件
    onUpdateAvailable: callback => {
      const handler = (_, info) => callback(info);
      ipcRenderer.on('update-available', handler);
      return () => ipcRenderer.removeListener('update-available', handler);
    },

    onUpdateNotAvailable: callback => {
      const handler = () => callback();
      ipcRenderer.on('update-not-available', handler);
      return () => ipcRenderer.removeListener('update-not-available', handler);
    },

    onUpdateError: callback => {
      const handler = (_, error) => callback(error);
      ipcRenderer.on('update-error', handler);
      return () => ipcRenderer.removeListener('update-error', handler);
    },

    onDownloadProgress: callback => {
      const handler = (_, progress) => callback(progress);
      ipcRenderer.on('download-progress', handler);
      return () => ipcRenderer.removeListener('download-progress', handler);
    },

    onUpdateDownloaded: callback => {
      const handler = (_, info) => callback(info);
      ipcRenderer.on('update-downloaded', handler);
      return () => ipcRenderer.removeListener('update-downloaded', handler);
    }
  }
});

// 通知渲染程序 preload 指令碼已載入完成
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded');
});
