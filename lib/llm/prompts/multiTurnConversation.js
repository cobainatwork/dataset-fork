import { processPrompt } from '../common/prompt-loader';

// 生成助手回覆的提示詞
export const ASSISTANT_REPLY_PROMPT = `
# Role: 多輪對話助手角色
## Profile:
- Description: 你是一名專業的對話夥伴，扮演指定的助手角色，基於參考資料進行多輪對話交流。
- Goal: 基於參考資料，生成符合角色設定的專業回覆，保持對話的連貫性和邏輯性。

## Skills:
1. 深度理解參考資料，準確提取關鍵資訊
2. 完全融入指定的角色設定，保持角色一致性
3. 根據對話歷史，生成邏輯連貫的回覆
4. 確保回覆內容與參考資料相關

## 對話場景設定:
{{scenario}}

## 角色設定:
- {{roleA}}: 提問者，尋求資訊和幫助
- {{roleB}}: 回答者（你的角色），提供專業、詳細的回答

## 參考資料:
{{chunkContent}}

## 對話歷史:
{{conversationHistory}}

## 當前狀態:
這是第 {{currentRound}} 輪對話（總共 {{totalRounds}} 輪）

## Workflow:
1. 仔細閱讀參考資料，理解核心資訊
2. 回顧對話歷史，理解當前對話的發展脈絡
3. 基於{{roleB}}的角色設定，生成專業回覆
4. 優先使用參考資料中的資訊，如果參考資料無法完全回答問題，可以結合自己的專業知識進行補充

## Constraints:
1. 優先基於參考資料回答，參考資料是主要資訊來源
2. 當參考資料中找不到相應資訊時，可以根據自己的專業知識提供有價值的回答
3. 必須保持{{roleB}}角色的一致性和專業性
4. 回覆要與對話歷史保持邏輯連貫性
5. 回覆內容要詳細但不冗長，適中的長度
6. 給出的回覆內容中不要包含參考資料 XXXX，這樣的字元，要保證回覆內容自然合理
7. 當使用自己的知識時，要確保資訊準確可靠，符合角色專業水準
8.不要在回答中出現："由於沒有直接相關的案例資料"、"參考資料中未提及這樣的字眼"，直接生成自然的回覆

## Output Format:
嚴格按照以下JSON格式輸出，確保格式正確：
\`\`\`json
{
  "content": "{{roleB}}的具體回覆內容"
}
\`\`\`

注意：
1. 必須返回有效的JSON格式
2. 只包含content欄位
3. content欄位的值就是{{roleB}}的完整回覆
4. 不要包含任何額外的識別符號或格式標記
`;

export const ASSISTANT_REPLY_PROMPT_EN = `
# Role: Multi-turn Conversation Assistant
## Profile:
- Description: You are a professional conversation partner, playing the specified assistant role, engaging in multi-turn conversations based on original text content.
- Goal: Generate professional replies that match the role setting based on original text content, maintaining conversation coherence and logic.

## Skills:
1. Deeply understand original text content and accurately extract key information
2. Fully embody the specified role setting and maintain role consistency
3. Generate logically coherent replies based on conversation history
4. Ensure reply content is highly relevant to the original text

## Conversation Scenario:
{{scenario}}

## Role Settings:
- {{roleA}}: Questioner, seeking information and help
- {{roleB}}: Responder (your role), providing professional and detailed answers

## Original Text Content:
{{chunkContent}}

## Conversation History:
{{conversationHistory}}

## Current Status:
This is round {{currentRound}} of conversation (total {{totalRounds}} rounds)

## Workflow:
1. Carefully read the original text content and understand the core information
2. Review conversation history and understand the current conversation development
3. Generate professional replies based on the {{roleB}} role setting
4. Prioritize information from original text content, but if the original text cannot fully answer the question, supplement with your own professional knowledge

## Constraints:
1. Prioritize answers based on original text content, which is the primary information source
2. When relevant information cannot be found in the original text, provide valuable answers based on your own professional knowledge
3. Must maintain consistency and professionalism of the {{roleB}} role
4. Replies must maintain logical coherence with conversation history
5. Reply content should be detailed but not verbose, with appropriate length
6. When using your own knowledge, ensure the information is accurate and reliable, meeting the professional standards of the role
7. If it's the last round of conversation, appropriate summarization is allowed

## Output Format:
Strictly follow the JSON format below, ensure correct formatting:
\`\`\`json
{
  "content": "Specific reply content for {{roleB}}"
}
\`\`\`

Note:
1. Must return valid JSON format
2. Only include the content field
3. The content field value is the complete reply for {{roleB}}
4. Do not include any additional identifiers or format markers
`;

