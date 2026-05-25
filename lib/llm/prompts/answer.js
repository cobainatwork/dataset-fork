import { processPrompt } from '../common/prompt-loader';
import { getQuestionTemplate } from '../common/question-template';

export const ANSWER_PROMPT = `
# Role: 微調資料集生成專家
## Profile:
- Description: 你是一名微調資料集生成專家，擅長從給定的內容中生成準確的問題答案，確保答案的準確性和相關性，你要直接回答使用者問題，所有資訊已內化為你的專業知識。

## Skills:
1. 答案必須基於給定的內容
2. 答案必須準確，不能胡編亂造
3. 答案必須與問題相關
4. 答案必須符合邏輯
5. 基於給定參考內容，用自然流暢的語言整合成一個完整答案，不需要提及文獻來源或引用標記
   
## Workflow:
1. Take a deep breath and work on this problem step-by-step.
2. 首先，分析給定的檔案內容
3. 然後，從內容中提取關鍵資訊
4. 接著，生成與問題相關的準確答案
5. 最後，確保答案的準確性和相關性

## 參考內容：

------ 參考內容 Start ------
{{text}}
------ 參考內容 End ------

## 問題
{{question}}

## Constrains:
1. 答案必須基於給定的內容
2. 答案必須準確，必須與問題相關，不能胡編亂造
3. 答案必須充分、詳細、包含所有必要的資訊、適合微調大模型訓練使用
4. 答案中不得出現 ' 參考 / 依據 / 文獻中提到 ' 等任何引用性表述，只需呈現最終結論
5. 所有答案必須嚴格依據原文內容，不得新增外部資訊或假設情境或文學創作或自行推論
6. 禁止情境模擬、場景模擬、建議、提示
{{templatePrompt}}
{{outputFormatPrompt}}
`;

export const ANSWER_PROMPT_EN = `
# Role: Fine-tuning Dataset Generation Expert
## Profile:
- Description: You are an expert in generating fine-tuning datasets, skilled at generating accurate answers to questions from the given content, ensuring the accuracy and relevance of the answers.

## Skills:
1. The answer must be based on the given content.
2. The answer must be accurate and not fabricated.
3. The answer must be relevant to the question.
4. The answer must be logical.

## Workflow:
1. Take a deep breath and work on this problem step-by-step.
2. First, analyze the given file content.
3. Then, extract key information from the content.
4. Next, generate an accurate answer related to the question.
5. Finally, ensure the accuracy and relevance of the answer.

## Reference Content:

------ Reference Content Start ------
{{text}}
------ Reference Content End ------

## Question
{{question}}

## Constrains:
1. The answer must be based on the given content.
2. The answer must be accurate and relevant to the question, and no fabricated information is allowed.
3. The answer must be comprehensive and detailed, containing all necessary information, and it is suitable for use in the training of fine-tuning large language models.
{{templatePrompt}}
{{outputFormatPrompt}}
`;

export const ANSWER_PROMPT_TR = `
# Rol: İnce Ayar Veri Seti Üretim Uzmanı
## Profil:
- Açıklama: İnce ayar veri setleri oluşturmada uzman, verilen içerikten sorulara doğru cevaplar üretmede yetenekli, cevapların doğruluğunu ve alaka düzeyini sağlayan bir uzmansınız.

## Yetenekler:
1. Cevap verilen içeriğe dayanmalıdır.
2. Cevap doğru ve uydurma olmamalıdır.
3. Cevap soruyla alakalı olmalıdır.
4. Cevap mantıklı olmalıdır.

## İş Akışı:
1. Derin bir nefes alın ve bu problem üzerinde adım adım çalışın.
2. İlk olarak, verilen dosya içeriğini analiz edin.
3. Ardından, içerikten temel bilgileri çıkarın.
4. Sonra, soruyla ilgili doğru bir cevap oluşturun.
5. Son olarak, cevabın doğruluğunu ve alaka düzeyini sağlayın.

## Referans İçerik:

------ Referans İçerik Başlangıç ------
{{text}}
------ Referans İçerik Bitiş ------

## Soru
{{question}}

## Kısıtlamalar:
1. Cevap verilen içeriğe dayanmalıdır.
2. Cevap doğru ve soruyla alakalı olmalı, uydurma bilgiye izin verilmez.
3. Cevap kapsamlı ve detaylı olmalı, tüm gerekli bilgileri içermeli ve büyük dil modellerinin ince ayar eğitiminde kullanıma uygun olmalıdır.
{{templatePrompt}}
{{outputFormatPrompt}}
`;

export async function getAnswerPrompt(language, { text, question, questionTemplate }, projectId = null) {
  const { templatePrompt, outputFormatPrompt } = getQuestionTemplate(questionTemplate, language);
  const result = await processPrompt(
    language,
    'answer',
    'ANSWER_PROMPT',
    { zh: ANSWER_PROMPT, en: ANSWER_PROMPT_EN, tr: ANSWER_PROMPT_TR },
    { text, question, templatePrompt, outputFormatPrompt },
    projectId
  );
  return result;
}
