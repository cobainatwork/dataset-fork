'use server';

import fs from 'fs';
import path from 'path';
import { getProjectRoot, ensureDir } from '../db/base';
import { getProject } from '@/lib/db/projects';
import { getChunkByProjectId, saveChunks } from '@/lib/db/chunks';
const {
  TokenTextSplitter,
  CharacterTextSplitter,
  RecursiveCharacterTextSplitter
} = require('@langchain/textsplitters');
const { Document } = require('@langchain/core/documents');

// 匯入Markdown分割工具
const markdownSplitter = require('./split-markdown/index');

async function splitFileByType({ projectPath, fileContent, fileName, projectId, fileId }) {
  // 獲取任務配置
  const taskConfigPath = path.join(projectPath, 'task-config.json');
  let taskConfig;

  try {
    await fs.promises.access(taskConfigPath);
    const taskConfigData = await fs.promises.readFile(taskConfigPath, 'utf8');
    taskConfig = JSON.parse(taskConfigData);
  } catch (error) {
    taskConfig = {
      textSplitMinLength: 1500,
      textSplitMaxLength: 2000
    };
  }
  // 獲取分割引數
  const minLength = taskConfig.textSplitMinLength || 1500;
  const maxLength = taskConfig.textSplitMaxLength || 2000;
  const chunkSize = taskConfig.chunkSize || 1500;
  const chunkOverlap = taskConfig.chunkOverlap || 200;
  const separator = taskConfig.separator || '\n\n';
  const separators = taskConfig.separators || ['|', '##', '>', '-'];
  const splitLanguage = taskConfig.splitLanguage || 'js';
  const splitType = taskConfig.splitType;

  if (splitType === 'text') {
    // 字元分塊
    const textSplitter = new CharacterTextSplitter({
      separator,
      chunkSize,
      chunkOverlap
    });
    const splitResult = await textSplitter.createDocuments([fileContent]);
    return splitResult.map((part, index) => {
      const chunkId = `${path.basename(fileName, path.extname(fileName))}-part-${index + 1}`;
      return {
        projectId,
        name: chunkId,
        fileId,
        fileName,
        content: part.pageContent,
        summary: '',
        size: part.pageContent.length
      };
    });
  } else if (splitType === 'token') {
    // Token 分塊
    const textSplitter = new TokenTextSplitter({
      chunkSize,
      chunkOverlap
    });
    const splitResult = await textSplitter.splitText(fileContent);
    return splitResult.map((part, index) => {
      const chunkId = `${path.basename(fileName, path.extname(fileName))}-part-${index + 1}`;
      return {
        projectId,
        name: chunkId,
        fileId,
        fileName,
        content: part,
        summary: '',
        size: part.length
      };
    });
  } else if (splitType === 'code') {
    // 遞迴分塊
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators
    });
    const jsSplitter = RecursiveCharacterTextSplitter.fromLanguage(splitLanguage, {
      chunkSize,
      chunkOverlap
    });
    const splitResult = await jsSplitter.createDocuments([fileContent]);
    return splitResult.map((part, index) => {
      const chunkId = `${path.basename(fileName, path.extname(fileName))}-part-${index + 1}`;
      return {
        projectId,
        name: chunkId,
        fileId,
        fileName,
        content: part.pageContent,
        summary: '',
        size: part.pageContent.length
      };
    });
  } else if (splitType === 'recursive') {
    // 遞迴分塊
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators
    });
    const splitResult = await textSplitter.splitDocuments([new Document({ pageContent: fileContent })]);
    return splitResult.map((part, index) => {
      const chunkId = `${path.basename(fileName, path.extname(fileName))}-part-${index + 1}`;
      return {
        projectId,
        name: chunkId,
        fileId,
        fileName,
        content: part.pageContent,
        summary: '',
        size: part.pageContent.length
      };
    });
  } else if (splitType === 'custom') {
    // 自定義符號分塊
    const customSeparator = taskConfig.customSeparator || '---';
    // 使用自定義分隔符分割文字，過濾掉空塊
    const splitResult = fileContent.split(customSeparator).filter(content => content.trim().length > 0);

    return splitResult.map((part, index) => {
      const chunkId = `${path.basename(fileName, path.extname(fileName))}-part-${index + 1}`;
      // 去除首尾空白字元
      const trimmedContent = part.trim();
      return {
        projectId,
        name: chunkId,
        fileId,
        fileName,
        content: trimmedContent,
        summary: '',
        size: trimmedContent.length
      };
    });
  } else {
    // 預設採用之前的分塊方法
    const splitResult = markdownSplitter.splitMarkdown(fileContent, minLength, maxLength);
    return splitResult.map((part, index) => {
      const chunkId = `${path.basename(fileName, path.extname(fileName))}-part-${index + 1}`;
      return {
        projectId,
        name: chunkId,
        fileId,
        fileName,
        content: part.content,
        summary: part.summary,
        size: part.content.length
      };
    });
  }
}

/**
 * 分割專案中的Markdown檔案
 * @param {string} projectId - 專案ID
 * @param {string} fileName - 檔名
 * @returns {Promise<Array>} - 分割結果陣列
 */
