/**
 * 資料蒸餾任務處理器
 * 負責非同步處理全自動蒸餾任務
 */

import { PrismaClient } from '@prisma/client';
import { updateTask } from './index';
import { getTaskConfig } from '@/lib/db/projects';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * 處理資料蒸餾任務
 * @param {Object} task 任務物件
 * @returns {Promise<void>}
 */
export async function processDataDistillationTask(task) {
  try {
    console.log(`Starting data distillation task: ${task.id}`);

    // 解析任務配置
    let taskNote;
    try {
      taskNote = JSON.parse(task.note);
    } catch (error) {
      throw new Error(`Failed to parse task config: ${error.message}`);
    }

    // 解析模型資訊
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse model info: ${error.message}`);
    }

    const {
      topic,
      levels,
      tagsPerLevel,
      questionsPerTag,
      datasetType = 'single-turn',
      estimatedTags,
      estimatedQuestions
    } = taskNote;

    const projectId = task.projectId;
    const language = task.language || 'zh';

    // 獲取專案配置
    const taskConfig = await getTaskConfig(projectId);
    const concurrencyLimit = taskConfig?.concurrencyLimit || 5;

    // 初始化進度統計
    let progress = {
      stage: 'initializing',
      tagsTotal: estimatedTags || 0,
      tagsBuilt: 0,
      questionsTotal: estimatedQuestions || 0,
      questionsBuilt: 0,
      datasetsTotal: estimatedQuestions || 0,
      datasetsBuilt: 0,
      multiTurnDatasetsTotal: datasetType === 'multi-turn' || datasetType === 'both' ? estimatedQuestions : 0,
      multiTurnDatasetsBuilt: 0
    };

    // 更新任務初始狀態
    await updateTask(task.id, {
      totalCount: estimatedQuestions,
      detail: `Starting tag tree build. Levels: ${levels}, tags per level: ${tagsPerLevel}, questions per tag: ${questionsPerTag}`
    });
    console.log(
      `[Data distillation task ${task.id}] Starting tag tree build. Levels: ${levels}, tags/level: ${tagsPerLevel}, questions/tag: ${questionsPerTag}`
    );

    // 階段1: 構建標籤樹
    await buildTagTree({
      taskId: task.id,
      projectId,
      topic,
      levels,
      tagsPerLevel,
      model: modelInfo,
      language,
      progress,
      concurrencyLimit
    });

    // 階段2: 生成問題
    await generateQuestionsForTags({
      taskId: task.id,
      projectId,
      levels,
      questionsPerTag,
      model: modelInfo,
      language,
      progress,
      concurrencyLimit
    });

    // 階段3: 生成資料集
    if (datasetType === 'single-turn' || datasetType === 'both') {
      await generateDatasetsForQuestions({
        taskId: task.id,
        projectId,
        model: modelInfo,
        language,
        progress,
        concurrencyLimit
      });
    }

    // 階段4: 生成多輪對話資料集
    if (datasetType === 'multi-turn' || datasetType === 'both') {
      await generateMultiTurnDatasetsForQuestions({
        taskId: task.id,
        projectId,
        model: modelInfo,
        language,
        progress,
        concurrencyLimit
      });
    }

    // 任務完成
    await updateTask(task.id, {
      status: 1,
      completedCount: progress.datasetsBuilt + progress.multiTurnDatasetsBuilt,
      detail: `Distillation completed: tags ${progress.tagsBuilt}/${progress.tagsTotal}, questions ${progress.questionsBuilt}/${progress.questionsTotal}, single-turn datasets ${progress.datasetsBuilt}/${progress.datasetsTotal}, multi-turn datasets ${progress.multiTurnDatasetsBuilt}/${progress.multiTurnDatasetsTotal}`,
      endTime: new Date()
    });

    console.log(`Data distillation task completed: ${task.id}`);
  } catch (error) {
    console.error('Data distillation task error:', error);
    await updateTask(task.id, {
      status: 2,
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`,
      endTime: new Date()
    });
  }
}

/**
 * 構建標籤樹
 */
