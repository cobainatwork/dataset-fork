import http from 'http';
import https from 'https';
import AdmZip from 'adm-zip';
import { getProjectRoot } from '@/lib/db/base';
import fs from 'fs';
import path from 'path';

// 常量定義
const MINERU_API_BASE = 'https://mineru.net/api/v4';
const POLL_INTERVAL = 3000; // 3秒
const MAX_POLL_ATTEMPTS = 90; // 最多嘗試90次
const PROCESSING_STATES = {
  DONE: 'done',
  FAILED: 'failed'
};

export async function minerUProcessing(projectId, fileName, options = {}) {
  console.log('executing pdf mineru conversion strategy......');
  try {
    const { updateTask, task, message } = options;

    let taskCompletedCount = task.completedCount;

    // 獲取專案路徑
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const filePath = path.join(projectPath, 'files', fileName);

    // 讀取任務配置
    const taskConfigPath = path.join(projectPath, 'task-config.json');
    let taskConfig;
    try {
      await fs.promises.access(taskConfigPath);
      const taskConfigData = await fs.promises.readFile(taskConfigPath, 'utf8');
      taskConfig = JSON.parse(taskConfigData);
    } catch (error) {
      console.error('error getting mineru token configuration:', error);
      throw new Error('token configuration not found, please check if mineru token is configured in task settings');
    }

    const key = taskConfig?.minerUToken;
    if (key === undefined || key === null || key === '') {
      throw new Error('token configuration not found, please check if mineru token is configured in task settings');
    }

    // 準備請求選項
    const requestOptions = JSON.stringify({
      enable_formula: true,
      layout_model: 'doclayout_yolo',
      enable_table: true,
      files: [{ name: fileName, is_ocr: true, data_id: 'abcd' }]
    });

    // 1. 獲取檔案上傳地址
    console.log('mineru getting file upload url...');
    const urlResponse = await makeHttpRequest(`${MINERU_API_BASE}/file-urls/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestOptions),
        Authorization: `Bearer ${key}`
      },
      body: requestOptions
    });

    if (urlResponse.code !== 0 || !urlResponse.data?.file_urls?.[0]) {
      throw new Error('failed to get file upload url: ' + JSON.stringify(urlResponse));
    }

    //上傳檔案後會自動執行任務
    let batchId = null;
    let uploadUrl = null;
    console.log('mineru executing file upload task...');
    if (urlResponse.code == 0) {
      //上傳檔案地址
      uploadUrl = urlResponse.data?.file_urls?.[0];
      //此次任務id
      batchId = urlResponse.data?.batch_id;
    }

    // 2. 上傳檔案
    await uploadFile(filePath, uploadUrl);
    console.log('mineru file upload completed!');

    // 3. 輪詢查詢轉換狀態
    console.log('mineru starting to check task progress...');
    let currentPage = 0;
    let totalPage = 0;
    while (true) {
      try {
        //查詢任務進度API
        const resultResponse = await makeHttpRequest(`${MINERU_API_BASE}/extract-results/batch/${batchId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`
          }
        });

        // 任務狀態
        const currentState = resultResponse.data?.extract_result?.[0]?.state;
        const extract_progress = resultResponse.data?.extract_result?.[0]?.extract_progress;

        if (extract_progress) {
          // 任務進度
          currentPage = extract_progress.extracted_pages;
          // 總頁數
          totalPage = extract_progress.total_pages;
        } else {
          currentPage = totalPage;
        }
        message.current.processedPage = currentPage;
        message.stepInfo = `processing ${fileName} ${currentPage}/${totalPage} pages progress: ${(currentPage / totalPage) * 100}%`;

        //更新任務狀態
        await updateTask(task.id, {
          completedCount: currentPage + taskCompletedCount,
          detail: JSON.stringify(message)
        });

        console.log(`mineru ${fileName} current progress: ${currentPage}/${totalPage}, status: ${currentState}`);

        //解析成功結束回寫狀態定時器
        if (resultResponse.code === 0 && currentState === PROCESSING_STATES.DONE) {
          const zipUrl = resultResponse.data.extract_result[0].full_zip_url;
          const savePath = path.join(projectPath, 'files');
          await downloadAndExtractZip(zipUrl, savePath, fileName);
          break;
        }
        // 檢查是否失敗
        if (resultResponse.code !== 0 || currentState === PROCESSING_STATES.FAILED) {
          throw new Error(`task processing failed: ${JSON.stringify(resultResponse)}`);
        }

        // 等待下次輪詢
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      } catch (error) {
        throw error;
      }
    }
    console.log('mineru pdf conversion completed!');
    return { success: true };
  } catch (error) {
    console.error('mineru api call error:', error);
    throw error;
  }
}

/**
 * 傳送 HTTP 請求
 */
async function makeHttpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: `${urlObj.pathname}${urlObj.search}`,
      method: options.method,
      headers: options.headers
    };

    const req = client.request(requestOptions, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`request failed, status code: ${res.statusCode}, response: ${data}`));
          }
        } catch (error) {
          reject(new Error('failed to parse response'));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * 上傳檔案至MinerU指定地址
 */
async function uploadFile(filePath, uploadUrl) {
  return new Promise((resolve, reject) => {
    const isHttps = uploadUrl.startsWith('https');
    const url = new URL(uploadUrl);
    const client = url.protocol === 'https:' ? https : http;
    const fileStream = fs.createReadStream(filePath);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'PUT'
    };

    const req = client.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(responseData);
        } else {
          reject(new Error(`Upload failed with status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    fileStream.pipe(req);
  });
}

/**
 * 獲取任務執行完成後的壓縮包，僅解壓md檔案
 */
async function downloadAndExtractZip(zipUrl, targetDir, fileName) {
  // 建立目標目錄
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 下載 ZIP 檔案到記憶體
  const zipBuffer = await new Promise((resolve, reject) => {
    https.get(zipUrl, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });

  // 解壓到目標目錄
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();
  zipEntries.forEach(entry => {
    if (entry.entryName.toLowerCase().endsWith('.md')) {
      // 獲取檔案內容為 Buffer
      const content = zip.readFile(entry);
      // 嘗試用 UTF-8 解碼，如果失敗則嘗試其他編碼
      const text = content.toString('utf8');
      // 建立輸出檔案路徑
      const outputPath = path.join(targetDir, fileName.replace('.pdf', '.md'));
      // 寫入檔案，確保使用 UTF-8 編碼
      fs.writeFileSync(outputPath, text, { encoding: 'utf8' });
      console.log(`extracted to directory: ${outputPath}`);
    }
  });
}

export default {
  minerUProcessing
};
