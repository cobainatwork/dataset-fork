import { defaultProcessing } from './default';
import { minerUProcessing } from './mineru';
import { visionProcessing } from './vision';
import { minerULocalProcessing } from './mineru-local';

/**
 * PDF處理服務入口
 * @param {string} projectId 專案ID
 * @param {string} fileName 檔名
 * @param {Object} options 處理選項
 * @param {string} strategy 處理策略，可選值: 'default', 'mineru', 'vision'
 * @returns {Promise<Object>} 處理結果
 */
export async function processPdf(strategy = 'default', projectId, fileName, options = {}) {
  switch (strategy.toLowerCase()) {
    case 'default':
      return await defaultProcessing(projectId, fileName, options);
    case 'mineru':
      return await minerUProcessing(projectId, fileName, options);
    case 'vision':
      return await visionProcessing(projectId, fileName, options);
    case 'mineru-local':
      return await minerULocalProcessing(projectId, fileName, options);
    default:
      throw new Error(`unsupported PDF processing strategy: ${strategy}`);
  }
}

export default {
  processPdf
};

export * from './util';
