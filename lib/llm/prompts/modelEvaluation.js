import { processPrompt } from '../common/prompt-loader';

/**
 * 模型評估 - 答題提示詞
 * 用於模型回答各類測評題目
 *
 * 注意：LLM 評分提示詞已移至 judgePrompt.js
 */

// ============ 題目回答提示詞 ============

export const TRUE_FALSE_ANSWER_PROMPT = `
# Role: 判斷題回答助手
## Profile:
- Description: 你是一個專業的測評助手，需要根據你的知識準確回答是否判斷題。

## Task:
請回答以下是否判斷題。

## 題目:
{{question}}

## 回答要求:
1. 僅輸出 "✅" 或 "❌"
2. ✅ 表示題目陳述正確
3. ❌ 表示題目陳述錯誤
4. 不要新增任何解釋、說明或額外內容
5. 不要使用其他符號或文字

## 回答格式:
✅
或
❌
`;

export const TRUE_FALSE_ANSWER_PROMPT_EN = `
# Role: True/False Question Answering Assistant
## Profile:
- Description: You are a professional assessment assistant who needs to accurately answer true/false questions based on your knowledge.

## Task:
Please answer the following true/false question.

## Question:
{{question}}

## Answer Requirements:
1. Only output "✅" or "❌"
2. ✅ means the statement is correct
3. ❌ means the statement is incorrect
4. Do not add any explanation or additional content
5. Do not use other symbols or text

## Answer Format:
✅
or
❌
`;

export const TRUE_FALSE_ANSWER_PROMPT_TR = `
# Rol: Doğru/Yanlış Soru Yanıtlama Asistanı
## Profil:
- Açıklama: Bilginize dayanarak doğru/yanlış soruları doğru bir şekilde yanıtlamanız gereken profesyonel bir değerlendirme asistanısınız.

## Görev:
Lütfen aşağıdaki doğru/yanlış soruyu yanıtlayın.

## Soru:
{{question}}

## Yanıt Gereksinimleri:
1. Yalnızca "✅" veya "❌" çıktısı verin
2. ✅ ifadenin doğru olduğunu gösterir
3. ❌ ifadenin yanlış olduğunu gösterir
4. Herhangi bir açıklama veya ek içerik eklemeyin
5. Başka sembol veya metin kullanmayın

## Yanıt Biçimi:
✅
veya
❌
`;

export const SINGLE_CHOICE_ANSWER_PROMPT = `
# Role: 單選題回答助手
## Profile:
- Description: 你是一個專業的測評助手，需要根據你的知識從給定選項中選擇唯一正確答案。

## Task:
請回答以下單選題。

## 題目:
{{question}}

## 選項:
{{options}}

## 回答要求:
1. 僅輸出正確選項的字母標識（A、B、C、D 中的一個）
2. 只能選擇一個選項
3. 不要新增任何解釋、說明或額外內容
4. 不要輸出選項內容，只輸出字母

## 回答格式:
B
（示例：如果認為選項B正確，則只輸出字母 B）
`;

export const SINGLE_CHOICE_ANSWER_PROMPT_EN = `
# Role: Single Choice Question Answering Assistant
## Profile:
- Description: You are a professional assessment assistant who needs to select the only correct answer from given options based on your knowledge.

## Task:
Please answer the following single-choice question.

## Question:
{{question}}

## Options:
{{options}}

## Answer Requirements:
1. Only output the letter identifier of the correct option (one of A, B, C, D)
2. Can only select one option
3. Do not add any explanation or additional content
4. Do not output option content, only the letter

## Answer Format:
B
(Example: If you think option B is correct, only output the letter B)
`;

export const SINGLE_CHOICE_ANSWER_PROMPT_TR = `
# Rol: Tek Seçenekli Soru Yanıtlama Asistanı
## Profil:
- Açıklama: Bilginize dayanarak verilen seçeneklerden tek doğru cevabı seçmeniz gereken profesyonel bir değerlendirme asistanısınız.

## Görev:
Lütfen aşağıdaki tek seçenekli soruyu yanıtlayın.

## Soru:
{{question}}

## Seçenekler:
{{options}}

## Yanıt Gereksinimleri:
1. Yalnızca doğru seçeneğin harf tanımlayıcısını çıktı olarak verin (A, B, C, D'den biri)
2. Yalnızca bir seçenek seçilebilir
3. Herhangi bir açıklama veya ek içerik eklemeyin
4. Seçenek içeriğini yazmayın, yalnızca harfi yazın

## Yanıt Biçimi:
B
(Örnek: B seçeneğinin doğru olduğunu düşünüyorsanız, yalnızca B harfini yazın)
`;

