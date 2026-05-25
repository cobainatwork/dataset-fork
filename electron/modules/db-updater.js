const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

/**
 * 執行SQL命令
 * @param {string} dbUrl 資料庫連線 URL
 * @param {string} sql SQL命令
 * @returns {Promise<void>}
 */
async function executeSql(dbUrl, sql) {
  // 允許多條SQL語句分開執行，支援分號和空行分隔
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  if (statements.length === 0) {
    return;
  }

  // 設定環境變數
  process.env.DATABASE_URL = dbUrl;

  // 建立Prisma例項
  const prisma = new PrismaClient();

  try {
    // 執行每條SQL語句
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  } finally {
    // 關閉連線
    await prisma.$disconnect();
  }
}

/**
 * 獲取本地和應用的SQL配置檔案
 * @param {string} userDataPath 使用者資料目錄
 * @param {string} resourcesPath 應用資源目錄
 * @param {boolean} isDev 是否開發環境
 * @returns {Promise<{userSqlConfig: Array, appSqlConfig: Array}>}
 */
async function getSqlConfigs(userDataPath, resourcesPath, isDev, logger = console.log) {
  // 使用者SQL配置檔案路徑
  const userSqlPath = path.join(userDataPath, 'sql.json');

  // 應用SQL配置檔案路徑
  const appSqlPath = isDev
    ? path.join(__dirname, '..', 'prisma', 'sql.json')
    : path.join(resourcesPath, 'prisma', 'sql.json');

  let userSqlConfig = [];
  let appSqlConfig = [];

  // 讀取應用SQL配置
  try {
    if (fs.existsSync(appSqlPath)) {
      const appSqlContent = fs.readFileSync(appSqlPath, 'utf8');
      appSqlConfig = JSON.parse(appSqlContent);
    }
  } catch (error) {
    throw new Error(`讀取應用SQL配置檔案失敗: ${error.message}`);
  }

  // 讀取使用者SQL配置（如果存在）
  try {
    if (fs.existsSync(userSqlPath)) {
      const userSqlContent = fs.readFileSync(userSqlPath, 'utf8');
      userSqlConfig = JSON.parse(userSqlContent);
    }
  } catch (error) {
    // 如果使用者SQL配置不存在或無法解析，使用空陣列
    userSqlConfig = [];
  }

  logger(appSqlPath);
  // logger(JSON.stringify(appSqlConfig, null, 2));
  logger(userSqlPath);
  // logger(JSON.stringify(userSqlConfig, null, 2));

  return { userSqlConfig, appSqlConfig };
}

/**
 * 更新使用者SQL配置檔案
 * @param {string} userDataPath 使用者資料目錄
 * @param {Array} sqlConfig 新的SQL配置
 */
function updateUserSqlConfig(userDataPath, sqlConfig) {
  const userSqlPath = path.join(userDataPath, 'sql.json');
  fs.writeFileSync(userSqlPath, JSON.stringify(sqlConfig, null, 4), 'utf8');
}

// 不再需要版本比較功能

/**
 * 獲取需要執行的SQL命令
 * @param {Array} userSqlConfig 使用者SQL配置
 * @param {Array} appSqlConfig 應用SQL配置
 * @returns {Array} 需要執行的SQL命令
 */
function getSqlsToExecute(userSqlConfig, appSqlConfig) {
  // 建立使用者已執行的SQL集合 (使用 version + sql 的組合作為唯一標識)
  const userExecutedSqlSet = new Set();
  userSqlConfig.forEach(item => {
    const key = `${item.version}:${item.sql}`;
    userExecutedSqlSet.add(key);
  });

  // 過濾出使用者需要執行的SQL (即應用SQL配置中存在但使用者尚未執行的SQL)
  return appSqlConfig.filter(item => {
    const key = `${item.version}:${item.sql}`;
    return !userExecutedSqlSet.has(key);
  });
}

/**
 * 更新資料庫
 * @param {string} userDataPath 使用者資料目錄
 * @param {string} resourcesPath 應用資源目錄
 * @param {boolean} isDev 是否開發環境
 * @param {function} logger 日誌函式
 */
async function updateDatabase(userDataPath, resourcesPath, isDev, logger = console.log) {
  const dbPath = path.join(userDataPath, 'local-db', 'db.sqlite');

  try {
    // 獲取SQL配置
    const { userSqlConfig, appSqlConfig } = await getSqlConfigs(userDataPath, resourcesPath, isDev, logger);

    // 獲取需要執行的SQL
    const sqlsToExecute = getSqlsToExecute(userSqlConfig, appSqlConfig);

    if (sqlsToExecute.length === 0) {
      logger('資料庫已是最新版本，無需更新');
      return { updated: false, message: '資料庫已是最新版本' };
    }

    // 設定資料庫URL
    const dbUrl = `file:${dbPath}`;

    // 執行SQL更新
    logger(`發現 ${sqlsToExecute.length} 個數據庫更新，開始執行...`);
    for (const item of sqlsToExecute) {
      try {
        logger(`執行版本 ${item.version} 的SQL更新: ${item.sql.substring(0, 100)}...`);
        await executeSql(dbUrl, item.sql);
        // 新增到使用者SQL配置
        userSqlConfig.push(item);
      } catch (error) {
        logger(`執行版本 ${item.version} 的SQL更新失敗: ${error.message}`);
      }
    }

    // 更新使用者SQL配置檔案
    updateUserSqlConfig(userDataPath, userSqlConfig);

    logger('資料庫更新完成');
    return {
      updated: true,
      message: `成功執行了 ${sqlsToExecute.length} 個數據庫更新`,
      executedVersions: sqlsToExecute.map(item => item.version)
    };
  } catch (error) {
    logger(`資料庫更新失敗: ${error.message}`);
    return { updated: false, error: error.message };
  }
}

module.exports = {
  updateDatabase,
  executeSql,
  getSqlConfigs,
  updateUserSqlConfig,
  getSqlsToExecute
};
