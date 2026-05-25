/**
 * 多輪對話生成任務處理器
 * 負責非同步處理多輪對話生成任務，獲取所有未生成多輪對話的問題並批次處理
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import { generateMultiTurnConversation } from '@/lib/services/multi-turn/index';
import { getTaskConfig } from '@/lib/db/projects';
import { getAllDatasetConversations } from '@/lib/db/dataset-conversations';

const prisma = new PrismaClient();

/**
 * 處理多輪對話生成任務
 * 查詢未生成多輪對話的問題並批次處理
 * @param {Object} task 任務物件
 * @returns {Promise<void>}
 */
export async function processMultiTurnGenerationTask(task) {
  try {
    console.log(`Starting multi-turn generation task: ${task.id}`);
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse config: ${error.message}`);
    }

    // 從任務物件直接獲取專案 ID
    const projectId = task.projectId;
    const taskConfig = await getTaskConfig(projectId);
    const multiTurnConfig = taskConfig;

    // 1. 獲取專案中所有問題
    console.log(`Starting multi-turn generation for project ${projectId}`);
    const allQuestions = await prisma.questions.findMany({
      where: {
        projectId,
        imageId: null
      },
      select: {
        id: true,
        question: true,
        chunkId: true
      }
    });

    if (allQuestions.length === 0) {
      await updateTask(task.id, {
        status: 1, // 1 表示完成
        detail: 'No questions to process (requires questions with generated answers)',
        note: '',
        endTime: new Date()
      });
      return;
    }

    // 2. 獲取已生成多輪對話的問題ID
    const existingConversations = await getAllDatasetConversations(projectId);
    const existingQuestionIds = new Set(existingConversations.map(conv => conv.questionId));

    // 3. 篩選出未生成多輪對話的問題
    const questionsWithoutMultiTurn = allQuestions.filter(q => !existingQuestionIds.has(q.id));

    // 如果沒有需要處理的問題，直接完成任務
    if (questionsWithoutMultiTurn.length === 0) {
      await updateTask(task.id, {
        status: 1, // 1 表示完成
        detail: 'All questions already have multi-turn conversations',
        note: '',
        endTime: new Date()
      });
      return;
    }

    // 獲取任務配置，包括併發限制
    const concurrencyLimit = taskConfig.concurrencyLimit || 2; // 多輪對話生成較複雜，預設併發數較低

    // 更新任務總數
    const totalCount = questionsWithoutMultiTurn.length;
    await updateTask(task.id, {
      totalCount,
      detail: `Questions to process: ${totalCount}`,
      note: ''
    });

    // 4. 構建多輪對話配置
    const config = {
      systemPrompt: multiTurnConfig.multiTurnSystemPrompt || '',
      scenario: multiTurnConfig.multiTurnScenario || '學術討論',
      rounds: multiTurnConfig.multiTurnRounds || 3,
      roleA: multiTurnConfig.multiTurnRoleA || '使用者',
      roleB: multiTurnConfig.multiTurnRoleB || '助手',
      model: modelInfo,
      language: task.language
    };

    // 5. 批次處理每個問題
    let successCount = 0;
    let errorCount = 0;
    let totalConversations = 0;
    let latestTaskStatus = 0;

    // 單個問題處理函式
    const processQuestion = async question => {
      try {
        // 如果任務已經被標記為失敗或已中斷，不再繼續處理
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        // 呼叫單個多輪對話生成服務
        const result = await generateMultiTurnConversation(projectId, question.id, config);

        if (result.success) {
          console.log(`Multi-turn conversation generated for question ${question.id}`);
          successCount++;
          totalConversations += 1;
        } else {
          console.error(`Failed to generate multi-turn conversation for question ${question.id}:`, result.error);
          errorCount++;
        }

        // 更新任務進度
        const progressNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, conversations generated: ${totalConversations}`;
        console.log(progressNote);
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return {
          success: result.success,
          questionId: question.id,
          conversationCount: result.success ? 1 : 0
        };
      } catch (error) {
        console.error(`Error processing question ${question.id}:`, error);
        errorCount++;

        // 更新任務進度
        const progressNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, conversations generated: ${totalConversations}`;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return { success: false, questionId: question.id, error: error.message };
      }
    };

    // 並行處理所有問題，使用任務設定中的併發限制
    await processInParallel(questionsWithoutMultiTurn, processQuestion, concurrencyLimit, async (completed, total) => {
      console.log(`Multi-turn generation progress: ${completed}/${total}`);
    });

    if (!latestTaskStatus) {
      // 任務完成，更新狀態
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1; // 如果全部失敗，標記為失敗；否則標記為完成
      const finalNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, conversations generated: ${totalConversations}`;
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: '',
        note: finalNote,
        endTime: new Date()
      });
    }

    console.log(`Task completed: ${task.id}`);
  } catch (error) {
    console.error('Multi-turn generation task error:', error);
    await updateTask(task.id, {
      status: 2, // 2 表示失敗
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`,
      endTime: new Date()
    });
  }
}

export default {
  processMultiTurnGenerationTask
};
