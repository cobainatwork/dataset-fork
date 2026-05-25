import { request } from '@/lib/util/request';

/**
 * 獲取文字塊
 * @param {string} projectId 專案ID
 * @param {string} chunkId 文字塊ID
 * @returns
 */
export async function getChunkById(projectId, chunkId) {
  return await request(`/api/projects/${projectId}/chunks/${chunkId}`);
}