async function buildTagTree({
  taskId,
  projectId,
  topic,
  levels,
  tagsPerLevel,
  model,
  language,
  progress,
  concurrencyLimit
}) {
  console.log(`[Task ${taskId}] Starting tag tree build (levels: ${levels}, tags/level: ${tagsPerLevel})`);

  // 更新任務狀態
  await updateTask(taskId, {
    detail: `Building tag tree (levels: ${levels})`
  });

  // 獲取專案名稱作為根標籤
  let projectName = topic;
  try {
    const projectResponse = await axios.get(`http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}`);
    if (projectResponse && projectResponse.data && projectResponse.data.name) {
      projectName = projectResponse.data.name;
      console.log(`[Task ${taskId}] Using project name as root tag: "${projectName}"`);
    }
  } catch (error) {
    console.warn(`[Task ${taskId}] Failed to fetch project name, using topic as default: ${error.message}`);
  }

  // 遞迴構建標籤樹
  const buildTagsForLevel = async (parentTag = null, parentTagPath = '', level = 1) => {
    // 檢查任務是否被中斷
    const latestTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (latestTask.status === 2 || latestTask.status === 3) {
      throw new Error('Task was interrupted');
    }

    if (level > levels) return;

    // 更新階段
    await updateTask(taskId, {
      detail: `Building level ${level} tags...`
    });

    // 獲取當前層級已有標籤
    let currentLevelTags = [];
    try {
      const response = await axios.get(
        `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/distill/tags/all`
      );
      if (parentTag) {
        currentLevelTags = response.data.filter(tag => tag.parentId === parentTag.id);
      } else {
        currentLevelTags = response.data.filter(tag => !tag.parentId);
      }
    } catch (error) {
      console.error(`[Task ${taskId}] Failed to fetch level ${level} tags:`, error.message);
      return;
    }

    // 計算需要建立的標籤數量
    const needToCreate = Math.max(0, tagsPerLevel - currentLevelTags.length);

    if (needToCreate > 0) {
      const parentTagName = level === 1 ? topic : parentTag?.label || '';
      let tagPathWithProjectName;
      if (level === 1) {
        tagPathWithProjectName = projectName;
      } else {
        if (!parentTagPath) {
          tagPathWithProjectName = projectName;
        } else if (!parentTagPath.startsWith(projectName)) {
          tagPathWithProjectName = `${projectName} > ${parentTagPath}`;
        } else {
          tagPathWithProjectName = parentTagPath;
        }
      }

      try {
        const response = await axios.post(
          `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/distill/tags`,
          {
            parentTag: parentTagName,
            parentTagId: parentTag ? parentTag.id : null,
            tagPath: tagPathWithProjectName || parentTagName,
            count: needToCreate,
            model,
            language
          }
        );

        // 更新進度
        progress.tagsBuilt += response.data.length;
        await updateTask(taskId, {
          detail: `Created ${progress.tagsBuilt}/${progress.tagsTotal} tags (level ${level})`
        });

        currentLevelTags = [...currentLevelTags, ...response.data];
      } catch (error) {
        console.error(`[Task ${taskId}] Failed to create level ${level} tags:`, error.message);
      }
    }

    // 遞迴構建下一層
    if (level < levels) {
      for (const tag of currentLevelTags) {
        let tagPath;
        if (parentTagPath) {
          tagPath = `${parentTagPath} > ${tag.label}`;
        } else {
          tagPath = `${projectName} > ${tag.label}`;
        }
        await buildTagsForLevel(tag, tagPath, level + 1);
      }
    }
  };

  // 從第一層開始構建
  await buildTagsForLevel();

  console.log(`[Task ${taskId}] Tag tree build completed: ${progress.tagsBuilt}/${progress.tagsTotal}`);
}

/**
 * 為標籤生成問題
 */
