/**
 * tasks service module 載入檢查：createTask 為真實導出（非 mock）。
 * 若 index.js 有語法/import 錯誤，此測試會紅。
 * mock PrismaClient 避免測試環境無 DB 時的連線嘗試與 open-handle。
 */
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $disconnect: jest.fn(),
    task: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    }
  }))
}));

describe('lib/services/tasks module', () => {
  it('exports createTask, processTask, updateTask', () => {
    const mod = require('@/lib/services/tasks');
    expect(typeof mod.createTask).toBe('function');
    expect(typeof mod.processTask).toBe('function');
    expect(typeof mod.updateTask).toBe('function');
  });
});
