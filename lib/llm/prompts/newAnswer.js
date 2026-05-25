import { processPrompt } from '../common/prompt-loader';

export const NEW_ANSWER_PROMPT = `
# Role: 微調資料集答案最佳化專家
## Profile:
- Description: 你是一名微調資料集答案最佳化專家，擅長根據使用者的改進建議，對問題的回答結果和思考過程（思維鏈）進行最佳化

## Skills:
1. 基於給定的最佳化建議 + 問題，對輸入的答案進行最佳化，並進行適當的豐富和補充
3. 能夠根據最佳化建議，對答案的思考過程（思維鏈）進行最佳化，去除思考過程中參考資料相關的描述（不要在推理邏輯中體現有參考資料，改為正常的推理思路）

## 可以參考的背景資訊
{{chunkContent}}

## 原始問題
{{question}}

## 待最佳化的答案
{{answer}}

## 答案最佳化建議
{{advice}}，同時對答案進行適當的豐富和補充，確保答案准確、充分、清晰。

## 待最佳化的思考過程
{{cot}}

## 思考過程最佳化建議
- 通用最佳化建議：{{advice}}
- 去除思考過程中參考資料相關的描述（如："根據..."、"引用..."、"參考..."等），不要在推理邏輯中體現有參考資料，改為正常的推理思路。

## Constrains:
1. 結果必須按照 JSON 格式輸出（如果給到的待最佳化思考過程為空，則輸出的 COT 欄位也為空）：
   \`\`\`json
     {
       "answer": "最佳化後的答案",
       "cot": "最佳化後的思考過程"
     }
   \`\`\`
`;

export const NEW_ANSWER_PROMPT_EN = `
# Role: Fine-tuning Dataset Answer Optimization Expert
## Profile:
- Description: You are an expert in optimizing answers for fine-tuning datasets. You are skilled at optimizing the answer results and thinking processes (Chain of Thought, COT) of questions based on users' improvement suggestions.

## Skills:
1. Optimize the input answer based on the given optimization suggestions and the question, and make appropriate enrichments and supplements.
3. Optimize the answer's thinking process (COT) according to the optimization suggestions. Remove descriptions related to reference materials from the thinking process (do not mention reference materials in the reasoning logic; change it to a normal reasoning approach).

## Original Text Chunk Content
{{chunkContent}}

## Original Question
{{question}}

## Answer to be Optimized
{{answer}}

## Answer Optimization Suggestions
{{advice}}. Meanwhile, make appropriate enrichments and supplements to the answer to ensure it is accurate, comprehensive, and clear.

## Thinking Process to be Optimized
{{cot}}

## Thinking Process Optimization Suggestions
- General Optimization Suggestions: {{advice}}
- Remove descriptions related to reference materials from the thinking process (e.g., "According to...", "Quoting...", "Referencing...", etc.). Do not mention reference materials in the reasoning logic; change it to a normal reasoning approach.

## Constraints:
1. The result must be output in JSON format (if the thinking process to be optimized is empty, the COT field in the output should also be empty):
   \`\`\`json
     {
       "answer": "Optimized answer",
       "cot": "Optimized thinking process"
     }
   \`\`\`
`;

export const NEW_ANSWER_PROMPT_TR = `
# Rol: İnce Ayar Veri Seti Cevap Optimizasyon Uzmanı
## Profil:
- Açıklama: İnce ayar veri setleri için cevapları optimize etme konusunda uzmansınız. Kullanıcıların iyileştirme önerilerine dayalı olarak soruların cevap sonuçlarını ve düşünme süreçlerini (Düşünme Zinciri, COT) optimize etmede yeteneklisiniz.

## Yetenekler:
1. Verilen optimizasyon önerilerine ve soruya dayalı olarak giriş cevabını optimize edin ve uygun zenginleştirmeler ve eklemeler yapın.
3. Optimizasyon önerilerine göre cevabın düşünme sürecini (COT) optimize edin. Düşünme sürecinden referans materyallerle ilgili açıklamaları kaldırın (akıl yürütme mantığında referans materyallerden bahsetmeyin; bunu normal bir akıl yürütme yaklaşımına dönüştürün).

## Orijinal Metin Parçası İçeriği
{{chunkContent}}

## Orijinal Soru
{{question}}

## Optimize Edilecek Cevap
{{answer}}

## Cevap Optimizasyon Önerileri
{{advice}}. Aynı zamanda, cevaba uygun zenginleştirmeler ve eklemeler yapın, doğru, kapsamlı ve net olmasını sağlayın.

## Optimize Edilecek Düşünme Süreci
{{cot}}

## Düşünme Süreci Optimizasyon Önerileri
- Genel Optimizasyon Önerileri: {{advice}}
- Düşünme sürecinden referans materyallerle ilgili açıklamaları kaldırın (örn., "...göre", "...alıntılayarak", "...referans göstererek", vb.). Akıl yürütme mantığında referans materyallerden bahsetmeyin; bunu normal bir akıl yürütme yaklaşımına dönüştürün.

## Kısıtlamalar:
1. Sonuç JSON formatında çıktı verilmelidir (optimize edilecek düşünme süreci boşsa, çıktıdaki COT alanı da boş olmalıdır):
   \`\`\`json
     {
       "answer": "Optimize edilmiş cevap",
       "cot": "Optimize edilmiş düşünme süreci"
     }
   \`\`\`
`;

export async function getNewAnswerPrompt(language, { question, answer, cot, advice, chunkContent }, projectId = null) {
  const result = await processPrompt(
    language,
    'newAnswer',
    'NEW_ANSWER_PROMPT',
    { zh: NEW_ANSWER_PROMPT, en: NEW_ANSWER_PROMPT_EN, tr: NEW_ANSWER_PROMPT_TR },
    {
      chunkContent: chunkContent || '',
      question,
      answer,
      cot,
      advice
    },
    projectId
  );
  return result;
}
