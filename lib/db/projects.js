'use server';

import fs from 'fs';
import path from 'path';
import { getProjectRoot, readJsonFile } from './base';
import { DEFAULT_SETTINGS } from '@/constant/setting';
import { db } from '@/lib/db/index';
import { nanoid } from 'nanoid';

// 建立新專案
export async function createProject(projectData) {
  try {
    let projectId = nanoid(12);
    const projectRoot = await getProjectRoot();
    const projectDir = path.join(projectRoot, projectId);
    // 建立專案目錄
    await fs.promises.mkdir(projectDir, { recursive: true });
    // 建立子目錄
    await fs.promises.mkdir(path.join(projectDir, 'files'), { recursive: true }); // 原始檔案
    return await db.projects.create({
      data: {
        id: projectId,
        name: projectData.name,
        description: projectData.description
      }
    });
  } catch (error) {
    console.error('Failed to create project in database');
    throw error;
  }
}

export async function isExistByName(name) {
  try {
    const count = await db.projects.count({
      where: {
        name: name
      }
    });
    return count > 0;
  } catch (error) {
    console.error('Failed to get project by name in database');
    throw error;
  }
}

// 獲取所有專案
export async function getProjects() {
  try {
    const projects = await db.projects.findMany({
      include: {
        _count: {
          select: {
            Datasets: true,
            Questions: true,
            ImageDatasets: true,
            EvalDatasets: true
          }
        }
      },
      orderBy: {
        createAt: 'desc'
      }
    });

    // 批次獲取每個專案的 Token 統計（使用聚合查詢最佳化效能）
    const projectIds = projects.map(p => p.id);

    const tokenStats = await db.llmUsageLogs.groupBy({
      by: ['projectId'],
      where: {
        projectId: {
          in: projectIds
        }
      },
      _sum: {
        inputTokens: true,
        outputTokens: true
      }
    });

    // 將 Token 統計對映到專案
    const tokenStatsMap = new Map(
      tokenStats.map(stat => [
        stat.projectId,
        {
          totalTokens: (stat._sum.inputTokens || 0) + (stat._sum.outputTokens || 0)
        }
      ])
    );

    // 合併資料
    return projects.map(project => ({
      ...project,
      totalTokens: tokenStatsMap.get(project.id)?.totalTokens || 0
    }));
  } catch (error) {
    console.error('Failed to get projects in database');
    throw error;
  }
}

// 獲取專案詳情
export async function getProject(projectId) {
  try {
    return await db.projects.findUnique({ where: { id: projectId } });
  } catch (error) {
    console.error('Failed to get project by id in database');
    throw error;
  }
}

// 更新專案配置
export async function updateProject(projectId, projectData) {
  try {
    delete projectData.projectId;
    return await db.projects.update({
      where: { id: projectId },
      data: { ...projectData }
    });
  } catch (error) {
    console.error('Failed to update project in database');
    throw error;
  }
}

// 刪除專案
export async function deleteProject(projectId) {
  try {
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    await db.projects.delete({ where: { id: projectId } });
    if (fs.existsSync(projectPath)) {
      await fs.promises.rm(projectPath, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
}

// 獲取任務配置
export async function getTaskConfig(projectId) {
  const projectRoot = await getProjectRoot();
  const projectPath = path.join(projectRoot, projectId);
  const taskConfigPath = path.join(projectPath, 'task-config.json');
  const taskData = await readJsonFile(taskConfigPath);
  if (!taskData) {
    return DEFAULT_SETTINGS;
  }
  return taskData;
}