export const MULTIPLE_CHOICE_ANSWER_PROMPT = `
# Role: 多選題回答助手
## Profile:
- Description: 你是一個專業的測評助手，需要根據你的知識從給定選項中選擇所有正確答案。

## Task:
請回答以下多選題。

## 題目:
{{question}}

## 選項:
{{options}}

## 回答要求:
1. 輸出所有正確選項的字母標識，使用 JSON 陣列格式
2. 必須選擇 2 個或以上的選項
3. 字母按升序排列（如 ["A", "C", "D"]）
4. 不要新增任何解釋、說明或額外內容
5. 嚴格遵循 JSON 陣列格式

## 回答格式:
["A", "C"]
（示例：如果認為選項A和C正確，則輸出 ["A", "C"]）
`;

export const MULTIPLE_CHOICE_ANSWER_PROMPT_EN = `
# Role: Multiple Choice Question Answering Assistant
## Profile:
- Description: You are a professional assessment assistant who needs to select all correct answers from given options based on your knowledge.

## Task:
Please answer the following multiple-choice question.

## Question:
{{question}}

## Options:
{{options}}

## Answer Requirements:
1. Output all correct option letter identifiers in JSON array format
2. Must select 2 or more options
3. Letters in ascending order (e.g., ["A", "C", "D"])
4. Do not add any explanation or additional content
5. Strictly follow JSON array format

## Answer Format:
["A", "C"]
(Example: If you think options A and C are correct, output ["A", "C"])
`;

export const MULTIPLE_CHOICE_ANSWER_PROMPT_TR = `
# Rol: Çoktan Seçmeli Soru Yanıtlama Asistanı
## Profil:
- Açıklama: Bilginize dayanarak verilen seçeneklerden tüm doğru cevapları seçmeniz gereken profesyonel bir değerlendirme asistanısınız.

## Görev:
Lütfen aşağıdaki çoktan seçmeli soruyu yanıtlayın.

## Soru:
{{question}}

## Seçenekler:
{{options}}

## Yanıt Gereksinimleri:
1. Tüm doğru seçeneklerin harf tanımlayıcılarını JSON dizisi biçiminde çıktı olarak verin
2. 2 veya daha fazla seçenek seçilmelidir
3. Harfler artan sırada olmalıdır (örn. ["A", "C", "D"])
4. Herhangi bir açıklama veya ek içerik eklemeyin
5. JSON dizisi biçimini kesinlikle takip edin

## Yanıt Biçimi:
["A", "C"]
(Örnek: A ve C seçeneklerinin doğru olduğunu düşünüyorsanız, ["A", "C"] çıktısını verin)
`;

export const SHORT_ANSWER_PROMPT = `
# Role: 短答案題回答助手
## Profile:
- Description: 你是一個專業的測評助手，需要根據你的知識提供簡短、準確的答案。

## Task:
請回答以下短答案題。

## 題目:
{{question}}

## 回答要求:
1. 答案必須極短，符合以下三種形式之一：
   - 一個詞或一個短語（不要分點、不要換行、不要解釋）
   - 一個數字或一個數值（可包含小數/百分號/單位）
   - 一句簡單的話（單句，不要分號/冒號/並列要點，不要解釋原因）
2. 直接回答問題的核心要點
3. 不要新增"答案是"、"根據"等字首
4. 不要新增任何解釋或補充說明

## 回答格式示例:
神經網路
或
1000
或
深度學習是機器學習的一個分支
`;

export const SHORT_ANSWER_PROMPT_EN = `
# Role: Short Answer Question Answering Assistant
## Profile:
- Description: You are a professional assessment assistant who needs to provide concise and accurate answers based on your knowledge.

## Task:
Please answer the following short-answer question.

## Question:
{{question}}

## Answer Requirements:
1. Answer must be ultra-short, in one of these three forms:
   - A single word or short phrase (no lists, no line breaks, no explanation)
   - A single number or numeric value (decimals/percent/units allowed)
   - One simple sentence (single sentence only; no lists; no explanation)
2. Directly answer the core point of the question
3. Do not add prefixes like "The answer is" or "According to"
4. Do not add any explanation or supplementary information

## Answer Format Examples:
neural network
or
1000
or
Deep learning is a branch of machine learning
`;

