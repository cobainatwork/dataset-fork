/**
 * replace route wiring 回歸測試：
 * 替換後 server 端必須建 file-processing task（UI 不再重發 upload chain）。
 * 若有人把 createTask 從 route 拿掉、或改動 task note 形狀，此測試會紅。
 */
const mockCreateTask = jest.fn(async () => ({ id: 'task_1' }));
const mockReplaceUploadFile = jest.fn(async () => ({
  newFileId: 'f_new',
  lineageId: 'lin_1',
  clearedStats: { chunks: 1, questions: 0, datasets: 0 }
}));

jest.mock('@/lib/services/tasks', () => ({
  createTask: (...args) => mockCreateTask(...args)
}));
jest.mock('@/lib/db/upload-files', () => ({
  replaceUploadFile: (...args) => mockReplaceUploadFile(...args)
}));
jest.mock('@/lib/db/projects', () => ({
  getProject: async () => ({ id: 'p1', name: 'P' })
}));
jest.mock('@/lib/db/base', () => ({
  getProjectRoot: async () =>
    require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'replace-route-')),
  ensureDir: async dir => require('fs').promises.mkdir(dir, { recursive: true })
}));
jest.mock('@/lib/util/file', () => ({
  getFileMD5: async () => 'md5'
}));

const { POST } = require('@/app/api/projects/[projectId]/files/[fileId]/replace/route');

function makeRequest(taskConfigHeader) {
  const headers = { 'x-file-name': encodeURIComponent('doc.md') };
  if (taskConfigHeader !== undefined) headers['x-task-config'] = taskConfigHeader;
  return new Request('http://localhost/api/projects/p1/files/f_old/replace', {
    method: 'POST',
    body: 'hello world',
    headers
  });
}

describe('replace route enqueues file-processing task', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates task with new fileId, strategy and domainTreeAction keep; returns taskId', async () => {
    const res = await POST(makeRequest(JSON.stringify({ strategy: 'vision', visionModel: { id: 'vm1' } })), {
      params: { projectId: 'p1', fileId: 'f_old' }
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.newFileId).toBe('f_new');
    expect(json.taskId).toBe('task_1');
    expect(mockReplaceUploadFile).toHaveBeenCalledWith('f_old', expect.objectContaining({ fileName: 'doc.md' }));
    expect(mockCreateTask).toHaveBeenCalledWith({
      projectId: 'p1',
      taskType: 'file-processing',
      detail: '檔案替換處理任務',
      note: {
        vsionModel: { id: 'vm1' },
        projectId: 'p1',
        fileList: [{ fileName: 'doc.md', fileId: 'f_new' }],
        strategy: 'vision',
        domainTreeAction: 'keep'
      }
    });
  });

  it('drops non-object visionModel (trust boundary: header 是 client 輸入)', async () => {
    for (const vm of ['abc', 42, null, [1]]) {
      mockCreateTask.mockClear();
      const res = await POST(makeRequest(JSON.stringify({ visionModel: vm })), {
        params: { projectId: 'p1', fileId: 'f_old' }
      });
      expect((await res.json()).taskId).toBe('task_1');
      expect(mockCreateTask.mock.calls[0][0].note.vsionModel).toBeUndefined();
    }
  });

  it('falls back to default strategy when x-task-config is malformed or absent', async () => {
    for (const header of ['{oops', undefined]) {
      mockCreateTask.mockClear();
      const res = await POST(makeRequest(header), { params: { projectId: 'p1', fileId: 'f_old' } });
      expect((await res.json()).taskId).toBe('task_1');
      const note = mockCreateTask.mock.calls[0][0].note;
      expect(note.strategy).toBe('default');
      expect(note.vsionModel).toBeUndefined();
      expect(note.domainTreeAction).toBe('keep');
    }
  });
});