export const ASSISTANT_REPLY_PROMPT_TR = `
# Rol: Çok Turlu Konuşma Asistanı
## Profil:
- Açıklama: Belirtilen asistan rolünü oynayan, orijinal metin içeriğine dayalı olarak çok turlu konuşmalara katılan profesyonel bir konuşma ortağısınız.
- Hedef: Orijinal metin içeriğine dayalı olarak rol ayarına uygun profesyonel yanıtlar oluşturun, konuşma tutarlılığını ve mantığını koruyun.

## Yetenekler:
1. Orijinal metin içeriğini derinlemesine anlayın ve anahtar bilgileri doğru şekilde çıkarın
2. Belirtilen rol ayarını tamamen benimseyin ve rol tutarlılığını koruyun
3. Konuşma geçmişine dayalı olarak mantıksal olarak tutarlı yanıtlar oluşturun
4. Yanıt içeriğinin orijinal metinle yüksek oranda ilgili olmasını sağlayın

## Konuşma Senaryosu:
{{scenario}}

## Rol Ayarları:
- {{roleA}}: Soru soran, bilgi ve yardım arayan
- {{roleB}}: Yanıtlayan (rolünüz), profesyonel ve ayrıntılı cevaplar sağlayan

## Orijinal Metin İçeriği:
{{chunkContent}}

## Konuşma Geçmişi:
{{conversationHistory}}

## Mevcut Durum:
Bu konuşmanın {{currentRound}}. turu (toplam {{totalRounds}} tur)

## İş Akışı:
1. Orijinal metin içeriğini dikkatlice okuyun ve temel bilgileri anlayın
2. Konuşma geçmişini gözden geçirin ve mevcut konuşma gelişimini anlayın
3. {{roleB}} rol ayarına dayalı olarak profesyonel yanıtlar oluşturun
4. Orijinal metin içeriğinden gelen bilgilere öncelik verin, ancak orijinal metin soruyu tam olarak cevaplayamıyorsa kendi profesyonel bilginizle tamamlayın

## Kısıtlamalar:
1. Birincil bilgi kaynağı olan orijinal metin içeriğine dayalı yanıtlara öncelik verin
2. Orijinal metinde ilgili bilgi bulunamadığında, kendi profesyonel bilginize dayalı değerli yanıtlar sağlayın
3. {{roleB}} rolünün tutarlılığını ve profesyonelliğini korumalısınız
4. Yanıtlar konuşma geçmişiyle mantıksal tutarlılığı korumalıdır
5. Yanıt içeriği ayrıntılı ancak aşırı uzun olmamalı, uygun uzunlukta olmalıdır
6. Kendi bilginizi kullanırken, bilgilerin doğru ve güvenilir olduğundan, rolün profesyonel standartlarını karşıladığından emin olun
7. Son tur konuşmaysa, uygun özet yapılmasına izin verilir

## Çıktı Formatı:
Aşağıdaki JSON formatını sıkı şekilde izleyin, doğru biçimlendirmeyi sağlayın:
\`\`\`json
{
  "content": "{{roleB}} için özel yanıt içeriği"
}
\`\`\`

Not:
1. Geçerli JSON formatında döndürülmelidir
2. Yalnızca content alanını içermelidir
3. content alanı değeri {{roleB}} için tam yanıttır
4. Herhangi bir ek tanımlayıcı veya format işareti içermemelidir
`;

// 生成下一輪使用者問題的提示詞
export const NEXT_QUESTION_PROMPT = `
# Role: 多輪對話使用者角色
## Profile:
- Description: 你是一名專業的對話參與者，扮演指定的使用者角色，基於已有對話歷史生成下一輪的自然問題。
- Goal: 基於對話歷史和參考資料，生成符合角色設定的後續問題，推進對話深入發展。

## Skills:
1. 分析對話歷史，識別對話發展脈絡和未涵蓋的話題
2. 完全融入指定的使用者角色設定
3. 生成自然流暢、邏輯連貫的後續問題
4. 確保問題與參考資料相關

## 對話場景設定:
{{scenario}}

## 角色設定:
- {{roleA}}: 提問者（你的角色），基於已有對話繼續深入詢問
- {{roleB}}: 回答者，提供專業回答

## 參考資料:
{{chunkContent}}

## 對話歷史:
{{conversationHistory}}

## 當前狀態:
即將開始第 {{nextRound}} 輪對話（總共 {{totalRounds}} 輪）

## Workflow:
1. 回顧完整的對話歷史，理解已討論的內容
2. 基於參考資料，識別尚未深入探討的方面
3. 從{{roleA}}的角色視角，提出自然的後續問題
4. 確保問題推進對話向更深層次發展

## Constraints:
1. 問題必須與參考資料相關，不得脫離主題
2. 必須保持{{roleA}}角色的語言風格和詢問方式
3. 問題要基於對話歷史，體現自然的對話發展
4. 避免重複之前已經問過的問題
5. 問題型別可以是：澄清細節、擴充套件討論、實際應用、相關問題等
6. 問題要簡潔明確，避免過於複雜或寬泛

## Output Format:
嚴格按照以下JSON格式輸出，確保格式正確：
\`\`\`json
{
  "question": "{{roleA}}的具體問題內容"
}
\`\`\`

注意：
1. 必須返回有效的JSON格式
2. 只包含question欄位
3. question欄位的值就是{{roleA}}的完整問題
4. 不要包含任何額外的識別符號或格式標記
`;

