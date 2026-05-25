const http = require('http');
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');

function formatError(error) {
  const parts = [];
  const name = error && error.name ? error.name : 'Error';
  const message = error && error.message ? error.message : String(error);

  parts.push(`${name}: ${message}`);

  if (error && error.stack) {
    parts.push(error.stack);
  }

  if (error && error.cause) {
    parts.push(`Cause: ${formatLogArg(error.cause)}`);
  }

  return parts.join('\n');
}

function formatLogArg(arg) {
  if (arg instanceof Error) {
    return formatError(arg);
  }

  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2);
    } catch (error) {
      return `[Unserializable Object: ${error.message}]`;
    }
  }

  return String(arg);
}

function formatLogMessage(args) {
  return args.map(formatLogArg).join(' ');
}

/**
 * 檢查埠是否被佔用
 * @param {number} port 埠號
 * @returns {Promise<boolean>} 埠是否被佔用
 */
function checkPort(port) {
  return new Promise(resolve => {
    const server = http.createServer();
    server.once('error', () => {
      resolve(true); // 埠被佔用
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // 埠未被佔用
    });
    server.listen(port);
  });
}

/**
 * 啟動 Next.js 服務
 * @param {number} port 埠號
 * @param {Object} app Electron app 物件
 * @returns {Promise<string>} 服務URL
 */
async function startNextServer(port, app) {
  console.log(`Easy Dataset 客戶端啟動中，當前版本: ${require('../util').getAppVersion()}`);

  // 設定日誌檔案路徑
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, `nextjs-${new Date().toISOString().replace(/:/g, '-')}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // 重定向 console.log 和 console.error
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  console.log = function () {
    const args = Array.from(arguments);
    const logMessage = formatLogMessage(args);

    logStream.write(`[${new Date().toISOString()}] [LOG] ${logMessage}\n`);
    originalConsoleLog.apply(console, args);
  };

  console.error = function () {
    const args = Array.from(arguments);
    const logMessage = formatLogMessage(args);

    logStream.write(`[${new Date().toISOString()}] [ERROR] ${logMessage}\n`);
    originalConsoleError.apply(console, args);
  };

  // 檢查埠是否被佔用
  const isPortBusy = await checkPort(port);
  if (isPortBusy) {
    console.log(`埠 ${port} 已被佔用，嘗試直接連線...`);
    return `http://localhost:${port}`;
  }

  console.log(`啟動 Next.js 服務，埠: ${port}`);

  try {
    // 動態匯入 Next.js
    const next = require('next');
    const nextApp = next({
      dev: false,
      dir: path.join(__dirname, '../..'),
      conf: {
        // 配置 Next.js 的日誌輸出
        onInfo: info => {
          console.log(`[Next.js Info] ${info}`);
        },
        onError: error => {
          console.error('[Next.js Error]', error);
        },
        onWarn: warn => {
          console.log(`[Next.js Warning] ${warn}`);
        }
      }
    });
    const handle = nextApp.getRequestHandler();

    await nextApp.prepare();

    const server = http.createServer((req, res) => {
      // 記錄請求日誌
      console.log(`[Request] ${req.method} ${req.url}`);
      handle(req, res);
    });

    return new Promise(resolve => {
      server.listen(port, err => {
        if (err) throw err;
        console.log('服務已啟動，正在開啟應用...');
        resolve(`http://localhost:${port}`);
      });
    });
  } catch (error) {
    console.error('啟動服務失敗:', error);
    dialog.showErrorBox('啟動失敗', `無法啟動 Next.js 服務: ${error.message}`);
    app.quit();
    return '';
  }
}

module.exports = {
  checkPort,
  startNextServer
};
