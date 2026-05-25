'use client';

import axios from 'axios';

/**
 * 自動蒸餾服務
 */
class AutoDistillService {
  /**
   * 執行自動蒸館任務
   * @param {Object} config - 配置資訊
   * @param {string} config.projectId - 專案ID
   * @param {string} config.topic - 蒸館主題
   * @param {number} config.levels - 標籤層級
   * @param {number} config.tagsPerLevel - 每層標籤數量
   * @param {number} config.questionsPerTag - 每個標籤問題數量
   * @param {Object} config.model - 模型資訊
   * @param {string} config.language - 語言
   * @param {Function} config.onProgress - 進度回撥
   * @param {Function} config.onLog - 日誌回撥
   * @returns {Promise<void>}
   */
  async executeDistillTask(config) {
    const {
      projectId,
      topic,
      levels,
      tagsPerLevel,
      questionsPerTag,
      model,
      language,
      datasetType = 'single-turn', // 新增資料集型別
      concurrencyLimit = 5,
      onProgress,
      onLog
    } = config;

    // 專案名稱儲存，用於整個流程共享
    this.projectName = '';

    try {
      // 獲取專案名稱，只需獲取一次
      try {
        const projectResponse = await axios.get(`/api/projects/${projectId}`);
        if (projectResponse && projectResponse.data && projectResponse.data.name) {
          this.projectName = projectResponse.data.name;
          this.addLog(onLog, `Using project name "${this.projectName}" as the top-level tag`);
        } else {
          this.projectName = topic; // 如果無法獲取專案名稱，則使用主題作為預設值
          this.addLog(onLog, `Could not find project name, using topic "${topic}" as the top-level tag`);
        }
      } catch (error) {
        this.projectName = topic; // 出錯時使用主題作為預設值
        this.addLog(onLog, `Failed to get project name, using topic "${topic}" instead: ${error.message}`);
      }

      // 新增日誌
      this.addLog(
        onLog,
        `Starting to build tag tree for "${topic}", number of levels: ${levels}, tags per level: ${tagsPerLevel}, questions per tag: ${questionsPerTag}`
      );

      // 從根節點開始構建標籤樹
      await this.buildTagTree({
        projectId,
        topic,
        levels,
        tagsPerLevel,
        model,
        language,
        onProgress,
        onLog
      });

      // 所有標籤構建完成後，生成問題
      await this.generateQuestionsForTags({
        projectId,
        levels,
        questionsPerTag,
        model,
        language,
        concurrencyLimit,
        onProgress,
        onLog
      });

      // 根據資料集型別生成不同型別的資料集
      if (datasetType === 'single-turn') {
        // 只生成單輪對話資料集
        await this.generateDatasetsForQuestions({
          projectId,
          model,
          language,
          concurrencyLimit,
          onProgress,
          onLog
        });
      } else if (datasetType === 'multi-turn') {
        // 只生成多輪對話資料集
        await this.generateMultiTurnDatasetsForQuestions({
          projectId,
          model,
          language,
          concurrencyLimit,
          onProgress,
          onLog
        });
      } else if (datasetType === 'both') {
        // 先生成單輪對話資料集
        await this.generateDatasetsForQuestions({
          projectId,
          model,
          language,
          concurrencyLimit,
          onProgress,
          onLog
        });
        // 再生成多輪對話資料集
        await this.generateMultiTurnDatasetsForQuestions({
          projectId,
          model,
          language,
          concurrencyLimit,
          onProgress,
          onLog
        });
      }

      // 任務完成
      if (onProgress) {
        onProgress({
          stage: 'completed'
        });
      }

      this.addLog(onLog, 'Auto distillation task completed');
    } catch (error) {
      console.error('自動蒸餾任務執行失敗:', error);
      this.addLog(onLog, `Task execution error: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 構建標籤樹
   * @param {Object} config - 配置資訊
   * @param {string} config.projectId - 專案ID
   * @param {string} config.topic - 蒸館主題
   * @param {number} config.levels - 標籤層級
   * @param {number} config.tagsPerLevel - 每層標籤數量
   * @param {Object} config.model - 模型資訊
   * @param {string} config.language - 語言
   * @param {Function} config.onProgress - 進度回撥
   * @param {Function} config.onLog - 日誌回撥
   * @returns {Promise<void>}
   */
  async buildTagTree(config) {
    const { projectId, topic, levels, tagsPerLevel, model, language, onProgress, onLog } = config;

    // 使用已經獲取的專案名稱，如果未獲取到，則使用主題
    const projectName = this.projectName || topic;

    try {
      // 設定初始階段
      if (onProgress) {
        onProgress({
          stage: 'level1'
        });
      }

      // 獲取所有現有標籤
      let allTags = [];
      try {
        const response = await axios.get(`/api/projects/${projectId}/distill/tags/all`);
        allTags = response.data;
      } catch (error) {
        console.error('獲取標籤失敗:', error);
        this.addLog(onLog, `Failed to get tags: ${error.message}`);
        return;
      }

      // 獲取葉子節點總數，更新進度條
      const leafTags = Math.pow(tagsPerLevel, levels);
      if (onProgress) {
        onProgress({
          tagsTotal: leafTags
        });
      }

      // 批次構建標籤樹
      await this.batchBuildTagTree({
        projectId,
        topic,
        levels,
        tagsPerLevel,
        model,
        language,
        projectName,
        allTags,
        onProgress,
        onLog
      });
    } catch (error) {
      console.error('構建標籤樹失敗:', error);
      this.addLog(onLog, `Failed to build tag tree: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批次構建標籤樹
   * @param {Object} config - 配置資訊
   * @returns {Promise<void>}
   */
  async batchBuildTagTree(config) {
    const {
      projectId,
      topic,
      levels,
      tagsPerLevel,
      model,
      language,
      projectName,
      allTags: initialTags,
      onProgress,
      onLog
    } = config;

    // 建立一個本地標籤快取，避免頻繁請求伺服器
    let allTags = [...initialTags];

    // 構建父子關係對映
    const childrenMap = {};
    const parentMap = {};
    allTags.forEach(tag => {
      parentMap[tag.id] = tag;
      if (tag.parentId) {
        if (!childrenMap[tag.parentId]) {
          childrenMap[tag.parentId] = [];
        }
        childrenMap[tag.parentId].push(tag);
      }
    });

    // 按層級分組標籤，提高查詢效率
    const tagsByLevel = {};
    allTags.forEach(tag => {
      const depth = this.getTagDepth(tag, parentMap);
      if (!tagsByLevel[depth]) {
        tagsByLevel[depth] = [];
      }
      tagsByLevel[depth].push(tag);
    });

    // 批次建立各層級標籤
    for (let level = 1; level <= levels; level++) {
      // 設定當前階段
      if (onProgress) {
        onProgress({
          stage: `level${level}`
        });
      }

      // 確定當前層級的父標籤
      let parentTags = [];
      if (level === 1) {
        // 第一層標籤沒有父標籤
        parentTags = [null];
      } else {
        // 獲取上一層的標籤作為父標籤
        parentTags = tagsByLevel[level - 1] || [];
      }

      const batch = parentTags;
      const creationPromises = [];

      for (const parentTag of batch) {
        // 獲取當前父標籤下的子標籤
        let currentLevelTags = [];
        if (parentTag) {
          currentLevelTags = childrenMap[parentTag.id] || [];
        } else {
          // 根標籤（沒有父標籤的標籤）
          currentLevelTags = allTags.filter(tag => !tag.parentId);
        }

        // 計算需要建立的標籤數量
        const needToCreate = Math.max(0, tagsPerLevel - currentLevelTags.length);

        if (needToCreate > 0) {
          // 構建標籤路徑
          let tagPathWithProjectName;
          if (level === 1) {
            // 第一層使用專案名稱
            tagPathWithProjectName = projectName;
          } else {
            // 其他層構建完整路徑
            const parentTagName = parentTag?.label || '';
            const parentTagPath = this.getTagPath(parentTag, parentMap);

            if (!parentTagPath) {
              tagPathWithProjectName = projectName;
            } else if (!parentTagPath.startsWith(projectName)) {
              tagPathWithProjectName = `${projectName} > ${parentTagPath}`;
            } else {
              tagPathWithProjectName = parentTagPath;
            }
          }

          // 建立標籤的Promise
          const createPromise = axios
            .post(`/api/projects/${projectId}/distill/tags`, {
              parentTag: level === 1 ? topic : parentTag?.label || '',
              parentTagId: parentTag ? parentTag.id : null,
              tagPath: tagPathWithProjectName || (level === 1 ? projectName : ''),
              count: needToCreate,
              model,
              language
            })
            .then(response => {
              // 更新本地標籤快取
              const newTags = response.data;
              allTags = [...allTags, ...newTags];

              // 更新父子關係對映
              if (parentTag) {
                if (!childrenMap[parentTag.id]) {
                  childrenMap[parentTag.id] = [];
                }
                childrenMap[parentTag.id].push(...newTags);
              }

              // 更新父標籤對映
              newTags.forEach(tag => {
                parentMap[tag.id] = tag;
              });

              // 更新層級分組
              if (!tagsByLevel[level]) {
                tagsByLevel[level] = [];
              }
              tagsByLevel[level].push(...newTags);

              // 更新構建的標籤數量
              if (onProgress) {
                onProgress({
                  tagsBuilt: newTags.length,
                  updateType: 'increment'
                });
              }

              // 新增日誌
              this.addLog(
                onLog,
                `Successfully created ${newTags.length} tags: ${newTags.map(tag => `"${tag.label}"`).join(', ')}`
              );

              return newTags;
            })
            .catch(error => {
              console.error(`建立${level}級標籤失敗:`, error);
              this.addLog(onLog, `Failed to create ${level} level tags: ${error.message || 'Unknown error'}`);
              return [];
            });

          creationPromises.push(createPromise);
        }
      }

      // 並行執行當前批次的所有建立任務
      await Promise.all(creationPromises);
    }
  }

  /**
   * 為標籤生成問題
   * @param {Object} config - 配置資訊
   * @param {string} config.projectId - 專案ID
   * @param {number} config.levels - 標籤層級
   * @param {number} config.questionsPerTag - 每個標籤問題數量
   * @param {Object} config.model - 模型資訊
   * @param {string} config.language - 語言
   * @param {Function} config.onProgress - 進度回撥
   * @param {Function} config.onLog - 日誌回撥
   * @returns {Promise<void>}
   */
  async generateQuestionsForTags(config) {
    const { projectId, levels, questionsPerTag, model, language, concurrencyLimit = 5, onProgress, onLog } = config;

    // 設定當前階段
    if (onProgress) {
      onProgress({
        stage: 'questions'
      });
    }

    this.addLog(onLog, 'Tag tree built, starting to generate questions for leaf tags...');

    try {
      // 獲取所有標籤
      const response = await axios.get(`/api/projects/${projectId}/distill/tags/all`);
      const allTags = response.data;

      // 找出所有葉子標籤(沒有子標籤的標籤)
      const leafTags = [];

      // 建立一個對映表，記錄每個標籤的子標籤
      const childrenMap = {};
      const parentMap = {};
      allTags.forEach(tag => {
        parentMap[tag.id] = tag;
        if (tag.parentId) {
          if (!childrenMap[tag.parentId]) {
            childrenMap[tag.parentId] = [];
          }
          childrenMap[tag.parentId].push(tag);
        }
      });

      // 找出所有葉子標籤
      allTags.forEach(tag => {
        // 如果沒有子標籤，並且深度是最大層級，則為葉子標籤
        if (!childrenMap[tag.id] && this.getTagDepth(tag, parentMap) === levels) {
          leafTags.push(tag);
        }
      });

      this.addLog(onLog, `Found ${leafTags.length} leaf tags, starting to generate questions...`);

      // 獲取所有問題
      const questionsResponse = await axios.get(`/api/projects/${projectId}/questions/tree?isDistill=true`);
      const allQuestions = questionsResponse.data;

      // 更新總問題數量
      const totalQuestionsToGenerate = leafTags.length * questionsPerTag;
      if (onProgress) {
        onProgress({
          questionsTotal: totalQuestionsToGenerate
        });
      }

      // 準備併發任務
      const generateQuestionTasks = [];
      const processedTags = [];

      // 準備所有需要生成問題的葉子標籤任務
      for (const tag of leafTags) {
        // 獲取標籤路徑
        const tagPath = this.getTagPath(tag, parentMap);

        // 計算已有問題數量
        const existingQuestions = allQuestions.filter(q => q.label === tag.label);
        const needToCreate = Math.max(0, questionsPerTag - existingQuestions.length);

        if (needToCreate > 0) {
          // 只新增需要生成問題的標籤任務
          generateQuestionTasks.push({
            tag,
            tagPath,
            needToCreate
          });

          this.addLog(onLog, `Preparing to generate ${needToCreate} questions for tag "${tag.label}"...`);
        } else {
          this.addLog(
            onLog,
            `Tag "${tag.label}" already has ${existingQuestions.length} questions, no need to generate new questions`
          );
        }
      }

      // 分批執行生成問題任務，控制併發數
      this.addLog(
        onLog,
        `Total ${generateQuestionTasks.length} tags need questions, concurrency limit: ${concurrencyLimit}`
      );

      // 使用分組批次處理
      for (let i = 0; i < generateQuestionTasks.length; i += concurrencyLimit) {
        const batch = generateQuestionTasks.slice(i, i + concurrencyLimit);

        // 並行處理批次任務
        await Promise.all(
          batch.map(async task => {
            const { tag, tagPath, needToCreate } = task;

            this.addLog(onLog, `Generating ${needToCreate} questions for tag "${tag.label}"...`);

            try {
              const response = await axios.post(`/api/projects/${projectId}/distill/questions`, {
                tagPath,
                currentTag: tag.label,
                tagId: tag.id,
                count: needToCreate,
                model,
                language
              });

              // 更新生成的問題數量
              if (onProgress) {
                onProgress({
                  questionsBuilt: response.data.length,
                  updateType: 'increment'
                });
              }
              this.addLog(onLog, `Successfully generated ${response.data.length} questions for tag "${tag.label}"`);
            } catch (error) {
              console.error(`為標籤 "${tag.label}" 生成問題失敗:`, error);
              this.addLog(
                onLog,
                `Failed to generate questions for tag "${tag.label}": ${error.message || 'Unknown error'}`
              );
            }
          })
        );

        // 每完成一批，輸出一次進度日誌
        this.addLog(
          onLog,
          `Completed batch ${Math.min(i + concurrencyLimit, generateQuestionTasks.length)}/${generateQuestionTasks.length} of question generation`
        );
      }
    } catch (error) {
      console.error('獲取標籤失敗:', error);
      this.addLog(onLog, `Failed to get tags: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * 為問題生成資料集
   * @param {Object} config - 配置資訊
   * @param {string} config.projectId - 專案ID
   * @param {Object} config.model - 模型資訊
   * @param {string} config.language - 語言
   * @param {Function} config.onProgress - 進度回撥
   * @param {Function} config.onLog - 日誌回撥
   * @returns {Promise<void>}
   */
  async generateDatasetsForQuestions(config) {
    const { projectId, model, language, concurrencyLimit = 5, onProgress, onLog } = config;

    // 設定當前階段
    if (onProgress) {
      onProgress({
        stage: 'datasets'
      });
    }

    this.addLog(onLog, 'Question generation completed, starting to generate answers...');

    try {
      // 獲取所有問題
      const response = await axios.get(`/api/projects/${projectId}/questions/tree?isDistill=true`);
      const allQuestions = response.data;

      // 找出未回答的問題
      const unansweredQuestions = allQuestions.filter(q => !q.answered);
      const answeredQuestions = allQuestions.filter(q => q.answered);

      // 更新總資料集數量和已生成數量
      if (onProgress) {
        onProgress({
          datasetsTotal: allQuestions.length, // 總資料集數量應為總問題數量
          datasetsBuilt: answeredQuestions.length // 已生成的資料集數量即已回答的問題數量
        });
      }

      this.addLog(onLog, `Found ${unansweredQuestions.length} unanswered questions, preparing to generate answers...`);
      this.addLog(onLog, `Dataset generation concurrency limit: ${concurrencyLimit}`);

      // 分批處理未回答的問題，控制併發數
      for (let i = 0; i < unansweredQuestions.length; i += concurrencyLimit) {
        const batch = unansweredQuestions.slice(i, i + concurrencyLimit);

        // 並行處理批次任務
        await Promise.all(
          batch.map(async question => {
            const questionContent = `${question.label} 下的問題ID:${question.id}`;
            this.addLog(onLog, `Generating answer for "${questionContent}"...`);

            try {
              // 呼叫生成資料集的函式
              await this.generateSingleDataset({
                projectId,
                questionId: question.id,
                questionInfo: question,
                model,
                language
              });

              // 更新生成的資料集數量
              if (onProgress) {
                onProgress({
                  datasetsBuilt: 1,
                  updateType: 'increment'
                });
              }

              this.addLog(onLog, `Successfully generated answer for question "${questionContent}"`);
            } catch (error) {
              console.error(`Failed to generate dataset for question "${question.id}":`, error);
              this.addLog(
                onLog,
                `Failed to generate answer for question "${questionContent}": ${error.message || 'Unknown error'}`
              );
            }
          })
        );

        // 每完成一批，輸出一次進度日誌
        this.addLog(
          onLog,
          `Completed batch ${Math.min(i + concurrencyLimit, unansweredQuestions.length)}/${unansweredQuestions.length} of dataset generation`
        );
      }

      this.addLog(onLog, 'Dataset generation completed');
    } catch (error) {
      console.error('Dataset generation failed:', error);
      this.addLog(onLog, `Dataset generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 為問題生成多輪對話資料集
   */
  async generateMultiTurnDatasetsForQuestions(config) {
    const { projectId, model, language, concurrencyLimit = 2, onProgress, onLog } = config;

    // 設定當前階段
    if (onProgress) {
      onProgress({
        stage: 'multi-turn-datasets'
      });
    }

    this.addLog(onLog, 'Question generation completed, starting to generate multi-turn conversations...');

    try {
      // 獲取專案的多輪對話配置
      const configResponse = await axios.get(`/api/projects/${projectId}/tasks`);
      const taskConfig = configResponse.data;

      const multiTurnConfig = {
        systemPrompt: taskConfig.multiTurnSystemPrompt || '',
        scenario: taskConfig.multiTurnScenario || '',
        rounds: taskConfig.multiTurnRounds || 3,
        roleA: taskConfig.multiTurnRoleA || '',
        roleB: taskConfig.multiTurnRoleB || ''
      };

      // 檢查是否已配置必要的多輪對話設定
      if (
        !multiTurnConfig.scenario ||
        !multiTurnConfig.roleA ||
        !multiTurnConfig.roleB ||
        !multiTurnConfig.rounds ||
        multiTurnConfig.rounds < 1
      ) {
        throw new Error('專案未配置多輪對話引數，請先在專案設定中配置多輪對話相關引數');
      }

      // 獲取所有已回答的問題（多輪對話需要基於已有答案的問題）
      const response = await axios.get(`/api/projects/${projectId}/questions/tree?isDistill=true`);
      const allQuestions = response.data;
      const answeredQuestions = allQuestions;

      if (answeredQuestions.length === 0) {
        this.addLog(onLog, 'No answered questions found, skipping multi-turn conversation generation');
        return;
      }

      // 獲取已生成多輪對話的問題ID
      const conversationsResponse = await axios.get(`/api/projects/${projectId}/dataset-conversations?pageSize=1000`);
      const existingConversationIds = new Set(
        (conversationsResponse.data.conversations || []).map(conv => conv.questionId)
      );

      // 篩選未生成多輪對話的問題
      const questionsForMultiTurn = answeredQuestions.filter(q => !existingConversationIds.has(q.id));

      // 更新多輪對話資料集總數和已生成數量
      if (onProgress) {
        onProgress({
          multiTurnDatasetsTotal: answeredQuestions.length,
          multiTurnDatasetsBuilt: answeredQuestions.length - questionsForMultiTurn.length
        });
      }

      this.addLog(
        onLog,
        `Found ${questionsForMultiTurn.length} questions ready for multi-turn conversation generation...`
      );
      this.addLog(onLog, `Multi-turn generation concurrency limit: ${concurrencyLimit}`);

      // 分批處理未生成多輪對話的問題，控制併發數
      for (let i = 0; i < questionsForMultiTurn.length; i += concurrencyLimit) {
        const batch = questionsForMultiTurn.slice(i, i + concurrencyLimit);

        // 並行處理批次任務
        await Promise.all(
          batch.map(async question => {
            const questionContent = `${question.label} 下的問題ID:${question.id}`;
            this.addLog(onLog, `Generating multi-turn conversation for "${questionContent}"...`);

            try {
              // 呼叫生成多輪對話的函式
              await this.generateSingleMultiTurnDataset({
                projectId,
                questionId: question.id,
                questionInfo: question,
                model,
                language,
                multiTurnConfig
              });

              // 更新進度
              if (onProgress) {
                onProgress({
                  multiTurnDatasetsBuilt: 1,
                  updateType: 'increment'
                });
              }

              this.addLog(onLog, `Multi-turn conversation generated for "${questionContent}"`);
            } catch (error) {
              this.addLog(
                onLog,
                `Failed to generate multi-turn conversation for "${questionContent}": ${error.message}`
              );
            }
          })
        );
      }

      this.addLog(onLog, 'Multi-turn conversation generation completed');
    } catch (error) {
      console.error('Multi-turn dataset generation failed:', error);
      this.addLog(onLog, `Multi-turn dataset generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成單個問題的多輪對話資料集
   */
  async generateSingleMultiTurnDataset({ projectId, questionId, questionInfo, model, language, multiTurnConfig }) {
    try {
      const response = await axios.post(`/api/projects/${projectId}/dataset-conversations`, {
        questionId,
        ...multiTurnConfig,
        model,
        language
      });

      return response.data;
    } catch (error) {
      console.error('Failed to generate multi-turn dataset:', error);
      throw new Error(`Failed to generate multi-turn dataset: ${error.message}`);
    }
  }

  /**
   * 生成單個問題的資料集
   */
  async generateSingleDataset({ projectId, questionId, questionInfo, model, language }) {
    try {
      // 獲取問題資訊
      let question = questionInfo;
      if (!question) {
        const response = await axios.get(`/api/projects/${projectId}/questions/${questionId}`);
        question = response.data;
      }

      // 生成資料集
      const response = await axios.post(`/api/projects/${projectId}/datasets`, {
        projectId,
        questionId,
        model,
        language: language || 'zh-CN'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to generate dataset:', error);
      throw new Error(`Failed to generate dataset: ${error.message}`);
    }
  }

  /**
   * 獲取標籤深度
   * @param {Object} tag - 標籤資訊
   * @param {Object} parentMap - 父標籤對映
   * @returns {number} - 標籤深度
   */
  getTagDepth(tag, parentMap) {
    if (!tag) return 0;

    let depth = 1;
    let currentTag = tag;

    while (currentTag && currentTag.parentId) {
      depth++;
      currentTag = parentMap[currentTag.parentId];
    }

    return depth;
  }

  /**
   * 獲取標籤路徑，確保始終以專案名稱開頭
   * @param {Object|null} tag - 標籤物件
   * @param {Object} parentMap - 父標籤對映
   * @returns {string} 標籤路徑
   */
  getTagPath(tag, parentMap) {
    if (!tag) return '';

    // 使用已經獲取的專案名稱
    const projectName = this.projectName || '';

    // 構建標籤路徑
    const path = [];
    let currentTag = tag;

    while (currentTag) {
      path.unshift(currentTag.label);
      if (currentTag.parentId) {
        currentTag = parentMap[currentTag.parentId];
      } else {
        currentTag = null;
      }
    }

    // 確保路徑以專案名稱開頭
    if (projectName && path.length > 0 && path[0] !== projectName) {
      path.unshift(projectName);
    }

    return path.join(' > ');
  }

  /**
   * 新增日誌
   * @param {Function} onLog - 日誌回撥
   * @param {string} message - 日誌訊息
   */
  addLog(onLog, message) {
    if (onLog && typeof onLog === 'function') {
      onLog(message);
    }
  }
}

export const autoDistillService = new AutoDistillService();
export default autoDistillService;
