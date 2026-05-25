/**
 * 此指令碼用於生成空的模板資料庫檔案（template.sqlite）
 * 該檔案將在應用打包時被包含，並在使用者首次啟動應用時作為初始資料庫
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const templatePath = path.join(__dirname, 'template.sqlite');
const sqlitePath = path.join(__dirname, 'empty.db.sqlite');

// 如果存在舊的模板檔案，先刪除
if (fs.existsSync(templatePath)) {
  console.log('刪除舊的模板資料庫...');
  fs.unlinkSync(templatePath);
}

// 如果存在臨時資料庫檔案，先刪除
if (fs.existsSync(sqlitePath)) {
  console.log('刪除臨時資料庫檔案...');
  fs.unlinkSync(sqlitePath);
}

try {
  console.log('設定臨時資料庫路徑...');
  // 設定 DATABASE_URL 環境變數
  process.env.DATABASE_URL = `file:${sqlitePath}`;

  console.log('執行 prisma db push 建立新的資料庫架構...');
  // 執行 prisma db push 建立資料庫架構
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('將生成的資料庫檔案複製為模板...');
  // 複製生成的資料庫檔案為模板
  fs.copyFileSync(sqlitePath, templatePath);

  console.log(`✅ 模板資料庫已成功生成: ${templatePath}`);
} catch (error) {
  console.error('❌ 生成模板資料庫失敗:', error);
  process.exit(1);
} finally {
  // 清理: 刪除臨時資料庫檔案
  if (fs.existsSync(sqlitePath)) {
    console.log('清理臨時資料庫檔案...');
    fs.unlinkSync(sqlitePath);
  }
}
