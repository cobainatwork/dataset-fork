import { processPrompt } from '../common/prompt-loader';

/**
 * LLM 評估提示詞
 * 用於評估模型在主觀題目上的回答品質
 */

// ============ 預設評分規則常量 ============

// 簡答題預設評分規則（中文）
export const DEFAULT_SHORT_ANSWER_SCORE_ANCHORS_ZH = [
  { range: '1.0', description: '完全等價正確（數值/範圍/實體/要點都對）；無衝突或編造。' },
  { range: '0.8-0.9', description: '基本正確；僅有輕微不嚴謹或漏次要點；無關鍵錯誤。' },
  { range: '0.6-0.7', description: '部分正確但存在明顯遺漏；核心方向仍對；無重大錯誤。' },
  { range: '0.3-0.5', description: '僅命中少量資訊；或存在多處不準確；難以認為回答到位。' },
  { range: '0.0-0.2', description: '答非所問/關鍵事實錯誤/大量編造/空答。' }
];

// 簡答題預設評分規則（英文）
export const DEFAULT_SHORT_ANSWER_SCORE_ANCHORS_EN = [
  { range: '1.0', description: 'Fully equivalent correct; no contradictions or fabrication.' },
  { range: '0.8-0.9', description: 'Mostly correct; only minor omissions/imprecision; no key errors.' },
  { range: '0.6-0.7', description: 'Partly correct with clear omissions; core direction correct; no major errors.' },
  { range: '0.3-0.5', description: 'Only small parts correct and/or multiple inaccuracies; inadequate.' },
  { range: '0.0-0.2', description: 'Off-topic / key factual wrong / heavy fabrication / empty.' }
];

// 開放題預設評分規則（中文）
export const DEFAULT_OPEN_ENDED_SCORE_ANCHORS_ZH = [
  { range: '1.0', description: '關鍵點充分且正確；論證紮實；無明顯錯誤；細節具體。' },
  { range: '0.8-0.9', description: '整體很強；僅有輕微遺漏/措辭不嚴謹；無關鍵錯誤。' },
  { range: '0.6-0.7', description: '能回答問題但不夠完整或偏泛；論證一般；可能有小錯誤。' },
  { range: '0.3-0.5', description: '明顯不完整、偏題或泛泛而談；或包含多處不準確。' },
  { range: '0.0-0.2', description: '答非所問/大量編造/嚴重錯誤/空答。' }
];

// 開放題預設評分規則（英文）
export const DEFAULT_OPEN_ENDED_SCORE_ANCHORS_EN = [
  { range: '1.0', description: 'Correct, thorough, well-justified, concrete; no notable errors.' },
  { range: '0.8-0.9', description: 'Strong overall; only minor omissions/wording; no key errors.' },
  { range: '0.6-0.7', description: 'Adequate but incomplete or generic; average reasoning; maybe minor errors.' },
  { range: '0.3-0.5', description: 'Incomplete, off-topic, or overly generic; and/or multiple inaccuracies.' },
  { range: '0.0-0.2', description: 'Irrelevant, largely fabricated, severely wrong, or empty.' }
];

// Kısa cevap varsayılan puanlama kuralları (Türkçe)
export const DEFAULT_SHORT_ANSWER_SCORE_ANCHORS_TR = [
  { range: '1.0', description: 'Tamamen eşdeğer doğru; çelişki veya uydurma yok.' },
  { range: '0.8-0.9', description: 'Çoğunlukla doğru; yalnızca küçük eksiklikler/belirsizlikler; kritik hata yok.' },
  { range: '0.6-0.7', description: 'Kısmen doğru, açık eksiklikler var; temel yön doğru; büyük hata yok.' },
  { range: '0.3-0.5', description: 'Yalnızca küçük kısımlar doğru ve/veya birden fazla yanlışlık; yetersiz.' },
  { range: '0.0-0.2', description: 'Konu dışı / temel olgusal hata / ağır uydurma / boş.' }
];