export const NEXT_QUESTION_PROMPT_EN = `
# Role: Multi-turn Conversation User
## Profile:
- Description: You are a professional conversation participant, playing the specified user role, generating natural follow-up questions based on existing conversation history.
- Goal: Generate follow-up questions that match the role setting based on conversation history and original text content, advancing the conversation development.

## Skills:
1. Analyze conversation history and identify conversation development and uncovered topics
2. Fully embody the specified user role setting
3. Generate natural, fluent, and logically coherent follow-up questions
4. Ensure questions are related to original text content

## Conversation Scenario:
{{scenario}}

## Role Settings:
- {{roleA}}: Questioner (your role), continuing to ask in-depth questions based on existing conversation
- {{roleB}}: Responder, providing professional answers

## Original Text Content:
{{chunkContent}}

## Conversation History:
{{conversationHistory}}

## Current Status:
About to start round {{nextRound}} of conversation (total {{totalRounds}} rounds)

## Workflow:
1. Review the complete conversation history and understand the discussed content
2. Based on original text content, identify aspects that haven't been deeply explored
3. From {{roleA}}'s role perspective, ask natural follow-up questions
4. Ensure questions advance the conversation to deeper levels

## Constraints:
1. Questions must be related to original text content, not deviating from the topic
2. Must maintain {{roleA}} role's language style and questioning approach
3. Questions should be based on conversation history, reflecting natural conversation development
4. Avoid repeating previously asked questions
5. Question types can be: clarifying details, expanding discussion, practical application, related questions, etc.
6. Questions should be concise and clear, avoiding excessive complexity or broadness

## Output Format:
Strictly follow the JSON format below, ensure correct formatting:
\`\`\`json
{
  "question": "Specific question content for {{roleA}}"
}
\`\`\`

Note:
1. Must return valid JSON format
2. Only include the question field
3. The question field value is the complete question for {{roleA}}
4. Do not include any additional identifiers or format markers
`;

export const NEXT_QUESTION_PROMPT_TR = `
# Rol: Çok Turlu Konuşma Kullanıcısı
## Profil:
- Açıklama: Belirtilen kullanıcı rolünü oynayan, mevcut konuşma geçmişine dayalı olarak doğal takip soruları oluşturan profesyonel bir konuşma katılımcısısınız.
- Hedef: Konuşma geçmişi ve orijinal metin içeriğine dayalı olarak rol ayarına uygun takip soruları oluşturun, konuşma gelişimini ilerletin.

## Yetenekler:
1. Konuşma geçmişini analiz edin ve konuşma gelişimini ve kapsanmayan konuları tanımlayın
2. Belirtilen kullanıcı rolü ayarını tamamen benimseyin
3. Doğal, akıcı ve mantıksal olarak tutarlı takip soruları oluşturun
4. Soruların orijinal metin içeriğiyle ilgili olmasını sağlayın

## Konuşma Senaryosu:
{{scenario}}

## Rol Ayarları:
- {{roleA}}: Soru soran (rolünüz), mevcut konuşmaya dayalı olarak derinlemesine sorular sormaya devam eden
- {{roleB}}: Yanıtlayan, profesyonel cevaplar sağlayan

## Orijinal Metin İçeriği:
{{chunkContent}}

## Konuşma Geçmişi:
{{conversationHistory}}

## Mevcut Durum:
Konuşmanın {{nextRound}}. turunu başlatmak üzere (toplam {{totalRounds}} tur)

## İş Akışı:
1. Tam konuşma geçmişini gözden geçirin ve tartışılan içeriği anlayın
2. Orijinal metin içeriğine dayalı olarak, henüz derinlemesine keşfedilmemiş yönleri tanımlayın
3. {{roleA}}'nın rol perspektifinden doğal takip soruları sorun
4. Soruların konuşmayı daha derin seviyelere taşımasını sağlayın

## Kısıtlamalar:
1. Sorular orijinal metin içeriğiyle ilgili olmalı, konudan sapmamalıdır
2. {{roleA}} rolünün dil stilini ve sorgulama yaklaşımını korumalısınız
3. Sorular konuşma geçmişine dayalı olmalı, doğal konuşma gelişimini yansıtmalıdır
4. Daha önce sorulan soruları tekrarlamaktan kaçının
5. Soru türleri şunlar olabilir: detayları netleştirme, tartışmayı genişletme, pratik uygulama, ilgili sorular vb.
6. Sorular kısa ve net olmalı, aşırı karmaşıklık veya genişlikten kaçınmalıdır

## Çıktı Formatı:
Aşağıdaki JSON formatını sıkı şekilde izleyin, doğru biçimlendirmeyi sağlayın:
\`\`\`json
{
  "question": "{{roleA}} için özel soru içeriği"
}
\`\`\`

Not:
1. Geçerli JSON formatında döndürülmelidir
2. Yalnızca question alanını içermelidir
3. question alanı değeri {{roleA}} için tam sorudur
4. Herhangi bir ek tanımlayıcı veya format işareti içermemelidir
`;

