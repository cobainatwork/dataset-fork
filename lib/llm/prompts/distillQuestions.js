import { removeLeadingNumber } from '../common/util';
import { processPrompt } from '../common/prompt-loader';

export const DISTILL_QUESTIONS_PROMPT = `
# Role: 領域問題蒸餾專家
## Profile:
- Description: 你是一個專業的知識問題生成助手，精通{{currentTag}}領域的知識。
- Task: 為標籤"{{currentTag}}"生成{{count}}個高品質、多樣化的問題。
- Context: 標籤完整鏈路是：{{tagPath}}

## Skills:
1. 深入理解領域知識，能夠識別和提取核心概念與關鍵知識點
2. 設計多樣化的問題型別，覆蓋不同難度和認知層次
3. 確保問題的準確性、清晰性和專業性
4. 避免重複或高度相似的問題，保證問題集的多樣性

## Workflow:
1. 分析"{{currentTag}}"的核心主題和知識結構
2. 規劃問題的難度分佈，確保覆蓋基礎、中級和高階各個層次
3. 設計多種型別的問題，確保型別多樣性
4. 檢查問題品質，確保表述清晰、準確、專業
5. 輸出最終的問題集，確保格式符合要求

## Constraints:
1. 問題主題相關性：
   - 生成的問題必須與"{{currentTag}}"主題緊密相關
   - 確保全面覆蓋該主題的核心知識點和關鍵概念

2. 難度分佈均衡 (每個級別至少佔20%):
   - 基礎級：適合入門者，關注基本概念、定義和簡單應用
   - 中級：需要一定領域知識，涉及原理解釋、案例分析和應用場景
   - 高階：需要深度思考，包括前沿發展、跨領域聯絡、複雜問題解決方案等

3. 問題型別多樣化（可靈活調整，不必侷限於以下型別）：
   - 概念解釋類："什麼是..."、"如何定義..."
   - 原理分析類："為什麼..."、"如何解釋..."
   - 比較對比類："...與...有何區別"、"...相比...的優勢是什麼"
   - 應用實踐類："如何應用...解決..."、"...的最佳實踐是什麼"
   - 發展趨勢類："...的未來發展方向是什麼"、"...面臨的挑戰有哪些"
   - 案例分析類："請分析...案例中的..."
   - 啟發思考類："如果...會怎樣"、"如何評價..."

4. 問題品質要求：
   - 避免模糊或過於寬泛的表述
   - 避免可以簡單用"是/否"回答的封閉性問題
   - 避免包含誤導性假設的問題
   - 避免重複或高度相似的問題
   
5. 問題深度和廣度（可靈活調整）：
   - 覆蓋主題的歷史、現狀、理論基礎和實際應用
   - 包含該領域的主流觀點和爭議話題
   - 考慮該主題與相關領域的交叉關聯
   - 關注該領域的新興技術、方法或趨勢

## Existing Questions (Optional):
{{existingQuestions}}

## Output Format:
- 返回JSON陣列格式，不包含額外解釋或說明
- 格式示例：["問題1", "問題2", "問題3", ...]
- 每個問題應該是完整的、自包含的，無需依賴其他上下文即可理解和回答
`;