// Açık uçlu varsayılan puanlama kuralları (Türkçe)
export const DEFAULT_OPEN_ENDED_SCORE_ANCHORS_TR = [
  { range: '1.0', description: 'Doğru, kapsamlı, iyi gerekçelendirilmiş, somut; önemli hata yok.' },
  { range: '0.8-0.9', description: 'Genel olarak güçlü; yalnızca küçük eksiklikler/ifade sorunları; kritik hata yok.' },
  { range: '0.6-0.7', description: 'Yeterli ama eksik veya genel; ortalama muhakeme; küçük hatalar olabilir.' },
  { range: '0.3-0.5', description: 'Eksik, konu dışı veya aşırı genel; ve/veya birden fazla yanlışlık.' },
  { range: '0.0-0.2', description: 'İlgisiz, büyük ölçüde uydurma, ciddi şekilde yanlış veya boş.' }
];

/**
 * 獲取預設評分規則
 * @param {string} questionType - 題目型別：'short_answer' 或 'open_ended'
 * @param {string} language - 語言：'zh-CN' 或 'en'
 * @returns {Array} 評分規則陣列
 */
export function getDefaultScoreAnchors(questionType, language = 'zh-CN') {
  const isEn = language === 'en';
  const isTr = language === 'tr';

  if (questionType === 'open_ended') {
    if (isTr) return DEFAULT_OPEN_ENDED_SCORE_ANCHORS_TR;
    return isEn ? DEFAULT_OPEN_ENDED_SCORE_ANCHORS_EN : DEFAULT_OPEN_ENDED_SCORE_ANCHORS_ZH;
  }
  if (isTr) return DEFAULT_SHORT_ANSWER_SCORE_ANCHORS_TR;
  return isEn ? DEFAULT_SHORT_ANSWER_SCORE_ANCHORS_EN : DEFAULT_SHORT_ANSWER_SCORE_ANCHORS_ZH;
}

/**
 * 將評分規則陣列格式化為提示詞文字
 * @param {Array} scoreAnchors - 評分規則陣列
 * @returns {string} 格式化後的文字
 */
export function formatScoreAnchors(scoreAnchors) {
  if (!scoreAnchors || scoreAnchors.length === 0) {
    return '';
  }
  return scoreAnchors.map(anchor => `- ${anchor.range}：${anchor.description}`).join('\n');
}

// ============ LLM 評分提示詞 ============

export const SHORT_ANSWER_JUDGE_PROMPT = `
# Role: 嚴謹的閱卷教師（短答案）

## Task
對短答案進行嚴格評分：答案通常是數值/百分比/範圍/實體名/短語/要點列表。只要有關鍵缺失或事實錯誤就要明顯扣分，不要預設給高分。

## Grading Rules
- 先從參考答案中提煉關鍵點（短答案通常 1-5 個即可）：事實/數值/單位/範圍/物件/限定條件/結論。
- 對照學生答案逐條判斷：命中/部分命中/未命中，並檢查是否出現“衝突點”。
- 允許同義改寫與等價表達，但不允許改變事實（例如把 84% 寫成 84 臺、把“近 3 倍”寫成“3%”）。
- 發現編造、與參考答案衝突、概念性錯誤：必須顯著扣分。
- 句子更長≠更好；短答案看資訊是否對、是否全、是否精確。

## Normalization (評分前先做一致化理解)
- 忽略空格、全半形、大小寫差異；百分號“%”與“百分之”視為等價。
- 數值允許輕微四捨五入（例如 83.9%≈84%），但單位必須一致或可等價換算。
- 範圍/區間必須落在參考範圍內（如 “30%~50%”），越界視為錯誤。
- 列表/多要點答案：必須覆蓋所有關鍵項；漏 1 項是“缺失”，寫錯 1 項是“錯誤”。

## Score Anchors (0.0-1.0, step 0.1)
{{scoreAnchors}}

## Caps (用於防止高分氾濫)
- 缺失任何“核心關鍵點”（問題必須回答的點）：score ≤ 0.7
- 出現 1 個“重大事實錯誤/與參考衝突”：score ≤ 0.4
- 出現 2 個及以上重大錯誤或大量編造：score ≤ 0.2

## Question
{{question}}

## Reference Answer
{{correctAnswer}}

## Student Answer
{{modelAnswer}}

## Output
請嚴格按照以下 JSON 格式輸出評分結果，不要新增任何其他內容：

\`\`\`json
{
  "score": <根據 Score Anchors 評定的分數>,
  "reason": "<評分理由>"
}
\`\`\`

要求：
- score 為 0.0-1.0，精確到 0.1，嚴格依據上述 Score Anchors 標準評定
- reason ≤ 100 字，必須點出：命中情況 + 主要缺失/錯誤 + 總評
- 只輸出可解析 JSON
`;