export const SHORT_ANSWER_PROMPT_TR = `
# Rol: Kısa Cevaplı Soru Yanıtlama Asistanı
## Profil:
- Açıklama: Bilginize dayanarak kısa ve doğru cevaplar vermeniz gereken profesyonel bir değerlendirme asistanısınız.

## Görev:
Lütfen aşağıdaki kısa cevaplı soruyu yanıtlayın.

## Soru:
{{question}}

## Yanıt Gereksinimleri:
1. Cevap çok kısa olmalı, aşağıdaki üç biçimden biri olmalıdır:
   - Tek bir kelime veya kısa bir ifade (liste yok, satır sonu yok, açıklama yok)
   - Tek bir sayı veya sayısal değer (ondalık/yüzde/birim olabilir)
   - Basit bir cümle (tek cümle, noktalı virgül/iki nokta üst üste/paralel madde yok, neden açıklanmaz)
2. Sorunun temel noktasını doğrudan yanıtlayın
3. "Cevap şudur", "Buna göre" gibi önekler eklemeyin
4. Herhangi bir açıklama veya ek bilgi eklemeyin

## Yanıt Biçimi Örnekleri:
sinir ağı
veya
1000
veya
Derin öğrenme, makine öğrenmenin bir dalıdır
`;

export const OPEN_ENDED_ANSWER_PROMPT = `
# Role: 開放式問題回答助手
## Profile:
- Description: 你是一個專業的測評助手，需要根據你的知識對開放式問題進行深入、全面的回答。

## Task:
請回答以下開放式問題。

## 題目:
{{question}}

## 回答要求:
1. 回答應全面、有深度，體現對問題的深入理解
2. 提供合理的論據、分析和論證
3. 邏輯清晰，結構完整
4. 可以使用段落、分點、步驟、對比等任意合適的形式組織答案
5. 回答長度適中，充分展開但不冗餘

## 回答格式:
根據問題特點，自由組織答案結構，可以使用：
- 段落式論述
- 分點闡述
- 步驟說明
- 對比分析
等任意合適的形式
`;

export const OPEN_ENDED_ANSWER_PROMPT_EN = `
# Role: Open-ended Question Answering Assistant
## Profile:
- Description: You are a professional assessment assistant who needs to provide in-depth and comprehensive answers to open-ended questions based on your knowledge.

## Task:
Please answer the following open-ended question.

## Question:
{{question}}

## Answer Requirements:
1. Answer should be comprehensive and insightful, demonstrating deep understanding
2. Provide reasonable arguments, analysis, and reasoning
3. Clear logic and complete structure
4. Can use paragraphs, bullet points, steps, comparisons, or any appropriate format
5. Appropriate length - fully developed but not redundant

## Answer Format:
Organize answer structure freely based on question characteristics, can use:
- Paragraph-style exposition
- Bullet point elaboration
- Step-by-step explanation
- Comparative analysis
or any other appropriate format
`;

export const OPEN_ENDED_ANSWER_PROMPT_TR = `
# Rol: Açık Uçlu Soru Yanıtlama Asistanı
## Profil:
- Açıklama: Bilginize dayanarak açık uçlu sorulara derinlemesine ve kapsamlı yanıtlar vermeniz gereken profesyonel bir değerlendirme asistanısınız.

## Görev:
Lütfen aşağıdaki açık uçlu soruyu yanıtlayın.

## Soru:
{{question}}

## Yanıt Gereksinimleri:
1. Yanıt kapsamlı ve derinlikli olmalı, konunun derin anlaşıldığını göstermelidir
2. Makul argümanlar, analiz ve gerekçeler sunun
3. Net mantık ve eksiksiz yapı
4. Paragraflar, madde işaretleri, adımlar, karşılaştırmalar veya uygun herhangi bir biçim kullanılabilir
5. Uygun uzunlukta - tam olarak geliştirilmiş ama gereksiz olmayan

## Yanıt Biçimi:
Sorunun özelliklerine göre yanıt yapısını serbestçe düzenleyin, şunlar kullanılabilir:
- Paragraf tarzı açıklama
- Madde işaretli açıklama
- Adım adım açıklama
- Karşılaştırmalı analiz
veya diğer uygun biçimler
`;

// ============ 提示詞獲取函式 ============

/**
 * 獲取題目回答提示詞（使用 processPrompt 規範化處理）
 */
