'use server';
import { db } from '@/lib/db/index';

/**
 * 獲取專案的自定義提示詞
 * @param {string} projectId 專案ID
 * @param {string} promptType 提示詞型別 (如: question, answer, label等)
 * @param {string} language 語言 (zh-TW, en)
 * @returns {Promise<Array>} 自定義提示詞列表
 */
export async function getCustomPrompts(projectId, promptType = null, language = null) {
  try {
    const where = {
      projectId,
      isActive: true
    };

    if (promptType) {
      where.promptType = promptType;
    }

    if (language) {
      where.language = language;
    }

    return await db.customPrompts.findMany({
      where,
      orderBy: {
        createAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Failed to get custom prompts:', error);
    throw error;
  }
}

/**
 * 獲取特定的自定義提示詞內容
 * @param {string} projectId 專案ID
 * @param {string} promptType 提示詞型別
 * @param {string} promptKey 提示詞鍵名
 * @param {string} language 語言
 * @returns {Promise<Object|null>} 自定義提示詞物件或null
 */
export async function getCustomPrompt(projectId, promptType, promptKey, language) {
  try {
    return await db.customPrompts.findUnique({
      where: {
        projectId_promptType_promptKey_language: {
          projectId,
          promptType,
          promptKey,
          language
        }
      }
    });
  } catch (error) {
    console.error('Failed to get custom prompt:', error);
    return null;
  }
}

/**
 * 儲存自定義提示詞
 * @param {string} projectId 專案ID
 * @param {string} promptType 提示詞型別
 * @param {string} promptKey 提示詞鍵名
 * @param {string} language 語言
 * @param {string} content 提示詞內容
 * @returns {Promise<Object>} 儲存後的提示詞物件
 */
export async function saveCustomPrompt(projectId, promptType, promptKey, language, content) {
  try {
    return await db.customPrompts.upsert({
      where: {
        projectId_promptType_promptKey_language: {
          projectId,
          promptType,
          promptKey,
          language
        }
      },
      update: {
        content,
        updateAt: new Date()
      },
      create: {
        projectId,
        promptType,
        promptKey,
        language,
        content
      }
    });
  } catch (error) {
    console.error('Failed to save custom prompt:', error);
    throw error;
  }
}

/**
 * 刪除自定義提示詞
 * @param {string} projectId 專案ID
 * @param {string} promptType 提示詞型別
 * @param {string} promptKey 提示詞鍵名
 * @param {string} language 語言
 * @returns {Promise<boolean>} 刪除成功返回true
 */
export async function deleteCustomPrompt(projectId, promptType, promptKey, language) {
  try {
    await db.customPrompts.delete({
      where: {
        projectId_promptType_promptKey_language: {
          projectId,
          promptType,
          promptKey,
          language
        }
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to delete custom prompt:', error);
    return false;
  }
}

/**
 * 批次儲存自定義提示詞
 * @param {string} projectId 專案ID
 * @param {Array} prompts 提示詞陣列
 * @returns {Promise<Array>} 儲存結果
 */
export async function batchSaveCustomPrompts(projectId, prompts) {
  try {
    const results = [];
    for (const prompt of prompts) {
      const { promptType, promptKey, language, content } = prompt;
      const result = await saveCustomPrompt(projectId, promptType, promptKey, language, content);
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error('Failed to batch save custom prompts:', error);
    throw error;
  }
}

/**
 * 啟用/停用自定義提示詞
 * @param {string} id 提示詞ID
 * @param {boolean} isActive 是否啟用
 * @returns {Promise<Object>} 更新後的提示詞物件
 */
export async function toggleCustomPrompt(id, isActive) {
  try {
    return await db.customPrompts.update({
      where: { id },
      data: { isActive, updateAt: new Date() }
    });
  } catch (error) {
    console.error('Failed to toggle custom prompt:', error);
    throw error;
  }
}

/**
 * 獲取所有可用的提示詞型別和鍵名資訊
 * @returns {Promise<Object>} 提示詞配置資訊
 */
export async function getPromptTemplates() {
  // 重新組織的提示詞分類配置
  return {
    generation: {
      displayName: {
        'zh-TW': '內容生成',
        en: 'Content Generation',
        tr: 'İçerik Üretimi'
      },
      prompts: {
        QUESTION_PROMPT: {
          name: '基礎問題生成',
          description:
            '根據文字內容生成高品質問題的基礎提示詞，變數：{{text}} 待生成問題的文字，{{textLength}} 文字字數，{{number}} 目標問題數量，可選 {{gaPrompt}} 用於體裁受眾增強',
          type: 'question'
        },
        QUESTION_PROMPT_EN: {
          name: 'Basic Question Generation',
          description:
            'Prompt for generating high-quality questions from text content in English. Variables: {{text}} source text, {{textLength}} text length, {{number}} question count, optional {{gaPrompt}} for GA enhancement',
          type: 'question'
        },
        QUESTION_PROMPT_TR: {
          name: 'Temel Soru Üretimi',
          description:
            'Metin içeriğinden yüksek kaliteli sorular üretmek için temel istem. Değişkenler: {{text}} kaynak metin, {{textLength}} metin uzunluğu, {{number}} soru sayısı, isteğe bağlı {{gaPrompt}} tür-kitle geliştirmesi',
          type: 'question'
        },
        ANSWER_PROMPT: {
          name: '基礎答案生成',
          description:
            '基於給定文字和問題生成準確答案的基礎提示詞，變數：{{text}} 參考文字，{{question}} 需要回答的問題，{{templatePrompt}} 問題模版提示詞，{{outputFormatPrompt}} 問題模版自定義輸出格式',
          type: 'answer'
        },
        ANSWER_PROMPT_EN: {
          name: 'Basic Answer Generation',
          description:
            'Prompt for generating accurate answers based on given text and questions in English. Variables: {{text}} reference text, {{question}} question to answer, {{templatePrompt}} question template prompt, {{outputFormatPrompt}} question template custom output format',
          type: 'answer'
        },
        ANSWER_PROMPT_TR: {
          name: 'Temel Cevap Üretimi',
          description:
            'Verilen metin ve sorulara dayalı doğru cevaplar üretmek için temel istem. Değişkenler: {{text}} referans metin, {{question}} cevaplanacak soru, {{templatePrompt}} soru şablonu istemi, {{outputFormatPrompt}} özel çıktı formatı',
          type: 'answer'
        },
        ENHANCED_ANSWER_PROMPT: {
          name: 'MGA增強答案生成',
          description:
            '結合體裁受眾資訊生成風格化答案的高階提示詞，變數：{{text}} 參考文字，{{question}} 原始問題，可選 {{gaPrompt}} 表示體裁受眾要求，{{templatePrompt}} 問題模版提示詞，{{outputFormatPrompt}} 問題模版自定義輸出格式',
          type: 'enhancedAnswer'
        },
        ENHANCED_ANSWER_PROMPT_EN: {
          name: 'MGA Enhanced Answer Generation',
          description:
            'Advanced prompt for generating stylized answers with GA information in English. Variables: {{text}} reference content, {{question}} original question, optional {{gaPrompt}} for GA adaptation, {{templatePrompt}} question template prompt, {{outputFormatPrompt}} question template custom output format',
          type: 'enhancedAnswer'
        },
        ENHANCED_ANSWER_PROMPT_TR: {
          name: 'MGA Geliştirilmiş Cevap Üretimi',
          description:
            'Tür-kitle bilgisiyle stilize cevaplar üretmek için gelişmiş istem. Değişkenler: {{text}} referans içerik, {{question}} orijinal soru, isteğe bağlı {{gaPrompt}} tür-kitle uyarlaması, {{templatePrompt}} soru şablonu istemi, {{outputFormatPrompt}} özel çıktı formatı',
          type: 'enhancedAnswer'
        },
        GA_GENERATION_PROMPT: {
          name: 'GA組合生成',
          description: '根據文字內容自動生成體裁受眾組合的提示詞，變數：{{text}} 原始文字',
          type: 'ga-generation'
        },
        GA_GENERATION_PROMPT_EN: {
          name: 'GA Pair Generation',
          description:
            'Prompt for automatically generating GA pairs from text content in English. Variable: {{text}} source text',
          type: 'ga-generation'
        },
        GA_GENERATION_PROMPT_TR: {
          name: 'Tür-Kitle Çifti Üretimi',
          description:
            'Metin içeriğinden otomatik tür-kitle çiftleri üretmek için istem. Değişken: {{text}} kaynak metin',
          type: 'ga-generation'
        },
        DISTILL_QUESTIONS_PROMPT: {
          name: '問題蒸餾生成',
          description:
            '基於特定標籤領域生成多樣化高品質問題的蒸餾提示詞，變數：{{currentTag}} 當前標籤，{{tagPath}} 標籤完整鏈路，{{count}} 目標問題數，可選 {{existingQuestions}} 用於避免重複',
          type: 'distillQuestions'
        },
        DISTILL_QUESTIONS_PROMPT_EN: {
          name: 'Question Distillation',
          description:
            'Distillation prompt for generating questions for tag domains in English. Variables: {{currentTag}} current tag, {{tagPath}} tag path, {{count}} question count, optional {{existingQuestionsText}} for deduplication',
          type: 'distillQuestions'
        },
        DISTILL_QUESTIONS_PROMPT_TR: {
          name: 'Soru Damıtma',
          description:
            'Etiket alanları için çeşitli sorular üretmek için damıtma istemi. Değişkenler: {{currentTag}} mevcut etiket, {{tagPath}} etiket yolu, {{count}} soru sayısı, isteğe bağlı {{existingQuestionsText}} tekrardan kaçınma',
          type: 'distillQuestions'
        },
        ASSISTANT_REPLY_PROMPT: {
          name: '多輪對話回覆生成',
          description:
            '生成多輪對話中助手角色回覆的提示詞，變數：{{scenario}} 對話場景，{{roleA}} 提問者角色，{{roleB}} 回答者角色，{{chunkContent}} 原始文字，{{conversationHistory}} 對話歷史，{{currentRound}} 當前輪次，{{totalRounds}} 總輪次',
          type: 'multiTurnConversation'
        },
        ASSISTANT_REPLY_PROMPT_EN: {
          name: 'Multi-turn Conversation Reply Generation',
          description:
            'Prompt for generating assistant role replies in multi-turn conversations. Variables: {{scenario}} conversation scenario, {{roleA}} questioner role, {{roleB}} responder role, {{chunkContent}} original text, {{conversationHistory}} conversation history, {{currentRound}} current round, {{totalRounds}} total rounds',
          type: 'multiTurnConversation'
        },
        ASSISTANT_REPLY_PROMPT_TR: {
          name: 'Çok Turlu Konuşma Yanıt Üretimi',
          description:
            'Çok turlu konuşmalarda asistan rolü yanıtları üretmek için istem. Değişkenler: {{scenario}} konuşma senaryosu, {{roleA}} soran rolü, {{roleB}} yanıtlayan rolü, {{chunkContent}} orijinal metin, {{conversationHistory}} konuşma geçmişi, {{currentRound}} mevcut tur, {{totalRounds}} toplam tur',
          type: 'multiTurnConversation'
        },
        NEXT_QUESTION_PROMPT: {
          name: '多輪對話問題生成',
          description:
            '基於對話歷史生成下一輪問題的提示詞，變數：{{scenario}} 對話場景，{{roleA}} 提問者角色，{{roleB}} 回答者角色，{{chunkContent}} 原始文字，{{conversationHistory}} 對話歷史，{{nextRound}} 下一輪次，{{totalRounds}} 總輪次',
          type: 'multiTurnConversation'
        },
        NEXT_QUESTION_PROMPT_EN: {
          name: 'Multi-turn Conversation Question Generation',
          description:
            'Prompt for generating next round questions based on conversation history. Variables: {{scenario}} conversation scenario, {{roleA}} questioner role, {{roleB}} responder role, {{chunkContent}} original text, {{conversationHistory}} conversation history, {{nextRound}} next round, {{totalRounds}} total rounds',
          type: 'multiTurnConversation'
        },
        NEXT_QUESTION_PROMPT_TR: {
          name: 'Çok Turlu Konuşma Soru Üretimi',
          description:
            'Konuşma geçmişine dayalı sonraki tur soruları üretmek için istem. Değişkenler: {{scenario}} konuşma senaryosu, {{roleA}} soran rolü, {{roleB}} yanıtlayan rolü, {{chunkContent}} orijinal metin, {{conversationHistory}} konuşma geçmişi, {{nextRound}} sonraki tur, {{totalRounds}} toplam tur',
          type: 'multiTurnConversation'
        },
        IMAGE_QUESTION_PROMPT: {
          name: '影像問題生成',
          description:
            '基於影像內容生成高品質問題的專業提示詞，用於構建視覺問答訓練資料集。變數：{{number}} 目標問題數量',
          type: 'imageQuestion'
        },
        IMAGE_QUESTION_PROMPT_EN: {
          name: 'Image Question Generation',
          description:
            'Professional prompt for generating high-quality questions based on image content for visual question-answering training datasets. Variables: {{number}} target question count',
          type: 'imageQuestion'
        },
        IMAGE_QUESTION_PROMPT_TR: {
          name: 'Görsel Soru Üretimi',
          description:
            'Görsel soru-cevap eğitim veri setleri için görsel içeriğe dayalı yüksek kaliteli sorular üretmek için profesyonel istem. Değişkenler: {{number}} hedef soru sayısı',
          type: 'imageQuestion'
        },
        IMAGE_ANSWER_PROMPT: {
          name: '影像答案生成',
          description:
            '基於影像內容回答問題並生成答案的提示詞（用於生成影像問答資料集）。變數：{{question}} 題目內容，可選 {{templatePrompt}}/{{outputFormatPrompt}} 用於問題模版與輸出格式',
          type: 'imageAnswer'
        },
        IMAGE_ANSWER_PROMPT_EN: {
          name: 'Image Answer Generation',
          description:
            'Prompt for answering questions based on image content (used for generating image QA datasets). Variables: {{question}} question, optional {{templatePrompt}}/{{outputFormatPrompt}} for template and output format',
          type: 'imageAnswer'
        },
        IMAGE_ANSWER_PROMPT_TR: {
          name: 'Görsel Cevap Üretimi',
          description:
            'Görsel içeriğe dayalı soruları yanıtlamak için istem (görsel S&C veri setleri üretmek için). Değişkenler: {{question}} soru, isteğe bağlı {{templatePrompt}}/{{outputFormatPrompt}} şablon ve çıktı formatı',
          type: 'imageAnswer'
        }
      }
    },
    labeling: {
      displayName: {
        'zh-TW': '標籤管理',
        en: 'Label Management',
        tr: 'Etiket Yönetimi'
      },
      prompts: {
        LABEL_PROMPT: {
          name: '領域樹生成',
          description: '根據文件目錄結構自動生成領域分類標籤樹的提示詞，變數：{{text}} 待分析目錄文字',
          type: 'label'
        },
        LABEL_PROMPT_EN: {
          name: 'Domain Tree Generation',
          description:
            'Prompt for generating domain label tree from document structure in English. Variable: {{text}} catalog content',
          type: 'label'
        },
        LABEL_PROMPT_TR: {
          name: 'Alan Ağacı Üretimi',
          description:
            'Belge yapısından alan sınıflandırma etiket ağacı üretmek için istem. Değişken: {{text}} katalog içeriği',
          type: 'label'
        },
        ADD_LABEL_PROMPT: {
          name: '問題標籤匹配',
          description:
            '為生成的問題匹配最合適領域標籤的智慧匹配提示詞，變數：{{label}} 標籤陣列，{{question}} 問題陣列',
          type: 'addLabel'
        },
        ADD_LABEL_PROMPT_EN: {
          name: 'Question Label Matching',
          description:
            'Intelligent matching prompt for assigning domain labels to questions in English. Variables: {{label}} label list, {{question}} question list',
          type: 'addLabel'
        },
        ADD_LABEL_PROMPT_TR: {
          name: 'Soru Etiket Eşleştirme',
          description:
            'Sorulara alan etiketleri atamak için akıllı eşleştirme istemi. Değişkenler: {{label}} etiket listesi, {{question}} soru listesi',
          type: 'addLabel'
        },
        LABEL_REVISE_PROMPT: {
          name: '領域樹修訂',
          description:
            '在內容變化時對現有領域樹進行增量修訂的提示詞，變數：{{existingTags}} 現有標籤樹，{{text}} 最新目錄彙總，可選 {{deletedContent}}/{{newContent}} 表示刪除或新增內容',
          type: 'labelRevise'
        },
        LABEL_REVISE_PROMPT_EN: {
          name: 'Domain Tree Revision',
          description:
            'Prompt for incrementally revising domain tree in English environment. Variables: {{existingTags}} current tag tree, {{text}} combined TOC, optional {{deletedContent}}/{{newContent}} blocks',
          type: 'labelRevise'
        },
        LABEL_REVISE_PROMPT_TR: {
          name: 'Alan Ağacı Revizyonu',
          description:
            'İçerik değişikliklerinde mevcut alan ağacını artımlı olarak revize etmek için istem. Değişkenler: {{existingTags}} mevcut etiket ağacı, {{text}} birleştirilmiş içindekiler, isteğe bağlı {{deletedContent}}/{{newContent}} blokları',
          type: 'labelRevise'
        },
        DISTILL_TAGS_PROMPT: {
          name: '標籤蒸餾生成',
          description:
            '基於現有標籤體系生成更細粒度子標籤的蒸餾提示詞，變數：{{parentTag}} 當前父標籤，{{path}}/{{tagPath}} 標籤鏈路，{{count}} 子標籤數量，可選 {{existingTagsText}} 表示已有子標籤',
          type: 'distillTags'
        },
        DISTILL_TAGS_PROMPT_EN: {
          name: 'Tag Distillation',
          description:
            'Distillation prompt for generating sub-tags based on tag system in English. Variables: {{parentTag}} parent tag, {{path}}/{{tagPath}} hierarchy path, {{count}} target number, optional {{existingTagsText}} existing sub-tags',
          type: 'distillTags'
        },
        DISTILL_TAGS_PROMPT_TR: {
          name: 'Etiket Damıtma',
          description:
            'Etiket sistemine dayalı alt etiketler üretmek için damıtma istemi. Değişkenler: {{parentTag}} üst etiket, {{path}}/{{tagPath}} hiyerarşi yolu, {{count}} hedef sayı, isteğe bağlı {{existingTagsText}} mevcut alt etiketler',
          type: 'distillTags'
        }
      }
    },
    optimization: {
      displayName: {
        'zh-TW': '內容最佳化',
        en: 'Content Optimization',
        tr: 'İçerik Optimizasyonu'
      },
      prompts: {
        NEW_ANSWER_PROMPT: {
          name: '答案最佳化重寫',
          description:
            '根據使用者反饋建議對答案進行最佳化重寫的提示詞，變數：{{chunkContent}} 原始文字塊，{{question}} 原始問題，{{answer}} 待最佳化答案，{{cot}} 待最佳化思維鏈，{{advice}} 最佳化建議',
          type: 'newAnswer'
        },
        NEW_ANSWER_PROMPT_EN: {
          name: 'Answer Optimization Rewrite',
          description:
            'Prompt for optimizing and rewriting answers based on feedback in English. Variables: {{chunkContent}} original chunk, {{question}} question, {{answer}} answer, {{cot}} chain of thought, {{advice}} feedback',
          type: 'newAnswer'
        },
        NEW_ANSWER_PROMPT_TR: {
          name: 'Cevap Optimizasyon Yeniden Yazımı',
          description:
            'Geri bildirime dayalı cevapları optimize edip yeniden yazmak için istem. Değişkenler: {{chunkContent}} orijinal parça, {{question}} soru, {{answer}} cevap, {{cot}} düşünce zinciri, {{advice}} geri bildirim',
          type: 'newAnswer'
        },
        OPTIMIZE_COT_PROMPT: {
          name: '思維鏈最佳化',
          description:
            '最佳化答案中思維鏈推理過程和邏輯結構的提示詞，變數：{{originalQuestion}} 原始問題，{{answer}} 答案，{{originalCot}} 原始思維鏈',
          type: 'optimizeCot'
        },
        OPTIMIZE_COT_PROMPT_EN: {
          name: 'Chain-of-Thought Optimization',
          description:
            'Prompt for optimizing chain-of-thought reasoning process in English. Variables: {{originalQuestion}} question, {{answer}} answer, {{originalCot}} original chain of thought',
          type: 'optimizeCot'
        },
        OPTIMIZE_COT_PROMPT_TR: {
          name: 'Düşünce Zinciri Optimizasyonu',
          description:
            'Düşünce zinciri akıl yürütme sürecini optimize etmek için istem. Değişkenler: {{originalQuestion}} soru, {{answer}} cevap, {{originalCot}} orijinal düşünce zinciri',
          type: 'optimizeCot'
        }
      }
    },
    processing: {
      displayName: {
        'zh-TW': '資料處理',
        en: 'Data Processing',
        tr: 'Veri İşleme'
      },
      prompts: {
        DATA_CLEAN_PROMPT: {
          name: '文字資料清洗',
          description: '清理和標準化原始文字資料格式的提示詞，變數：{{text}} 需清洗文字，{{textLength}} 文字字數',
          type: 'dataClean'
        },
        DATA_CLEAN_PROMPT_EN: {
          name: 'Text Data Cleaning',
          description:
            'Prompt for cleaning and standardizing text data in English environment. Variables: {{text}} text to clean, {{text.length}} length placeholder',
          type: 'dataClean'
        },
        DATA_CLEAN_PROMPT_TR: {
          name: 'Metin Veri Temizleme',
          description:
            'Metin verilerini temizlemek ve standartlaştırmak için istem. Değişkenler: {{text}} temizlenecek metin, {{text.length}} uzunluk yer tutucusu',
          type: 'dataClean'
        }
      }
    },
    evaluation: {
      displayName: {
        'zh-TW': '品質評估',
        en: 'Quality Evaluation',
        tr: 'Kalite Değerlendirme'
      },
      prompts: {
        DATASET_EVALUATION_PROMPT: {
          name: '資料集品質評估',
          description:
            '對問答資料集進行多維度品質評估的專業提示詞，變數：{{chunkContent}} 原始文字塊內容，{{question}} 問題，{{answer}} 答案',
          type: 'datasetEvaluation'
        },
        DATASET_EVALUATION_PROMPT_EN: {
          name: 'Dataset Quality Evaluation',
          description:
            'Professional prompt for multi-dimensional quality evaluation of Q&A datasets. Variables: {{chunkContent}} original text chunk, {{question}} question, {{answer}} answer',
          type: 'datasetEvaluation'
        },
        DATASET_EVALUATION_PROMPT_TR: {
          name: 'Veri Seti Kalite Değerlendirmesi',
          description:
            'S&C veri setlerinin çok boyutlu kalite değerlendirmesi için profesyonel istem. Değişkenler: {{chunkContent}} orijinal metin parçası, {{question}} soru, {{answer}} cevap',
          type: 'datasetEvaluation'
        }
      }
    },
    modelEvaluation: {
      displayName: {
        'zh-TW': '模型評估',
        en: 'Model Evaluation',
        tr: 'Model Değerlendirme'
      },
      prompts: {
        // 評估題目生成
        EVAL_TRUE_FALSE_PROMPT: {
          name: '生成評估資料集（判斷題）',
          description:
            '根據文字內容生成是否判斷題用於評估模型，變數：{{text}} 待分析文字，{{textLength}} 文字字數，{{number}} 題目數量',
          type: 'evalQuestion'
        },
        EVAL_TRUE_FALSE_PROMPT_EN: {
          name: 'True/False Question Generation',
          description:
            'Generate true/false questions for model evaluation. Variables: {{text}} source text, {{textLength}} text length, {{number}} question count',
          type: 'evalQuestion'
        },
        EVAL_TRUE_FALSE_PROMPT_TR: {
          name: 'Doğru/Yanlış Soru Üretimi',
          description:
            'Model değerlendirmesi için doğru/yanlış soruları üretme. Değişkenler: {{text}} kaynak metin, {{textLength}} metin uzunluğu, {{number}} soru sayısı',
          type: 'evalQuestion'
        },
        EVAL_SINGLE_CHOICE_PROMPT: {
          name: '生成評估資料集（單選題）',
          description:
            '根據文字內容生成單選題用於評估模型，變數：{{text}} 待分析文字，{{textLength}} 文字字數，{{number}} 題目數量',
          type: 'evalQuestion'
        },
        EVAL_SINGLE_CHOICE_PROMPT_EN: {
          name: 'Single Choice Question Generation',
          description:
            'Generate single-choice questions for model evaluation. Variables: {{text}} source text, {{textLength}} text length, {{number}} question count',
          type: 'evalQuestion'
        },
        EVAL_SINGLE_CHOICE_PROMPT_TR: {
          name: 'Tek Seçenekli Soru Üretimi',
          description:
            'Model değerlendirmesi için tek seçenekli sorular üretme. Değişkenler: {{text}} kaynak metin, {{textLength}} metin uzunluğu, {{number}} soru sayısı',
          type: 'evalQuestion'
        },
        EVAL_MULTIPLE_CHOICE_PROMPT: {
          name: '生成評估資料集（多選題）',
          description:
            '根據文字內容生成多選題用於評估模型，變數：{{text}} 待分析文字，{{textLength}} 文字字數，{{number}} 題目數量',
          type: 'evalQuestion'
        },
        EVAL_MULTIPLE_CHOICE_PROMPT_EN: {
          name: 'Multiple Choice Question Generation',
          description:
            'Generate multiple-choice questions for model evaluation. Variables: {{text}} source text, {{textLength}} text length, {{number}} question count',
          type: 'evalQuestion'
        },
        EVAL_MULTIPLE_CHOICE_PROMPT_TR: {
          name: 'Çoktan Seçmeli Soru Üretimi',
          description:
            'Model değerlendirmesi için çoktan seçmeli sorular üretme. Değişkenler: {{text}} kaynak metin, {{textLength}} metin uzunluğu, {{number}} soru sayısı',
          type: 'evalQuestion'
        },
        EVAL_SHORT_ANSWER_PROMPT: {
          name: '生成評估資料集（短答案）',
          description:
            '根據文字內容生成短答案題用於評估模型，變數：{{text}} 待分析文字，{{textLength}} 文字字數，{{number}} 題目數量',
          type: 'evalQuestion'
        },
        EVAL_SHORT_ANSWER_PROMPT_EN: {
          name: 'Short Answer Question Generation',
          description:
            'Generate short-answer questions for model evaluation. Variables: {{text}} source text, {{textLength}} text length, {{number}} question count',
          type: 'evalQuestion'
        },
        EVAL_SHORT_ANSWER_PROMPT_TR: {
          name: 'Kısa Cevap Soru Üretimi',
          description:
            'Model değerlendirmesi için kısa cevap soruları üretme. Değişkenler: {{text}} kaynak metin, {{textLength}} metin uzunluğu, {{number}} soru sayısı',
          type: 'evalQuestion'
        },
        EVAL_OPEN_ENDED_PROMPT: {
          name: '生成評估資料集（開放問題）',
          description:
            '根據文字內容生成開放式問題用於評估模型，變數：{{text}} 待分析文字，{{textLength}} 文字字數，{{number}} 題目數量',
          type: 'evalQuestion'
        },
        EVAL_OPEN_ENDED_PROMPT_EN: {
          name: 'Open-ended Question Generation',
          description:
            'Generate open-ended questions for model evaluation. Variables: {{text}} source text, {{textLength}} text length, {{number}} question count',
          type: 'evalQuestion'
        },
        EVAL_OPEN_ENDED_PROMPT_TR: {
          name: 'Açık Uçlu Soru Üretimi',
          description:
            'Model değerlendirmesi için açık uçlu sorular üretme. Değişkenler: {{text}} kaynak metin, {{textLength}} metin uzunluğu, {{number}} soru sayısı',
          type: 'evalQuestion'
        },
        // 模型答題提示詞
        TRUE_FALSE_ANSWER_PROMPT: {
          name: '執行測評（判斷題）',
          description: '模型回答是否判斷題的提示詞，變數：{{question}} 題目內容，輸出格式：✅ 或 ❌',
          type: 'modelEvaluation'
        },
        TRUE_FALSE_ANSWER_PROMPT_EN: {
          name: 'True/False Question Answering',
          description:
            'Prompt for model to answer true/false questions. Variables: {{question}} question content, output format: ✅ or ❌',
          type: 'modelEvaluation'
        },
        TRUE_FALSE_ANSWER_PROMPT_TR: {
          name: 'Doğru/Yanlış Soru Yanıtlama',
          description:
            'Modelin doğru/yanlış sorularını yanıtlaması için istem. Değişkenler: {{question}} soru içeriği, çıktı formatı: ✅ veya ❌',
          type: 'modelEvaluation'
        },
        SINGLE_CHOICE_ANSWER_PROMPT: {
          name: '執行測評（單選題）',
          description:
            '模型回答單選題的提示詞，變數：{{question}} 題目內容，{{options}} 選項列表，輸出格式：選項字母（A/B/C/D）',
          type: 'modelEvaluation'
        },
        SINGLE_CHOICE_ANSWER_PROMPT_EN: {
          name: 'Single Choice Question Answering',
          description:
            'Prompt for model to answer single-choice questions. Variables: {{question}} question content, {{options}} options list, output format: option letter (A/B/C/D)',
          type: 'modelEvaluation'
        },
        SINGLE_CHOICE_ANSWER_PROMPT_TR: {
          name: 'Tek Seçenekli Soru Yanıtlama',
          description:
            'Modelin tek seçenekli soruları yanıtlaması için istem. Değişkenler: {{question}} soru içeriği, {{options}} seçenek listesi, çıktı formatı: seçenek harfi (A/B/C/D)',
          type: 'modelEvaluation'
        },
        MULTIPLE_CHOICE_ANSWER_PROMPT: {
          name: '執行測評（多選題）',
          description:
            '模型回答多選題的提示詞，變數：{{question}} 題目內容，{{options}} 選項列表，輸出格式：JSON陣列如["A", "C"]',
          type: 'modelEvaluation'
        },
        MULTIPLE_CHOICE_ANSWER_PROMPT_EN: {
          name: 'Multiple Choice Question Answering',
          description:
            'Prompt for model to answer multiple-choice questions. Variables: {{question}} question content, {{options}} options list, output format: JSON array like ["A", "C"]',
          type: 'modelEvaluation'
        },
        MULTIPLE_CHOICE_ANSWER_PROMPT_TR: {
          name: 'Çoktan Seçmeli Soru Yanıtlama',
          description:
            'Modelin çoktan seçmeli soruları yanıtlaması için istem. Değişkenler: {{question}} soru içeriği, {{options}} seçenek listesi, çıktı formatı: JSON dizisi ["A", "C"] gibi',
          type: 'modelEvaluation'
        },
        SHORT_ANSWER_PROMPT: {
          name: '執行測評（短答案）',
          description: '模型回答短答案題的提示詞，變數：{{question}} 題目內容，要求極短答案（詞/短語/數字/單句）',
          type: 'modelEvaluation'
        },
        SHORT_ANSWER_PROMPT_EN: {
          name: 'Short Answer Question Answering',
          description:
            'Prompt for model to answer short-answer questions. Variables: {{question}} question content, requires ultra-short answer (word/phrase/number/sentence)',
          type: 'modelEvaluation'
        },
        SHORT_ANSWER_PROMPT_TR: {
          name: 'Kısa Cevap Soru Yanıtlama',
          description:
            'Modelin kısa cevap sorularını yanıtlaması için istem. Değişkenler: {{question}} soru içeriği, çok kısa cevap gerektirir (kelime/ifade/sayı/cümle)',
          type: 'modelEvaluation'
        },
        OPEN_ENDED_ANSWER_PROMPT: {
          name: '執行測評（開放問題）',
          description: '模型回答開放式問題的提示詞，變數：{{question}} 題目內容，要求全面深入的分析論述',
          type: 'modelEvaluation'
        },
        OPEN_ENDED_ANSWER_PROMPT_EN: {
          name: 'Open-ended Question Answering',
          description:
            'Prompt for model to answer open-ended questions. Variables: {{question}} question content, requires comprehensive and in-depth analysis',
          type: 'modelEvaluation'
        },
        OPEN_ENDED_ANSWER_PROMPT_TR: {
          name: 'Açık Uçlu Soru Yanıtlama',
          description:
            'Modelin açık uçlu soruları yanıtlaması için istem. Değişkenler: {{question}} soru içeriği, kapsamlı ve derinlemesine analiz gerektirir',
          type: 'modelEvaluation'
        },
        // LLM評分提示詞
        SHORT_ANSWER_JUDGE_PROMPT: {
          name: 'LLM 短答案題評分',
          description:
            'LLM評估短答案題回答品質的提示詞，變數：{{question}} 題目，{{correctAnswer}} 參考答案，{{modelAnswer}} 學生答案，輸出JSON格式包含score和reason',
          type: 'llmJudge'
        },
        SHORT_ANSWER_JUDGE_PROMPT_EN: {
          name: 'Short Answer Grading',
          description:
            'LLM prompt for grading short-answer quality. Variables: {{question}} question, {{correctAnswer}} reference answer, {{modelAnswer}} student answer, output JSON with score and reason',
          type: 'llmJudge'
        },
        SHORT_ANSWER_JUDGE_PROMPT_TR: {
          name: 'Kısa Cevap Notlandırma',
          description:
            'Kısa cevap kalitesini notlandırmak için LLM istemi. Değişkenler: {{question}} soru, {{correctAnswer}} referans cevap, {{modelAnswer}} öğrenci cevabı, çıktı score ve reason içeren JSON',
          type: 'llmJudge'
        },
        OPEN_ENDED_JUDGE_PROMPT: {
          name: 'LLM 開放問題評分',
          description:
            'LLM評估開放式問題回答品質的提示詞，變數：{{question}} 題目，{{correctAnswer}} 參考答案，{{modelAnswer}} 學生答案，輸出JSON格式包含score和reason',
          type: 'llmJudge'
        },
        OPEN_ENDED_JUDGE_PROMPT_EN: {
          name: 'Open-ended Question Grading',
          description:
            'LLM prompt for grading open-ended question quality. Variables: {{question}} question, {{correctAnswer}} reference answer, {{modelAnswer}} student answer, output JSON with score and reason',
          type: 'llmJudge'
        },
        OPEN_ENDED_JUDGE_PROMPT_TR: {
          name: 'Açık Uçlu Soru Notlandırma',
          description:
            'Açık uçlu soru kalitesini notlandırmak için LLM istemi. Değişkenler: {{question}} soru, {{correctAnswer}} referans cevap, {{modelAnswer}} öğrenci cevabı, çıktı score ve reason içeren JSON',
          type: 'llmJudge'
        }
      }
    }
  };
}