export const SHORT_ANSWER_JUDGE_PROMPT_EN = `
# Role: Strict Grader (Short Answer)

## Task
Grade strictly. Short answers are usually numbers/percentages/ranges/entities/phrases/bullets. Do not default to high scores.

## Grading Rules
- Extract key points from the reference answer (usually 1-5 for short answers): value/unit/range/entity/constraints/conclusion.
- Check each point as hit / partial / miss, and also look for contradictions.
- Accept equivalent paraphrases, but not changed facts (e.g., 84% ≠ 84 units).
- Heavily penalize hallucinations, contradictions, and concept errors.
- Longer wording is not better; short answers are judged by correctness and completeness.

## Normalization
- Ignore whitespace/case/locale punctuation differences; treat “%” and “percent” equivalently.
- Allow minor rounding (e.g., 83.9% ≈ 84%), but units must match or be equivalent.
- Ranges must fall within the reference range; out-of-range is wrong.
- Lists must cover all required items; missing = incomplete, wrong item = error.

## Score Anchors (0.0-1.0, step 0.1)
{{scoreAnchors}}

## Caps
- Missing any essential key point: score ≤ 0.7
- One major factual contradiction/hallucination: score ≤ 0.4
- Two+ major errors or lots of fabrication: score ≤ 0.2

## Question
{{question}}

## Reference Answer
{{correctAnswer}}

## Student Answer
{{modelAnswer}}

## Output
Strictly output the result in the following JSON format, with no extra text:

\`\`\`json
{
  "score": <score based on Score Anchors>,
  "reason": "<evaluation reason>"
}
\`\`\`

Requirements:
- score in [0.0, 1.0], step 0.1, strictly follow the Score Anchors above
- reason ≤ 100 words: hits + main misses/errors + overall
- JSON only
`;

export const SHORT_ANSWER_JUDGE_PROMPT_TR = `
# Rol: Sıkı Notlayıcı (Kısa Cevap)

## Görev
Sıkı bir şekilde notlayın. Kısa cevaplar genellikle sayılar/yüzdeler/aralıklar/varlıklar/ifadeler/maddelerdir. Varsayılan olarak yüksek puan vermeyin.

## Notlama Kuralları
- Referans cevaptan anahtar noktaları çıkarın (kısa cevaplar için genellikle 1-5): değer/birim/aralık/varlık/koşullar/sonuç.
- Her noktayı kontrol edin: isabet / kısmi isabet / ıskalama, ve çelişkileri de kontrol edin.
- Eşdeğer ifadeleri kabul edin, ancak değiştirilmiş olguları değil (örn. %84 ≠ 84 birim).
- Uydurma, çelişki ve kavram hatalarını ağır şekilde cezalandırın.
- Daha uzun ifade = daha iyi değil; kısa cevaplar doğruluk ve tamlıkla değerlendirilir.

## Normalizasyon
- Boşluk/büyük-küçük harf/yerel noktalama farklarını yok sayın; "%" ve "yüzde" eşdeğer sayılır.
- Küçük yuvarlama farklarına izin verin (örn. %83,9 ≈ %84), ancak birimler eşleşmeli veya eşdeğer olmalı.
- Aralıklar referans aralığı içinde olmalıdır; dışında olan yanlıştır.
- Listeler tüm gerekli maddeleri kapsamalıdır; eksik = tamamlanmamış, yanlış madde = hata.

## Puan Çıpaları (0.0-1.0, adım 0.1)
{{scoreAnchors}}

## Üst Sınırlar
- Herhangi bir temel anahtar noktayı kaçırma: puan ≤ 0.7
- Bir büyük olgusal çelişki/uydurma: puan ≤ 0.4
- İki veya daha fazla büyük hata veya çok sayıda uydurma: puan ≤ 0.2

## Soru
{{question}}

## Referans Cevap
{{correctAnswer}}

## Öğrenci Cevabı
{{modelAnswer}}

## Çıktı
Sonucu kesinlikle aşağıdaki JSON biçiminde çıktı olarak verin, ek metin eklemeyin:

\`\`\`json
{
  "score": <Puan Çıpalarına göre puan>,
  "reason": "<değerlendirme gerekçesi>"
}
\`\`\`

Gereksinimler:
- puan [0.0, 1.0] aralığında, adım 0.1, kesinlikle yukarıdaki Puan Çıpalarını takip edin
- gerekçe ≤ 100 kelime: isabetler + ana eksiklikler/hatalar + genel değerlendirme
- Yalnızca JSON
`;