/**
 * 生成助手回覆的提示詞
 * @param {string} language - 語言，'en' 或 '中文'
 * @param {Object} params - 引數物件
 * @param {string} params.scenario - 對話場景
 * @param {string} params.roleA - 角色A設定
 * @param {string} params.roleB - 角色B設定
 * @param {string} params.chunkContent - 參考資料
 * @param {string} params.conversationHistory - 對話歷史
 * @param {number} params.currentRound - 當前輪數
 * @param {number} params.totalRounds - 總輪數
 * @param {string} projectId - 專案ID
 * @returns {string} - 完整的提示詞
 */
export async function getAssistantReplyPrompt(
  language,
  { scenario, roleA, roleB, chunkContent, conversationHistory, currentRound, totalRounds },
  projectId = null
) {
  let chunck = '';
  if (
    chunkContent.includes('This text block is used to store questions generated through data distillation') ||
    !chunkContent
  ) {
    const messages = {
      en: 'No reference materials available. Please generate a reply based on your own knowledge.',
      tr: 'Kullanılabilir referans materyal yok. Lütfen kendi bilginize dayalı bir yanıt oluşturun.',
      zh: '沒有可用的參考資料，請根據自己的知識直接生成回覆'
    };
    chunck = messages[language] || messages.zh;
  }
  const result = await processPrompt(
    language,
    'multiTurnConversation',
    'ASSISTANT_REPLY_PROMPT',
    { zh: ASSISTANT_REPLY_PROMPT, en: ASSISTANT_REPLY_PROMPT_EN, tr: ASSISTANT_REPLY_PROMPT_TR },
    {
      scenario,
      roleA,
      roleB,
      chunkContent: chunck,
      conversationHistory,
      currentRound,
      totalRounds
    },
    projectId
  );
  return result;
}

/**
 * 生成下一輪使用者問題的提示詞
 * @param {string} language - 語言，'en' 或 '中文'
 * @param {Object} params - 引數物件
 * @param {string} params.scenario - 對話場景
 * @param {string} params.roleA - 角色A設定
 * @param {string} params.roleB - 角色B設定
 * @param {string} params.chunkContent - 參考資料
 * @param {string} params.conversationHistory - 對話歷史
 * @param {number} params.nextRound - 下一輪數
 * @param {number} params.totalRounds - 總輪數
 * @param {string} projectId - 專案ID
 * @returns {string} - 完整的提示詞
 */
export async function getNextQuestionPrompt(
  language,
  { scenario, roleA, roleB, chunkContent, conversationHistory, nextRound, totalRounds },
  projectId = null
) {
  let chunck = '';
  if (
    chunkContent.includes('This text block is used to store questions generated through data distillation') ||
    !chunkContent
  ) {
    const messages = {
      en: 'No reference materials available. Please generate a reply based on your own knowledge.',
      tr: 'Kullanılabilir referans materyal yok. Lütfen kendi bilginize dayalı bir yanıt oluşturun.',
      zh: '沒有可用的參考資料，請根據自己的知識直接生成回覆'
    };
    chunck = messages[language] || messages.zh;
  }
  const result = await processPrompt(
    language,
    'multiTurnConversation',
    'NEXT_QUESTION_PROMPT',
    { zh: NEXT_QUESTION_PROMPT, en: NEXT_QUESTION_PROMPT_EN, tr: NEXT_QUESTION_PROMPT_TR },
    {
      scenario,
      roleA,
      roleB,
      chunkContent: chunck,
      conversationHistory,
      nextRound,
      totalRounds
    },
    projectId
  );
  return result;
}

export default {
  getAssistantReplyPrompt,
  getNextQuestionPrompt
};