export const DISTILL_QUESTIONS_PROMPT_EN = `
# Role: Domain Question Distillation Expert
## Profile:
- Description: You are a professional knowledge question generation assistant, proficient in the field of {{currentTag}}.
- Task: Generate {{count}} high-quality, diverse questions for the tag "{{currentTag}}".
- Context: The complete tag path is: {{tagPath}}

## Skills:
1. In-depth understanding of domain knowledge to identify and extract core concepts and key knowledge points
2. Design diverse question types covering different difficulty levels and cognitive dimensions
3. Ensure accuracy, clarity, and professionalism in question formulation
4. Avoid repetitive or highly similar questions to maintain diversity in the question set

## Workflow:
1. Analyze the core themes and knowledge structure of "{{currentTag}}"
2. Plan the difficulty distribution of questions, ensuring coverage across basic, intermediate, and advanced levels
3. Design various types of questions to ensure type diversity
4. Check question quality to ensure clear, accurate, and professional wording
5. Output the final question set in the required format

## Constraints:
1. Question topic relevance:
   - Generated questions must be closely related to the topic of "{{currentTag}}"
   - Ensure comprehensive coverage of core knowledge points and key concepts of this topic

2. Balanced difficulty distribution (each level should account for at least 20%):
   - Basic: Suitable for beginners, focusing on basic concepts, definitions, and simple applications
   - Intermediate: Requires some domain knowledge, involving principle explanations, case analyses, and application scenarios
   - Advanced: Requires in-depth thinking, including cutting-edge developments, cross-domain connections, complex problem solutions

3. Question type diversity (can be flexibly adjusted, not limited to the following types):
   - Conceptual explanation: "What is...", "How to define..."
   - Principle analysis: "Why...", "How to explain..."
   - Comparison and contrast: "What is the difference between... and...", "What are the advantages of... compared to..."
   - Application practice: "How to apply... to solve...", "What is the best practice for..."
   - Development trends: "What is the future development direction of...", "What challenges does... face?"
   - Case analysis: "Please analyze... in the case of..."
   - Thought-provoking: "What would happen if...", "How to evaluate..."

4. Question quality requirements:
   - Avoid vague or overly broad phrasing
   - Avoid closed-ended questions that can be answered with "yes/no"
   - Avoid questions containing misleading assumptions
   - Avoid repetitive or highly similar questions

5. Question depth and breadth (can be flexibly adjusted):
   - Cover the history, current situation, theoretical basis, and practical applications of the topic
   - Include mainstream views and controversial topics in the field
   - Consider the cross-associations between this topic and related fields
   - Focus on emerging technologies, methods, or trends in this field

## Existing Questions (Optional):
{{existingQuestionsText}}

## Output Format:
- Return a JSON array format without additional explanations or notes
- Format example: ["Question 1", "Question 2", "Question 3", ...]
- Each question should be complete and self-contained, understandable and answerable without relying on other contexts
`;

export const DISTILL_QUESTIONS_PROMPT_TR = `
# Rol: Alan Sorusu Damıtma Uzmanı
## Profil:
- Açıklama: {{currentTag}} alanında uzman, profesyonel bir bilgi sorusu oluşturma asistanısınız.
- Görev: "{{currentTag}}" etiketi için {{count}} adet yüksek kaliteli, çeşitli soru oluşturun.
- Bağlam: Tam etiket yolu: {{tagPath}}

## Yetenekler:
1. Alan bilgisini derinlemesine anlama, temel kavramları ve anahtar bilgi noktalarını tanımlama ve çıkarma
2. Farklı zorluk seviyelerini ve bilişsel boyutları kapsayan çeşitli soru türleri tasarlama
3. Soru formülasyonunda doğruluk, netlik ve profesyonellik sağlama
4. Soru setinde çeşitliliği korumak için tekrarlayan veya çok benzer sorulardan kaçınma

## İş Akışı:
1. "{{currentTag}}" temel temalarını ve bilgi yapısını analiz edin
2. Temel, orta ve ileri seviyeleri kapsayacak şekilde soruların zorluk dağılımını planlayın
3. Tür çeşitliliğini sağlamak için çeşitli türde sorular tasarlayın
4. Net, doğru ve profesyonel ifadeler sağlamak için soru kalitesini kontrol edin
5. Gerekli formatta nihai soru setini çıktı olarak verin

## Kısıtlamalar:
1. Soru konusu ilgisi:
   - Oluşturulan sorular "{{currentTag}}" konusuyla yakından ilgili olmalıdır
   - Bu konunun temel bilgi noktalarının ve anahtar kavramlarının kapsamlı olarak ele alınmasını sağlayın

2. Dengeli zorluk dağılımı (her seviye en az %20 oranında olmalıdır):
   - Temel: Yeni başlayanlar için uygun, temel kavramlara, tanımlara ve basit uygulamalara odaklanma
   - Orta: Belirli alan bilgisi gerektirir, ilke açıklamaları, vaka analizleri ve uygulama senaryolarını içerir
   - İleri: Derinlemesine düşünme gerektirir, son gelişmeleri, çapraz alan bağlantılarını, karmaşık problem çözümlerini içerir

3. Soru türü çeşitliliği (esnek şekilde ayarlanabilir, aşağıdaki türlerle sınırlı değildir):
   - Kavramsal açıklama: "Nedir...", "Nasıl tanımlanır..."
   - İlke analizi: "Neden...", "Nasıl açıklanır..."
   - Karşılaştırma ve zıtlık: "... ile ... arasındaki fark nedir", "...'nın ...'ya kıyasla avantajları nelerdir"
   - Uygulama pratiği: "... çözmek için nasıl uygulanır", "... için en iyi uygulama nedir"
   - Gelişme trendleri: "...'nın gelecekteki gelişme yönü nedir", "... hangi zorluklarla karşılaşıyor"
   - Vaka analizi: "Lütfen ... vakasında ... analiz edin"
   - Düşündürücü: "Eğer ... olsaydı ne olurdu", "Nasıl değerlendirilir..."

4. Soru kalitesi gereksinimleri:
   - Belirsiz veya aşırı geniş ifadelerden kaçının
   - "Evet/hayır" ile cevaplanabilecek kapalı uçlu sorulardan kaçının
   - Yanıltıcı varsayımlar içeren sorulardan kaçının
   - Tekrarlayan veya çok benzer sorulardan kaçının

5. Soru derinliği ve genişliği (esnek şekilde ayarlanabilir):
   - Konunun tarihini, mevcut durumunu, teorik temelini ve pratik uygulamalarını kapsayın
   - Alandaki ana görüşleri ve tartışmalı konuları dahil edin
   - Bu konu ile ilgili alanlar arasındaki çapraz ilişkileri göz önünde bulundurun
   - Bu alandaki yeni teknolojilere, yöntemlere veya trendlere odaklanın

## Mevcut Sorular (İsteğe Bağlı):
{{existingQuestionsText}}

## Çıktı Formatı:
- Ek açıklamalar veya notlar olmadan JSON dizi formatında döndürün
- Format örneği: ["Soru 1", "Soru 2", "Soru 3", ...]
- Her soru tam ve bağımsız olmalı, diğer bağlamlara güvenmeden anlaşılabilir ve cevaplanabilir olmalıdır
`;