async function generateQuestionsForTags({
  taskId,
  projectId,
  levels,
  questionsPerTag,
  model,
  language,
  progress,
  concurrencyLimit
}) {
  console.log(`[Task ${taskId}] Starting question generation`);

  await updateTask(taskId, {
    detail: 'Generating questions for leaf tags...'
  });

  try {
    // 獲取專案名稱
    let projectName = '';
    try {
      const projectResponse = await axios.get(`http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}`);
      if (projectResponse && projectResponse.data && projectResponse.data.name) {
        projectName = projectResponse.data.name;
      }
    } catch (error) {
      console.warn(`[Task ${taskId}] Failed to fetch project name: ${error.message}`);
    }

    // 獲取所有標籤
    const response = await axios.get(
      `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/distill/tags/all`
    );
    const allTags = response.data;

    // 找出所有葉子標籤
    const childrenMap = {};
    allTags.forEach(tag => {
      if (tag.parentId) {
        if (!childrenMap[tag.parentId]) {
          childrenMap[tag.parentId] = [];
        }
        childrenMap[tag.parentId].push(tag);
      }
    });

    const leafTags = allTags.filter(tag => !childrenMap[tag.id] && getTagDepth(tag, allTags) === levels);

    // 獲取所有問題
    const questionsResponse = await axios.get(
      `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/questions/tree?isDistill=true`
    );
    const allQuestions = questionsResponse.data;

    // 更新總問題數量
    progress.questionsTotal = leafTags.length * questionsPerTag;

    // 準備生成任務
    const generateTasks = [];
    for (const tag of leafTags) {
      const tagPath = getTagPath(tag, allTags, projectName);
      const existingQuestions = allQuestions.filter(q => q.label === tag.label);
      const needToCreate = Math.max(0, questionsPerTag - existingQuestions.length);

      if (needToCreate > 0) {
        generateTasks.push({ tag, tagPath, needToCreate });
      }
    }

    console.log(`[Task ${taskId}] Generating ${progress.questionsTotal} questions for ${generateTasks.length} tags`);

    // 分批併發生成問題
    for (let i = 0; i < generateTasks.length; i += concurrencyLimit) {
      // 檢查任務是否被中斷
      const latestTask = await prisma.task.findUnique({ where: { id: taskId } });
      if (latestTask.status === 2 || latestTask.status === 3) {
        throw new Error('Task was interrupted');
      }

      const batch = generateTasks.slice(i, i + concurrencyLimit);

      await Promise.all(
        batch.map(async ({ tag, tagPath, needToCreate }) => {
          try {
            const response = await axios.post(
              `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/distill/questions`,
              {
                tagPath,
                currentTag: tag.label,
                tagId: tag.id,
                count: needToCreate,
                model,
                language
              }
            );

            progress.questionsBuilt += response.data.length;
            await updateTask(taskId, {
              detail: `[Data distillation task ${taskId}] Generated ${progress.questionsBuilt}/${progress.questionsTotal} questions`
            });
            console.log(
              `[Data distillation task ${taskId}] Generated ${progress.questionsBuilt}/${progress.questionsTotal} questions`
            );
          } catch (error) {
            console.error(`[Task ${taskId}] Failed to generate questions for tag "${tag.label}":`, error.message);
          }
        })
      );
    }
  } catch (error) {
    console.error(`[Task ${taskId}] Question generation failed:`, error.message);
    throw error;
  }

  console.log(`[Task ${taskId}] Question generation completed: ${progress.questionsBuilt}/${progress.questionsTotal}`);
}

/**
 * 為問題生成資料集
 */
async function generateDatasetsForQuestions({ taskId, projectId, model, language, progress, concurrencyLimit }) {
  console.log(`[Task ${taskId}] Starting single-turn dataset generation`);

  await updateTask(taskId, {
    detail: 'Generating single-turn datasets...'
  });

  try {
    // 獲取所有問題
    const response = await axios.get(
      `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/questions/tree?isDistill=true`
    );
    const allQuestions = response.data;

    // 找出未回答的問題
    const unansweredQuestions = allQuestions.filter(q => !q.answered);
    const answeredQuestions = allQuestions.filter(q => q.answered);

    // 更新資料集總數和已生成數量
    progress.datasetsTotal = allQuestions.length;
    progress.datasetsBuilt = answeredQuestions.length;

    if (unansweredQuestions.length === 0) {
      console.log(`[Task ${taskId}] All questions already have answers; skipping dataset generation`);
      return;
    }

    console.log(`[Task ${taskId}] Generating answers for ${unansweredQuestions.length} questions`);

    // 分批併發生成資料集
    for (let i = 0; i < unansweredQuestions.length; i += concurrencyLimit) {
      // 檢查任務是否被中斷
      const latestTask = await prisma.task.findUnique({ where: { id: taskId } });
      if (latestTask.status === 2 || latestTask.status === 3) {
        throw new Error('Task was interrupted');
      }

      const batch = unansweredQuestions.slice(i, i + concurrencyLimit);

      await Promise.all(
        batch.map(async question => {
          try {
            await axios.post(`http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/datasets`, {
              projectId,
              questionId: question.id,
              model,
              language: language || 'zh-CN'
            });

            progress.datasetsBuilt++;
            await updateTask(taskId, {
              completedCount: progress.datasetsBuilt,
              detail: `[Data distillation task ${taskId}] Generated ${progress.datasetsBuilt}/${progress.datasetsTotal} single-turn datasets`
            });
            console.log(`Generated ${progress.datasetsBuilt}/${progress.datasetsTotal} single-turn datasets`);
          } catch (error) {
            console.error(`[Task ${taskId}] Failed to generate dataset for question "${question.id}":`, error.message);
          }
        })
      );
    }
  } catch (error) {
    console.error(`[Task ${taskId}] Dataset generation failed:`, error.message);
    throw error;
  }

  console.log(
    `[Task ${taskId}] Single-turn dataset generation completed: ${progress.datasetsBuilt}/${progress.datasetsTotal}`
  );
}

/**
 * 為問題生成多輪對話資料集
 */
