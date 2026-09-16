/**
 * images DELETE route wiring 回歸測試（C2 purge 不變量）：
 * 刪圖片時，問題必須經 lib/db/questions 的 deleteQuestionsByImageId
 * （內含 embedding purge / cluster cleanup），不得直接 db.questions.deleteMany
 * 留下孤兒向量。
 */
const mockDeleteQuestionsByImageId = jest.fn(async () => ({ count: 2 }));
const mockDeleteImageDatasetsByImageId = jest.fn(async () => ({ count: 1 }));
const mockGetImageDetail = jest.fn(async () => ({ id: 'img1', imageName: 'a.png' }));
const mockDeleteImage = jest.fn(async () => ({}));
const mockUnlink = jest.fn(async () => {});

jest.mock('@/lib/db/questions', () => ({
  deleteQuestionsByImageId: (...args) => mockDeleteQuestionsByImageId(...args)
}));
jest.mock('@/lib/db/imageDatasets', () => ({
  deleteImageDatasetsByImageId: (...args) => mockDeleteImageDatasetsByImageId(...args)
}));
jest.mock('@/lib/db/images', () => ({
  getImages: jest.fn(),
  deleteImage: (...args) => mockDeleteImage(...args),
  getImageDetail: (...args) => mockGetImageDetail(...args)
}));
jest.mock('@/lib/db/base', () => ({
  getProjectPath: async () => require('path').join(require('os').tmpdir(), 'p1')
}));
jest.mock('fs/promises', () => ({
  unlink: (...args) => mockUnlink(...args)
}));
jest.mock('@/lib/services/images', () => ({
  importImagesFromDirectories: jest.fn()
}));

const { DELETE } = require('@/app/api/projects/[projectId]/images/route');

function makeRequest(imageId) {
  const url = `http://localhost/api/projects/p1/images?imageId=${encodeURIComponent(imageId || '')}`;
  return new Request(url, { method: 'DELETE' });
}

describe('images DELETE route 走 purge-aware 刪除', () => {
  beforeEach(() => jest.clearAllMocks());

  it('缺 imageId 回 400、不碰 db', async () => {
    const res = await DELETE(makeRequest(''), { params: { projectId: 'p1' } });
    expect(res.status).toBe(400);
    expect(mockDeleteQuestionsByImageId).not.toHaveBeenCalled();
  });

  it('刪除順序：imageDatasets → questions(purge) → 檔案 → image 記錄', async () => {
    const res = await DELETE(makeRequest('img1'), { params: { projectId: 'p1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockDeleteImageDatasetsByImageId).toHaveBeenCalledWith('img1');
    expect(mockDeleteQuestionsByImageId).toHaveBeenCalledWith('img1');
    expect(mockDeleteImage).toHaveBeenCalledWith('img1');

    // questions 的 purge 刪除必須在 image 記錄刪除之前（cluster 計算需要 question row 語意）
    const callOrder = [
      mockDeleteImageDatasetsByImageId.mock.invocationCallOrder[0],
      mockDeleteQuestionsByImageId.mock.invocationCallOrder[0],
      mockDeleteImage.mock.invocationCallOrder[0]
    ];
    expect(callOrder).toEqual([...callOrder].sort((a, b) => a - b));
  });

  it('圖片不存在回 404', async () => {
    mockGetImageDetail.mockResolvedValueOnce(null);
    const res = await DELETE(makeRequest('nope'), { params: { projectId: 'p1' } });
    expect(res.status).toBe(404);
    expect(mockDeleteQuestionsByImageId).not.toHaveBeenCalled();
  });
});