export async function splitProjectFile(projectId, file) {
  const { fileName, fileId } = file;
  try {
    // 獲取專案根目錄
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    let filePath = path.join(projectPath, 'files', fileName);

    if (!filePath.endsWith('.md')) {
      filePath = path.join(projectPath, 'files', fileName.replace(/\.[^/.]+$/, '.md'));
    }
    try {
      await fs.promises.access(filePath);
    } catch (error) {
      throw new Error(`檔案 ${fileName} 不存在`);
    }

    // 讀取檔案內容
    const fileContent = await fs.promises.readFile(filePath, 'utf8');

    // 儲存分割結果到chunks目錄
    const savedChunks = await splitFileByType({ projectPath, fileContent, fileName, projectId, fileId });
    await saveChunks(savedChunks);

    // 提取目錄結構（如果需要所有檔案的內容拼接後再提取目錄）
    const tocJSON = markdownSplitter.extractTableOfContents(fileContent);
    const toc = markdownSplitter.tocToMarkdown(tocJSON, { isNested: true });

    // 儲存目錄結構到單獨的toc資料夾
    const tocDir = path.join(projectPath, 'toc');
    await ensureDir(tocDir);
    const tocPath = path.join(tocDir, `${path.basename(fileName, path.extname(fileName))}-toc.json`);
    await fs.promises.writeFile(tocPath, JSON.stringify(tocJSON, null, 2));

    return {
      fileName,
      totalChunks: savedChunks.length,
      chunks: savedChunks,
      toc
    };
  } catch (error) {
    console.error('文字分割出錯:', error);
    throw error;
  }
}

/**
 * 獲取專案中的所有文字塊
 * @param {string} projectId - 專案ID
 * @returns {Promise<Array>} - 文字塊詳細資訊陣列
 */
export async function getProjectChunks(projectId, filter) {
  try {
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const tocDir = path.join(projectPath, 'toc');
    const project = await getProject(projectId);

    let chunks = await getChunkByProjectId(projectId, filter);
    // 讀取所有TOC檔案
    const tocByFile = {};
    let toc = '';
    try {
      await fs.promises.access(tocDir);
      const tocFiles = await fs.promises.readdir(tocDir);

      for (const tocFile of tocFiles) {
        if (tocFile.endsWith('-toc.json')) {
          const tocPath = path.join(tocDir, tocFile);
          const tocContent = await fs.promises.readFile(tocPath, 'utf8');
          const fileName = tocFile.replace('-toc.json', '.md');

          try {
            tocByFile[fileName] = JSON.parse(tocContent);
            toc += '### File：' + fileName + '\n';
            toc += markdownSplitter.tocToMarkdown(tocByFile[fileName], { isNested: true }) + '\n';
          } catch (e) {
            console.error(`解析TOC檔案 ${tocFile} 出錯:`, e);
          }
        }
      }
    } catch (error) {
      // TOC目錄不存在或讀取出錯，繼續處理
    }
    // 整合結果
    let fileResult = {
      fileName: project.name + '.md',
      totalChunks: chunks.length,
      chunks,
      toc
    };

    return {
      fileResult, // 單個檔案結果，而不是陣列
      chunks
    };
  } catch (error) {
    console.error('獲取文字塊出錯:', error);
    throw error;
  }
}

/**
 * 獲取專案中的所有目錄
 * @param {string} projectId - 專案ID
 */
export async function getProjectTocs(projectId) {
  try {
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const tocDir = path.join(projectPath, 'toc');

    // 讀取所有TOC檔案
    const tocByFile = {};
    let toc = '';
    try {
      await fs.promises.access(tocDir);
      const tocFiles = await fs.promises.readdir(tocDir);

      for (const tocFile of tocFiles) {
        if (tocFile.endsWith('-toc.json')) {
          const tocPath = path.join(tocDir, tocFile);
          const tocContent = await fs.promises.readFile(tocPath, 'utf8');
          const fileName = tocFile.replace('-toc.json', '.md');

          try {
            tocByFile[fileName] = JSON.parse(tocContent);
            toc += '### File：' + fileName + '\n';
            toc += markdownSplitter.tocToMarkdown(tocByFile[fileName], { isNested: true }) + '\n';
          } catch (e) {
            console.error(`解析TOC檔案 ${tocFile} 出錯:`, e);
          }
        }
      }
    } catch (error) {
      // TOC目錄不存在或讀取出錯，繼續處理
    }

    return toc;
  } catch (error) {
    console.error('獲取文字塊出錯:', error);
    throw error;
  }
}

/**
 * 指定檔案的目錄
 */
export async function getProjectTocByName(projectId, fileName) {
  try {
    console.log(`[getProjectTocByName] projectId: ${projectId}, fileName: ${fileName}`);
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const tocDir = path.join(projectPath, 'toc');
    console.log(`[getProjectTocByName] tocDir: ${tocDir}`);

    // 讀取所有TOC檔案
    const tocByFile = {};
    let toc = '';
    try {
      await fs.promises.access(tocDir);
      const tocFiles = await fs.promises.readdir(tocDir);
      console.log(`[getProjectTocByName] Found toc files:`, tocFiles);
      const targetTocFile = fileName.replace('.md', '') + '-toc.json';
      console.log(`[getProjectTocByName] Looking for target file: ${targetTocFile}`);

      for (const tocFile of tocFiles) {
        if (tocFile.endsWith(fileName.replace('.md', '') + '-toc.json')) {
          console.log(`[getProjectTocByName] Found matching file: ${tocFile}`);
          const tocPath = path.join(tocDir, tocFile);
          const tocContent = await fs.promises.readFile(tocPath, 'utf8');
          const currentFileName = tocFile.replace('-toc.json', '.md');

          try {
            tocByFile[currentFileName] = JSON.parse(tocContent);
            toc += '### File：' + currentFileName + '\n';
            toc += markdownSplitter.tocToMarkdown(tocByFile[currentFileName], { isNested: true }) + '\n';
          } catch (e) {
            console.error(`解析TOC檔案 ${tocFile} 出錯:`, e);
          }
        }
      }
    } catch (error) {
      // TOC目錄不存在或讀取出錯，繼續處理
    }

    return toc;
  } catch (error) {
    console.error('獲取文字塊出錯:', error);
    throw error;
  }
}