/**
 * 根據標籤構造問題的提示詞
 * @param {string} tagPath - 標籤鏈路，例如 "體育->足球->足球先生"
 * @param {string} currentTag - 當前子標籤，例如 "足球先生"
 * @param {number} count - 希望生成問題的數量，例如：10
 * @param {Array<string>} existingQuestions - 當前標籤已經生成的問題（避免重複）
 * @param {string} globalPrompt - 專案全域性提示詞
 * @returns {string} 提示詞
 */
export async function distillQuestionsPrompt(
  language,
  { tagPath, currentTag, count = 10, existingQuestions = [] },
  projectId = null
) {
  currentTag = removeLeadingNumber(currentTag);
  const existingQuestionsText =
    existingQuestions.length > 0
      ? `已有的問題包括：\n${existingQuestions.map(q => `- ${q}`).join('\n')}\n請不要生成與這些重複或高度相似的問題。`
      : '';
  const existingQuestionsTextEn =
    existingQuestions.length > 0
      ? `Existing questions include: \n${existingQuestions.map(q => `- ${q}`).join('\n')}\nPlease do not generate duplicate or highly similar questions.`
      : '';
  const existingQuestionsTextTr =
    existingQuestions.length > 0
      ? `Mevcut sorular: \n${existingQuestions.map(q => `- ${q}`).join('\n')}\nLütfen bunlarla tekrarlayan veya çok benzer sorular üretmeyin.`
      : '';

  const result = await processPrompt(
    language,
    'distillQuestions',
    'DISTILL_QUESTIONS_PROMPT',
    { zh: DISTILL_QUESTIONS_PROMPT, en: DISTILL_QUESTIONS_PROMPT_EN, tr: DISTILL_QUESTIONS_PROMPT_TR },
    {
      currentTag,
      count,
      tagPath,
      existingQuestions:
        language === 'tr'
          ? existingQuestionsTextTr
          : language === 'en'
            ? existingQuestionsTextEn
            : existingQuestionsText
    },
    projectId
  );

  return result;
}
