import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import TurndownService from 'turndown';

/**
 * 處理 EPUB 檔案，提取文字內容並轉換為 Markdown
 * @param {ArrayBuffer} arrayBuffer - EPUB 檔案的二進位制資料
 * @returns {Promise<string>} - 轉換後的 Markdown 內容
 */
export async function processEpub(arrayBuffer) {
  try {
    const zip = new JSZip();
    const epub = await zip.loadAsync(arrayBuffer);

    // 1. 讀取 META-INF/container.xml 獲取 OPF 檔案路徑
    const containerXml = await epub.file('META-INF/container.xml').async('text');
    const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
    const opfPath = containerDoc.getElementsByTagName('rootfile')[0].getAttribute('full-path');

    // 2. 讀取 OPF 檔案獲取章節資訊
    const opfContent = await epub.file(opfPath).async('text');
    const opfDoc = new DOMParser().parseFromString(opfContent, 'text/xml');

    // 獲取 manifest 中的所有專案
    const manifestItems = Array.from(opfDoc.getElementsByTagName('item'));
    const spineItems = Array.from(opfDoc.getElementsByTagName('itemref'));

    // 3. 按照 spine 順序獲取章節檔案
    const chapters = [];
    for (const spineItem of spineItems) {
      const idref = spineItem.getAttribute('idref');
      const manifestItem = manifestItems.find(item => item.getAttribute('id') === idref);

      if (manifestItem && manifestItem.getAttribute('media-type') === 'application/xhtml+xml') {
        const href = manifestItem.getAttribute('href');
        const chapterPath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) + href : href;

        try {
          const chapterContent = await epub.file(chapterPath).async('text');
          chapters.push({
            title: getChapterTitle(chapterContent),
            content: chapterContent,
            path: chapterPath
          });
        } catch (error) {
          console.warn(`無法讀取章節檔案: ${chapterPath}`, error);
        }
      }
    }

    // 4. 轉換為 Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });

    // 配置 turndown 規則
    turndownService.addRule('removeStyles', {
      filter: ['style', 'script'],
      replacement: () => ''
    });

    let markdownContent = '';

    // 新增書籍標題
    const title = getBookTitle(opfDoc);
    if (title) {
      markdownContent += `# ${title}\n\n`;
    }

    // 轉換每個章節
    for (const chapter of chapters) {
      if (chapter.title && chapter.title !== title) {
        markdownContent += `## ${chapter.title}\n\n`;
      }

      // 提取正文內容
      const bodyContent = extractBodyContent(chapter.content);
      const chapterMarkdown = turndownService.turndown(bodyContent);

      // 清理多餘的空行
      const cleanedMarkdown = chapterMarkdown.replace(/\n{3,}/g, '\n\n').trim();

      if (cleanedMarkdown) {
        markdownContent += cleanedMarkdown + '\n\n';
      }
    }

    return markdownContent.trim();
  } catch (error) {
    console.error('處理 EPUB 檔案時出錯:', error);
    throw new Error(`EPUB 檔案處理失敗: ${error.message}`);
  }
}

/**
 * 從 OPF 檔案中獲取書籍標題
 */
function getBookTitle(opfDoc) {
  try {
    const titleElements = opfDoc.getElementsByTagName('dc:title');
    if (titleElements.length > 0) {
      return titleElements[0].textContent.trim();
    }

    const titleElements2 = opfDoc.getElementsByTagName('title');
    if (titleElements2.length > 0) {
      return titleElements2[0].textContent.trim();
    }
  } catch (error) {
    console.warn('獲取書籍標題失敗:', error);
  }
  return null;
}

/**
 * 從章節內容中提取標題
 */
function getChapterTitle(htmlContent) {
  try {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

    // 嘗試從 title 標籤獲取
    const titleElement = doc.getElementsByTagName('title')[0];
    if (titleElement && titleElement.textContent.trim()) {
      return titleElement.textContent.trim();
    }

    // 嘗試從第一個 h1-h6 標籤獲取
    for (let i = 1; i <= 6; i++) {
      const headings = doc.getElementsByTagName(`h${i}`);
      if (headings.length > 0 && headings[0].textContent.trim()) {
        return headings[0].textContent.trim();
      }
    }

    // 嘗試從第一個段落獲取（如果很短的話）
    const paragraphs = doc.getElementsByTagName('p');
    if (paragraphs.length > 0) {
      const firstParagraph = paragraphs[0].textContent.trim();
      if (firstParagraph.length < 100) {
        return firstParagraph;
      }
    }
  } catch (error) {
    console.warn('提取章節標題失敗:', error);
  }
  return null;
}

/**
 * 從 HTML 內容中提取 body 部分
 */
function extractBodyContent(htmlContent) {
  try {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const bodyElement = doc.getElementsByTagName('body')[0];

    if (bodyElement) {
      // 移除不需要的元素
      const elementsToRemove = ['script', 'style', 'nav', 'header', 'footer'];
      elementsToRemove.forEach(tagName => {
        const elements = bodyElement.getElementsByTagName(tagName);
        for (let i = elements.length - 1; i >= 0; i--) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      });

      return bodyElement.innerHTML || bodyElement.textContent;
    }

    // 如果沒有 body 標籤，返回整個內容
    return htmlContent;
  } catch (error) {
    console.warn('提取正文內容失敗:', error);
    return htmlContent;
  }
}
