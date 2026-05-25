import { processPrompt } from '../common/prompt-loader';

export const OPTIMIZE_COT_PROMPT = `
# Role: 思維鏈最佳化專家
## Profile:
- Description: 你是一位擅長最佳化思維鏈的專家，能夠對給定的思維鏈進行處理，去除其中的參考引用相關話術，使其呈現為一個正常的推理過程。

## Skills:
1. 準確識別並去除思維鏈中的參考引用話術。
2. 確保最佳化後的思維鏈邏輯連貫、推理合理。
3. 維持思維鏈與原始問題和答案的相關性。

## Workflow:
1. 仔細研讀原始問題、答案和最佳化前的思維鏈。
2. 識別思維鏈中所有參考引用相關的表述，如"參考 XX 資料""文件中提及 XX""參考內容中提及 XXX"等。
3. 去除這些引用話術，同時調整語句，保證思維鏈的邏輯連貫性。
4. 檢查最佳化後的思維鏈是否仍然能夠合理地推匯出答案，並且與原始問題緊密相關。

## 原始問題
{{originalQuestion}}

## 答案
{{answer}}

## 最佳化前的思維鏈
{{originalCot}}

## Constrains:
1. 最佳化後的思維鏈必須去除所有參考引用相關話術。
2. 思維鏈的邏輯推理過程必須完整且合理。
3. 最佳化後的思維鏈必須與原始問題和答案保持緊密關聯。
4. 給出的答案不要包含 "最佳化後的思維鏈" 這樣的話術，直接給出最佳化後的思維鏈結果。
5. 思維鏈應按照正常的推理思路返回，如：先分析理解問題的本質，按照 "首先、然後、接著、另外、最後" 等步驟逐步思考，展示一個完善的推理過程。
`;

export const OPTIMIZE_COT_PROMPT_EN = `
# Role: Chain of Thought Optimization Expert
## Profile:
- Description: You are an expert in optimizing the chain of thought. You can process the given chain of thought, remove the reference and citation-related phrases in it, and present it as a normal reasoning process.

## Skills:
1. Accurately identify and remove the reference and citation-related phrases in the chain of thought.
2. Ensure that the optimized chain of thought is logically coherent and reasonably reasoned.
3. Maintain the relevance of the chain of thought to the original question and answer.

## Workflow:
1. Carefully study the original question, the answer, and the pre-optimized chain of thought.
2. Identify all the reference and citation-related expressions in the chain of thought, such as "Refer to XX material", "The document mentions XX", "The reference content mentions XXX", etc.
3. Remove these citation phrases and adjust the sentences at the same time to ensure the logical coherence of the chain of thought.
4. Check whether the optimized chain of thought can still reasonably lead to the answer and is closely related to the original question.

## Original Question
{{originalQuestion}}

## Answer
{{answer}}

## Pre-optimized Chain of Thought
{{originalCot}}

## Constrains:
1. The optimized chain of thought must remove all reference and citation-related phrases.
2. The logical reasoning process of the chain of thought must be complete and reasonable.
3. The optimized chain of thought must maintain a close association with the original question and answer.
4. The provided answer should not contain phrases like "the optimized chain of thought". Directly provide the result of the optimized chain of thought.
5. The chain of thought should be returned according to a normal reasoning approach. For example, first analyze and understand the essence of the problem, and gradually think through steps such as "First, Then, Next, Additionally, Finally" to demonstrate a complete reasoning process.
`;

export const OPTIMIZE_COT_PROMPT_TR = `
# Rol: Düşünme Zinciri Optimizasyon Uzmanı
## Profil:
- Açıklama: Düşünme zincirini optimize etme konusunda uzmansınız. Verilen düşünme zincirini işleyebilir, içindeki referans ve alıntıyla ilgili ifadeleri kaldırabilir ve normal bir akıl yürütme süreci olarak sunabilirsiniz.

## Yetenekler:
1. Düşünme zincirindeki referans ve alıntıyla ilgili ifadeleri doğru şekilde tanımlayın ve kaldırın.
2. Optimize edilmiş düşünme zincirinin mantıksal olarak tutarlı ve makul bir şekilde gerekçelendirildiğinden emin olun.
3. Düşünme zincirinin orijinal soru ve cevapla ilgisini koruyun.

## İş Akışı:
1. Orijinal soruyu, cevabı ve optimize edilmemiş düşünme zincirini dikkatlice inceleyin.
2. Düşünme zincirindeki tüm referans ve alıntıyla ilgili ifadeleri tanımlayın, örneğin "XX materyaline başvur", "Belgede XX'den bahsediyor", "Referans içerikte XXX'den bahsediyor", vb.
3. Bu alıntı ifadelerini kaldırın ve aynı zamanda cümleleri ayarlayın, düşünme zincirinin mantıksal tutarlılığını sağlayın.
4. Optimize edilmiş düşünme zincirinin hala makul bir şekilde cevaba yol açıp açmadığını ve orijinal soruyla yakından ilgili olup olmadığını kontrol edin.

## Orijinal Soru
{{originalQuestion}}

## Cevap
{{answer}}

## Optimize Edilmemiş Düşünme Zinciri
{{originalCot}}

## Kısıtlamalar:
1. Optimize edilmiş düşünme zinciri tüm referans ve alıntıyla ilgili ifadeleri kaldırmalıdır.
2. Düşünme zincirinin mantıksal akıl yürütme süreci eksiksiz ve makul olmalıdır.
3. Optimize edilmiş düşünme zinciri orijinal soru ve cevapla yakın ilişkisini korumalıdır.
4. Sağlanan cevap "optimize edilmiş düşünme zinciri" gibi ifadeler içermemelidir. Doğrudan optimize edilmiş düşünme zincirinin sonucunu sağlayın.
5. Düşünme zinciri normal bir akıl yürütme yaklaşımına göre döndürülmelidir. Örneğin, önce problemin özünü analiz edin ve anlayın, ve tam bir akıl yürütme sürecini göstermek için "İlk olarak, Sonra, Ardından, Ek olarak, Son olarak" gibi adımlarla kademeli olarak düşünün.
`;

/**
 * 獲取思維鏈最佳化提示詞
 * @param {string} language - 語言標識
 * @param {Object} params - 引數物件
 * @param {string} params.originalQuestion - 原始問題
 * @param {string} params.answer - 答案
 * @param {string} params.originalCot - 原始思維鏈
 * @param {string} projectId - 專案ID，用於獲取自定義提示詞
 * @returns {Promise<string>} - 完整的提示詞
 */
export async function getOptimizeCotPrompt(language, { originalQuestion, answer, originalCot }, projectId = null) {
  const result = await processPrompt(
    language,
    'optimizeCot',
    'OPTIMIZE_COT_PROMPT',
    { zh: OPTIMIZE_COT_PROMPT, en: OPTIMIZE_COT_PROMPT_EN, tr: OPTIMIZE_COT_PROMPT_TR },
    { originalQuestion, answer, originalCot },
    projectId
  );
  return result;
}
