/**
 * db seam 回歸測試（C2）：
 * - route 層（app/）：完全禁止裸 PrismaClient 存取（含 @/lib/db/client），
 *   所有 DB 存取必須走 lib/db/<module> 的命名函式，否則會繞過
 *   questions.js 的 embedding purge / cluster cleanup 不變量。
 * - 服務層（lib/，不含 lib/db/）：允許 @/lib/db/client（raw SQL / transaction 場景），
 *   但禁止已廢除的 @/lib/db 與 @/lib/db/index。
 * 靜態 / 動態 import 都算（from / require / await import）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// 任何形狀的裸 db 入口：@/lib/db、@/lib/db/index、@/lib/db/client
const ANY_BARE_DB = /['"]@\/lib\/db(?:\/index|\/client)?['"]/;
// 服務層：只剩 client 可用
const DEPRECATED_DB_ENTRIES = /['"]@\/lib\/db(?:\/index)?['"]/;

describe('db seam: 裸 PrismaClient 不外發', () => {
  it('app/（route 層）沒有檔案 import 任何裸 db 入口', () => {
    const violations = collectJsFiles(path.join(ROOT, 'app'))
      .filter(f => ANY_BARE_DB.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(ROOT, f));

    expect(violations).toEqual([]);
  });

  it('lib/（服務層，不含 lib/db/）沒有檔案 import 已廢除的裸 db 入口', () => {
    const violations = collectJsFiles(path.join(ROOT, 'lib'))
      .filter(f => !f.startsWith(path.join(ROOT, 'lib', 'db')))
      .filter(f => DEPRECATED_DB_ENTRIES.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(ROOT, f));

    expect(violations).toEqual([]);
  });
});