export const OPEN_ENDED_JUDGE_PROMPT = `
# Role: 嚴謹的評估專家（開放題/長答案）

## Task
評估長答案的品質與可靠性，避免“看起來不錯就給 0.8”。參考答案用於核對關鍵事實與覆蓋面，但允許合理的等價表達與不同論證路徑。

## What to Judge
1) 關鍵正確性：核心事實/概念是否正確，是否自相矛盾或編造。
2) 覆蓋與針對性：是否回答了題目要求，是否遺漏關鍵部分或跑題。
3) 論證與結構：是否有清晰結構、因果鏈/依據，是否只給空泛結論。
4) 可用性：是否給出具體、可執行/可驗證的說明（視題目而定）。

## Score Anchors (0.0-1.0, step 0.1)
{{scoreAnchors}}

## Caps
- 出現 1 個“重大事實錯誤/與參考關鍵事實衝突/關鍵推理錯誤”：score ≤ 0.4
- 出現 2 個及以上重大錯誤或大量編造：score ≤ 0.2
- 明顯跑題或只給泛泛總結：score ≤ 0.5

## Question
{{question}}

## Reference Answer (for checking)
{{correctAnswer}}

## Student Answer
{{modelAnswer}}

## Output
請嚴格按照以下 JSON 格式輸出評分結果，不要新增任何其他內容：

\`\`\`json
{
  "score": <根據 Score Anchors 評定的分數>,
  "reason": "<評分理由>"
}
\`\`\`

要求：
- score 為 0.0-1.0，精確到 0.1，嚴格依據上述 Score Anchors 標準評定
- reason ≤ 150 字，必須包含：優點 + 主要問題（遺漏/錯誤/空泛/跑題）+ 總評
- 只輸出可解析 JSON
`;

export const OPEN_ENDED_JUDGE_PROMPT_EN = `
# Role: Strict Evaluator (Open-ended / Long Answer)

## Task
Judge quality and reliability. The reference answer helps validate key facts/coverage, but allow equivalent correct approaches. Do not default to 0.8.

## What to Judge
1) Key correctness: core facts/concepts are correct; no contradictions or fabricated claims.
2) Coverage & focus: answers what the question asks; avoids drifting; covers essential parts.
3) Reasoning & structure: clear structure and justification; not just vague conclusions.
4) Usefulness: concrete, actionable/verifiable details when applicable.

## Score Anchors (0.0-1.0, step 0.1)
{{scoreAnchors}}

## Caps
- One major factual contradiction/hallucination or critical reasoning error: score ≤ 0.4
- Two+ major errors or heavy fabrication: score ≤ 0.2
- Clearly off-topic or purely generic summary: score ≤ 0.5

## Question
{{question}}

## Reference Answer (for checking)
{{correctAnswer}}

## Student Answer
{{modelAnswer}}

## Output
Strictly output the result in the following JSON format, with no extra text:

\`\`\`json
{
  "score": <score based on Score Anchors>,
  "reason": "<evaluation reason>"
}
\`\`\`

Requirements:
- score in [0.0, 1.0], step 0.1, strictly follow the Score Anchors above
- reason ≤ 150 words: strengths + main issues (missing/error/generic/off-topic) + overall
- JSON only
`;

