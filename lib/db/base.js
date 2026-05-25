'use server';

import fs from 'fs';
import path from 'path';
import os from 'os';

// 獲取適合的資料儲存目錄
function getDbDirectory() {
  if (process.resourcesPath) {
    const rootPath = String(fs.readFileSync(path.join(process.resourcesPath, 'root-path.txt')));
    if (rootPath) {
      return rootPath;
    }
  }
  // 檢查是否在瀏覽器環境中執行
  if (typeof window !== 'undefined') {
    // 檢查是否在 Electron 渲染程序中執行
    if (window.electron && window.electron.getUserDataPath) {
      // 使用 preload 指令碼中暴露的 API 獲取使用者資料目錄
      const userDataPath = window.electron.getUserDataPath();
      if (userDataPath) {
        return path.join(userDataPath, 'local-db');
      }
    }

    // 如果不是 Electron 或獲取失敗，則使用開發環境的路徑
    return path.join(process.cwd(), 'local-db');
  } else if (process.versions && process.versions.electron) {
    // 在 Electron 主程序中執行
    try {
      const { app } = require('electron');
      return path.join(app.getPath('userData'), 'local-db');
    } catch (error) {
      console.error('Failed to get user data directory:', String(error), path.join(os.homedir(), '.easy-dataset-db'));
      // 降級處理，使用臨時目錄
      return path.join(os.homedir(), '.easy-dataset-db');
    }
  } else {
    // 在普通 Node.js 環境中執行（開發模式）
    return path.join(process.cwd(), 'local-db');
  }
}

let PROJECT_ROOT = '';

// 獲取專案根目錄
export async function getProjectRoot() {
  if (!PROJECT_ROOT) {
    PROJECT_ROOT = getDbDirectory();
  }
  return PROJECT_ROOT;
}

export async function getProjectPath(projectId) {
  const projectRoot = await getProjectRoot();
  return path.join(projectRoot, projectId);
}

// 確保資料庫目錄存在
export async function ensureDbExists() {
  try {
    await fs.promises.access(PROJECT_ROOT);
  } catch (error) {
    await fs.promises.mkdir(PROJECT_ROOT, { recursive: true });
  }
}

// 讀取JSON檔案
export async function readJsonFile(filePath) {
  try {
    await fs.promises.access(filePath);
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// 寫入JSON檔案
export async function writeJsonFile(filePath, data) {
  // 使用臨時檔案策略，避免寫入中斷導致檔案損壞
  const tempFilePath = `${filePath}_${Date.now()}.tmp`;
  try {
    // 序列化為JSON字串
    const jsonString = JSON.stringify(data, null, 2);
    // 先寫入臨時檔案
    await fs.promises.writeFile(tempFilePath, jsonString, 'utf8');

    // 從臨時檔案讀取內容並驗證
    try {
      const writtenContent = await fs.promises.readFile(tempFilePath, 'utf8');
      JSON.parse(writtenContent); // 驗證JSON是否有效
      // 驗證通過後，原子性地重新命名檔案替換原檔案
      await fs.promises.rename(tempFilePath, filePath);
    } catch (validationError) {
      // 驗證失敗，刪除臨時檔案並丟擲錯誤
      await fs.promises.unlink(tempFilePath).catch(() => {});
      throw new Error(`寫入的JSON檔案內容無效: ${validationError.message}`);
    }
    return data;
  } catch (error) {
    console.error(`寫入JSON檔案 ${filePath} 失敗:`, error);
    throw error;
  } finally {
    // 確保臨時檔案被刪除
    await fs.promises.unlink(tempFilePath).catch(() => {});
  }
}

// 確保目錄存在
export async function ensureDir(dirPath) {
  try {
    await fs.promises.access(dirPath);
  } catch (error) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}
