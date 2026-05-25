const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const { updateDatabase } = require('./db-updater');

/**
 * 清除資料庫快取
 * @param {Object} app Electron app 物件
 * @returns {Promise<boolean>} 操作是否成功
 */
async function clearDatabaseCache(app) {
  // 清理local-db目錄，保留db.sqlite檔案
  const localDbDir = path.join(app.getPath('userData'), 'local-db');
  if (fs.existsSync(localDbDir)) {
    // 讀取目錄下所有檔案
    const files = await fs.promises.readdir(localDbDir);
    // 刪除除了db.sqlite之外的所有檔案
    for (const file of files) {
      if (file !== 'db.sqlite') {
        const filePath = path.join(localDbDir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.isFile()) {
          await fs.promises.unlink(filePath);
          global.appLog(`已刪除資料庫快取檔案: ${filePath}`);
        } else if (stat.isDirectory()) {
          // 如果是目錄，可能需要遞迴刪除，根據需求決定
          global.appLog(`跳過目錄: ${filePath}`);
        }
      }
    }
  }
  return true;
}

/**
 * 初始化資料庫
 * @param {Object} app Electron app 物件
 * @returns {Promise<Object>} 資料庫配置資訊
 */
async function initializeDatabase(app) {
  try {
    // 設定資料庫路徑
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'local-db');
    const dbFilePath = path.join(dataDir, 'db.sqlite');
    const dbJSONPath = path.join(dataDir, 'db.json');
    fs.writeFileSync(path.join(process.resourcesPath, 'root-path.txt'), dataDir);

    // 確保資料目錄存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`資料目錄已建立: ${dataDir}`);
    }

    // 設定資料庫連線字串 (Prisma 格式)
    const dbConnectionString = `file:${dbFilePath}`;
    process.env.DATABASE_URL = dbConnectionString;

    // 僅在開發環境記錄日誌
    const logs = {
      userDataPath,
      dataDir,
      dbFilePath,
      dbConnectionString,
      dbExists: fs.existsSync(dbFilePath)
    };
    global.appLog(`資料庫配置: ${JSON.stringify(logs)}`);

    if (!fs.existsSync(dbFilePath)) {
      global.appLog('資料庫檔案不存在，正在初始化...');

      try {
        const resourcePath =
          process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '../..', 'prisma', 'template.sqlite')
            : path.join(process.resourcesPath, 'prisma', 'template.sqlite');

        const resourceJSONPath =
          process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '../..', 'prisma', 'sql.json')
            : path.join(process.resourcesPath, 'prisma', 'sql.json');

        global.appLog(`resourcePath: ${resourcePath}`);

        if (fs.existsSync(resourcePath)) {
          fs.copyFileSync(resourcePath, dbFilePath);
          global.appLog(`資料庫已從模板初始化: ${dbFilePath}`);
        }

        if (fs.existsSync(resourceJSONPath)) {
          fs.copyFileSync(resourceJSONPath, dbJSONPath);
          global.appLog(`資料庫SQL配置已初始化: ${dbJSONPath}`);
        }
      } catch (error) {
        console.error('資料庫初始化失敗:', error);
        dialog.showErrorBox('資料庫初始化失敗', `應用無法初始化資料庫，可能需要重新安裝。\n錯誤詳情: ${error.message}`);
        throw error;
      }
    } else {
      // 資料庫檔案存在，檢查是否需要更新
      global.appLog('檢查資料庫是否需要更新...');
      try {
        const resourcesPath =
          process.env.NODE_ENV === 'development' ? path.join(__dirname, '../..') : process.resourcesPath;

        const isDev = process.env.NODE_ENV === 'development';

        // 更新資料庫
        const result = await updateDatabase(userDataPath, resourcesPath, isDev, global.appLog);

        if (result.updated) {
          global.appLog(`資料庫更新成功: ${result.message}`);
          global.appLog(`執行的版本: ${result.executedVersions.join(', ')}`);
        } else {
          global.appLog(`資料庫無需更新: ${result.message}`);
        }
      } catch (error) {
        console.error('資料庫更新失敗:', error);
        global.appLog(`資料庫更新失敗: ${error.message}`, 'error');

        // 非致命錯誤，只提示但不阻止應用啟動
        dialog.showMessageBox({
          type: 'warning',
          title: '資料庫更新警告',
          message: '資料庫更新過程中出現錯誤，部分功能可能受影響。',
          detail: `錯誤詳情: ${error.message}\n\n您可以繼續使用應用，但如果遇到問題，請重新安裝應用。`,
          buttons: ['繼續']
        });
      }
    }

    return {
      userDataPath,
      dataDir,
      dbFilePath,
      dbConnectionString
    };
  } catch (error) {
    console.error('初始化資料庫時發生錯誤:', error);
    throw error;
  }
}

module.exports = {
  clearDatabaseCache,
  initializeDatabase
};