export const OPEN_ENDED_JUDGE_PROMPT_TR = `
# Rol: Sıkı Değerlendirici (Açık Uçlu / Uzun Cevap)

## Görev
Kalite ve güvenilirliği değerlendirin. Referans cevap, temel olguları/kapsamı doğrulamaya yardımcı olur, ancak eşdeğer doğru yaklaşımlara izin verin. Varsayılan olarak 0.8 vermeyin.

## Ne Değerlendirilecek
1) Temel doğruluk: temel olgular/kavramlar doğru mu; çelişki veya uydurma iddia yok.
2) Kapsam ve odak: sorunun istediğini yanıtlıyor; sapmıyor; temel kısımları kapsıyor.
3) Muhakeme ve yapı: açık yapı ve gerekçe; yalnızca belirsiz sonuçlar değil.
4) Kullanışlılık: somut, uygulanabilir/doğrulanabilir ayrıntılar (uygulanabilir olduğunda).

## Puan Çıpaları (0.0-1.0, adım 0.1)
{{scoreAnchors}}

## Üst Sınırlar
- Bir büyük olgusal çelişki/uydurma veya kritik muhakeme hatası: puan ≤ 0.4
- İki veya daha fazla büyük hata veya ağır uydurma: puan ≤ 0.2
- Açıkça konu dışı veya yalnızca genel özet: puan ≤ 0.5

## Soru
{{question}}

## Referans Cevap (kontrol için)
{{correctAnswer}}

## Öğrenci Cevabı
{{modelAnswer}}

## Çıktı
Sonucu kesinlikle aşağıdaki JSON biçiminde çıktı olarak verin, ek metin eklemeyin:

\`\`\`json
{
  "score": <Puan Çıpalarına göre puan>,
  "reason": "<değerlendirme gerekçesi>"
}
\`\`\`

Gereksinimler:
- puan [0.0, 1.0] aralığında, adım 0.1, kesinlikle yukarıdaki Puan Çıpalarını takip edin
- gerekçe ≤ 150 kelime: güçlü yönler + ana sorunlar (eksik/hata/genel/konu dışı) + genel değerlendirme
- Yalnızca JSON
`;

// ============ 提示詞獲取函式 ============

/**
 * 構建評分提示詞（使用 processPrompt 規範化處理）
 * @param {string} questionType - 題型
 * @param {string} question - 題目
 * @param {string} correctAnswer - 正確答案
 * @param {string} modelAnswer - 模型答案
 * @param {string} language - 語言
 * @param {Array} customScoreAnchors - 自定義評分規則（可選）
 * @param {string} projectId - 專案ID（可選）
 * @returns {Promise<string>} - 完整的評分提示詞
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
  let promptType, baseKey, defaultPrompts;

  switch (questionType) {
    case 'short_answer':
      promptType = 'llmJudge';
      baseKey = 'SHORT_ANSWER_JUDGE_PROMPT';
      defaultPrompts = {
        zh: SHORT_ANSWER_JUDGE_PROMPT,
        en: SHORT_ANSWER_JUDGE_PROMPT_EN,
        tr: SHORT_ANSWER_JUDGE_PROMPT_TR
      };
      break;
    case 'open_ended':
      promptType = 'llmJudge';
      baseKey = 'OPEN_ENDED_JUDGE_PROMPT';
      defaultPrompts = { zh: OPEN_ENDED_JUDGE_PROMPT, en: OPEN_ENDED_JUDGE_PROMPT_EN, tr: OPEN_ENDED_JUDGE_PROMPT_TR };
      break;
    default:
      promptType = 'llmJudge';
      baseKey = 'SHORT_ANSWER_JUDGE_PROMPT';
      defaultPrompts = {
        zh: SHORT_ANSWER_JUDGE_PROMPT,
        en: SHORT_ANSWER_JUDGE_PROMPT_EN,
        tr: SHORT_ANSWER_JUDGE_PROMPT_TR
      };
  }

  // 獲取評分規則文字（自定義或預設）
  let scoreAnchorsText;
  if (customScoreAnchors && Array.isArray(customScoreAnchors) && customScoreAnchors.length === 5) {
    scoreAnchorsText = formatScoreAnchors(customScoreAnchors);
  } else {
    const defaultScoreAnchors = getDefaultScoreAnchors(questionType, language);
    scoreAnchorsText = formatScoreAnchors(defaultScoreAnchors);
  }

  const params = {
    question,
    correctAnswer,
    modelAnswer,
    scoreAnchors: scoreAnchorsText
  };

  return await processPrompt(language, promptType, baseKey, defaultPrompts, params, projectId);
}

export default {
  buildJudgePrompt,
  getDefaultScoreAnchors,
  formatScoreAnchors,
  SHORT_ANSWER_JUDGE_PROMPT,
  SHORT_ANSWER_JUDGE_PROMPT_EN,
  SHORT_ANSWER_JUDGE_PROMPT_TR,
  OPEN_ENDED_JUDGE_PROMPT,
  OPEN_ENDED_JUDGE_PROMPT_EN,
  OPEN_ENDED_JUDGE_PROMPT_TR
};