async function generateMultiTurnDatasetsForQuestions({
  taskId,
  projectId,
  model,
  language,
  progress,
  concurrencyLimit
}) {
  console.log(`[Task ${taskId}] Starting multi-turn dataset generation`);

  await updateTask(taskId, {
    detail: 'Generating multi-turn datasets...'
  });

  try {
    // 獲取專案的多輪對話配置
    const configResponse = await axios.get(
      `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/tasks`
    );
    const taskConfig = configResponse.data;

    const multiTurnConfig = {
      systemPrompt: taskConfig.multiTurnSystemPrompt || '',
      scenario: taskConfig.multiTurnScenario || '',
      rounds: taskConfig.multiTurnRounds || 3,
      roleA: taskConfig.multiTurnRoleA || '',
      roleB: taskConfig.multiTurnRoleB || ''
    };

    // 檢查配置
    if (!multiTurnConfig.scenario || !multiTurnConfig.roleA || !multiTurnConfig.roleB || !multiTurnConfig.rounds) {
      console.error(`[Task ${taskId}] Project is missing multi-turn config; skipping multi-turn generation`);
      throw new Error('Project is missing multi-turn config');
    }

    // 獲取所有已回答的問題
    const response = await axios.get(
      `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/questions/tree?isDistill=true`
    );
    const answeredQuestions = response.data;

    // 獲取已生成多輪對話的問題ID
    const conversationsResponse = await axios.get(
      `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/dataset-conversations?pageSize=1000`
    );
    const existingConversationIds = new Set(
      (conversationsResponse.data.conversations || []).map(conv => conv.questionId)
    );

    // 篩選需要生成多輪對話的問題
    const questionsForMultiTurn = answeredQuestions.filter(q => !existingConversationIds.has(q.id));

    // 更新多輪對話資料集總數和已生成數量
    progress.multiTurnDatasetsTotal = answeredQuestions.length;
    progress.multiTurnDatasetsBuilt = answeredQuestions.length - questionsForMultiTurn.length;

    if (questionsForMultiTurn.length === 0) {
      console.log(`[Task ${taskId}] All questions already have multi-turn conversations; skipping`);
      return;
    }

    console.log(`[Task ${taskId}] Generating multi-turn conversations for ${questionsForMultiTurn.length} questions`);

    // 分批併發生成 (併發數更低)
    const multiTurnConcurrency = Math.min(concurrencyLimit, 2);

    for (let i = 0; i < questionsForMultiTurn.length; i += multiTurnConcurrency) {
      // 檢查任務是否被中斷
      const latestTask = await prisma.task.findUnique({ where: { id: taskId } });
      if (latestTask.status === 2 || latestTask.status === 3) {
        throw new Error('Task was interrupted');
      }

      const batch = questionsForMultiTurn.slice(i, i + multiTurnConcurrency);

      await Promise.all(
        batch.map(async question => {
          try {
            await axios.post(
              `http://localhost:${process.env.PORT || 1717}/api/projects/${projectId}/dataset-conversations`,
              {
                questionId: question.id,
                ...multiTurnConfig,
                model,
                language
              }
            );

            progress.multiTurnDatasetsBuilt++;
            await updateTask(taskId, {
              completedCount: progress.multiTurnDatasetsBuilt,
              detail: `Generated ${progress.multiTurnDatasetsBuilt}/${progress.multiTurnDatasetsTotal} multi-turn datasets`
            });
            console.log(
              `Generated ${progress.multiTurnDatasetsBuilt}/${progress.multiTurnDatasetsTotal} multi-turn datasets`
            );
          } catch (error) {
            console.error(
              `[Task ${taskId}] Failed to generate multi-turn conversation for question "${question.id}":`,
              error.message
            );
          }
        })
      );
    }
  } catch (error) {
    console.error(`[Task ${taskId}] Multi-turn dataset generation failed:`, error.message);
    throw error;
  }

  console.log(
    `[Task ${taskId}] Multi-turn dataset generation completed: ${progress.multiTurnDatasetsBuilt}/${progress.multiTurnDatasetsTotal}`
  );
}

/**
 * 獲取標籤深度
 */
function getTagDepth(tag, allTags) {
  let depth = 1;
  let currentTag = tag;

  while (currentTag.parentId) {
    depth++;
    currentTag = allTags.find(t => t.id === currentTag.parentId);
    if (!currentTag) break;
  }

  return depth;
}

/**
 * 獲取標籤路徑
 */
function getTagPath(tag, allTags, projectName = '') {
  const path = [];
  let currentTag = tag;

  while (currentTag) {
    path.unshift(currentTag.label);
    if (currentTag.parentId) {
      currentTag = allTags.find(t => t.id === currentTag.parentId);
    } else {
      currentTag = null;
    }
  }

  // 如果有專案名稱且路徑不以專案名稱開頭,則新增
  if (projectName && path.length > 0 && path[0] !== projectName) {
    path.unshift(projectName);
  }

  return path.join(' > ');
}

export default {
  processDataDistillationTask
};