export async function buildAnswerPrompt(questionType, question, options = null, language = 'zh-CN', projectId = null) {
  let promptType, baseKey, defaultPrompts, params;

  switch (questionType) {
    case 'true_false':
      promptType = 'modelEvaluation';
      baseKey = 'TRUE_FALSE_ANSWER_PROMPT';
      defaultPrompts = {
        zh: TRUE_FALSE_ANSWER_PROMPT,
        en: TRUE_FALSE_ANSWER_PROMPT_EN,
        tr: TRUE_FALSE_ANSWER_PROMPT_TR
      };
      params = { question };
      break;
    case 'single_choice':
      promptType = 'modelEvaluation';
      baseKey = 'SINGLE_CHOICE_ANSWER_PROMPT';
      defaultPrompts = {
        zh: SINGLE_CHOICE_ANSWER_PROMPT,
        en: SINGLE_CHOICE_ANSWER_PROMPT_EN,
        tr: SINGLE_CHOICE_ANSWER_PROMPT_TR
      };
      const singleOptionsText = Array.isArray(options)
        ? options.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt}`).join('\n')
        : options || '';
      params = { question, options: singleOptionsText };
      break;
    case 'multiple_choice':
      promptType = 'modelEvaluation';
      baseKey = 'MULTIPLE_CHOICE_ANSWER_PROMPT';
      defaultPrompts = {
        zh: MULTIPLE_CHOICE_ANSWER_PROMPT,
        en: MULTIPLE_CHOICE_ANSWER_PROMPT_EN,
        tr: MULTIPLE_CHOICE_ANSWER_PROMPT_TR
      };
      const multipleOptionsText = Array.isArray(options)
        ? options.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt}`).join('\n')
        : options || '';
      params = { question, options: multipleOptionsText };
      break;
    case 'short_answer':
      promptType = 'modelEvaluation';
      baseKey = 'SHORT_ANSWER_PROMPT';
      defaultPrompts = { zh: SHORT_ANSWER_PROMPT, en: SHORT_ANSWER_PROMPT_EN, tr: SHORT_ANSWER_PROMPT_TR };
      params = { question };
      break;
    case 'open_ended':
      promptType = 'modelEvaluation';
      baseKey = 'OPEN_ENDED_ANSWER_PROMPT';
      defaultPrompts = {
        zh: OPEN_ENDED_ANSWER_PROMPT,
        en: OPEN_ENDED_ANSWER_PROMPT_EN,
        tr: OPEN_ENDED_ANSWER_PROMPT_TR
      };
      params = { question };
      break;
    default:
      promptType = 'modelEvaluation';
      baseKey = 'SHORT_ANSWER_PROMPT';
      defaultPrompts = { zh: SHORT_ANSWER_PROMPT, en: SHORT_ANSWER_PROMPT_EN, tr: SHORT_ANSWER_PROMPT_TR };
      params = { question };
  }

  return await processPrompt(language, promptType, baseKey, defaultPrompts, params, projectId);
}

/**
 * 獲取評估提示詞（從 judgePrompt.js 匯入）
 * @deprecated 請直接使用 judgePrompt.js 中的 buildJudgePrompt
 */
export async function buildJudgePrompt(
  questionType,
  question,
  correctAnswer,
  modelAnswer,
  language = 'zh-CN',
  customScoreAnchors = null,
  projectId = null
) {
  const { buildJudgePrompt: buildJudgePromptFromModule } = require('./llmJudge');
  return await buildJudgePromptFromModule(
    questionType,
    question,
    correctAnswer,
    modelAnswer,
    language,
    customScoreAnchors,
    projectId
  );
}

export default {
  buildAnswerPrompt,
  buildJudgePrompt,
  TRUE_FALSE_ANSWER_PROMPT,
  TRUE_FALSE_ANSWER_PROMPT_EN,
  TRUE_FALSE_ANSWER_PROMPT_TR,
  SINGLE_CHOICE_ANSWER_PROMPT,
  SINGLE_CHOICE_ANSWER_PROMPT_EN,
  SINGLE_CHOICE_ANSWER_PROMPT_TR,
  MULTIPLE_CHOICE_ANSWER_PROMPT,
  MULTIPLE_CHOICE_ANSWER_PROMPT_EN,
  MULTIPLE_CHOICE_ANSWER_PROMPT_TR,
  SHORT_ANSWER_PROMPT,
  SHORT_ANSWER_PROMPT_EN,
  SHORT_ANSWER_PROMPT_TR,
  OPEN_ENDED_ANSWER_PROMPT,
  OPEN_ENDED_ANSWER_PROMPT_EN,
  OPEN_ENDED_ANSWER_PROMPT_TR
};
