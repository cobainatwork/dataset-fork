/**
 * Genre-Audience (GA) 對生成提示詞 (中文版)
 * 基於 MGA (Massive Genre-Audience) 資料增強方法
 */

import { processPrompt } from '../common/prompt-loader';

export const GA_GENERATION_PROMPT = `
# Role: 體裁與受眾設計專家
## Profile:
- Description: 你是一名擅長內容分析與創意提煉的專家，能夠依據文字內容設計出多樣且高品質的 [體裁]-[受眾] 組合，以支撐問題生成與風格化回答。
- Output Goal: 生成 5 對獨特且互相區分的 [體裁]-[受眾] 組合。

## Skills:
1. 深入理解原文的主題、結構、語調與潛在價值。
2. 具備豐富的體裁知識，能夠從事實概念、分析推理、評估創造、操作指導等角度設計差異化提問風格。
3. 善於刻畫受眾畫像，涵蓋不同年齡、背景、動機與學習需求，避免單一視角。
4. 輸出資訊清晰、完整，且便於下游系統直接使用。

## Workflow:
1. **文字洞察**：通讀原文，分析寫作風格、資訊密度、可延展方向。
2. **場景構思**：設想至少 5 種學習或探究場景，思考如何在保留核心資訊的前提下拓展體裁與受眾的多樣性。
3. **組合設計**：為每個場景分別生成獨立的體裁與對應受眾描述，確保兩者之間具有明確匹配邏輯。
4. **重複校驗**：確認 5 對組合在體裁型別、表達風格、受眾畫像上均無重複或高度相似項。

## Constraints:
1. 每對組合必須包含詳細的體裁標題與 2-3 句描述，突出語言風格、情緒基調、表達形式等要素；禁止使用視覺類體裁（如漫畫、影片）。
2. 每個受眾需提供 2 句描述，涵蓋其背景特徵、認知水平、興趣點與期望目標；需兼顧積極與冷淡受眾，體現多元化。
3. 體裁與受眾的匹配需自然合理，能夠指導後續的問題風格與回答方式。
4. 輸出不得包含與原文無關的臆測，不得沿用已有組合模板。
5. 必須嚴格返回 5 對組合，順序不限，但禁止出現額外說明文字。

## Output Format:
- 僅返回合法 JSON 陣列，陣列長度為 5。
- 每個元素包含 \`genre\` 與 \`audience\` 兩個物件，均需包含 \`title\` 與 \`description\` 欄位。
- 參考結構如下：
\`\`\`
[
  {
    "genre": {"title": "體裁標題", "description": "體裁描述"},
    "audience": {"title": "受眾標題", "description": "受眾描述"}
  }
]
\`\`\`

## Examples:
- 體裁示例：“深究原因型” —— 描述聚焦於“為什麼/如何”類提問，強調邏輯鏈條與原理闡述。
- 受眾示例：“對技術細節好奇的工程師實習生” —— 描述其背景、動機與學習目標。

## Source Text to Analyze:
{{text}}
`;

export const GA_GENERATION_PROMPT_EN = `
# Role: Genre & Audience Design Specialist
## Profile:
- Description: You are an expert in content analysis and creative abstraction, capable of crafting diverse, high-quality [Genre]-[Audience] pairings based on the source text to support question generation and stylized responses.
- Output Goal: Produce 5 distinctive [Genre]-[Audience] pairs with clear differentiation.

## Skills:
1. Derive deep insights about the topic, structure, tone, and potential value of the source text.
2. Possess extensive genre knowledge, spanning factual recall, conceptual understanding, analytical reasoning, evaluative creation, instructional guidance, etc., to design varied questioning styles.
3. Portray audiences across age, expertise, motivation, and engagement levels, ensuring multi-perspective coverage.
4. Communicate clearly and precisely so downstream systems can consume the output directly.

## Workflow:
1. **Text Insight**: Read the passage thoroughly to analyze style, information density, and extensibility.
2. **Scenario Ideation**: Imagine at least 5 learning or inquiry scenarios that broaden genre and audience diversity while preserving core information.
3. **Pair Construction**: For each scenario, create a dedicated genre and a matching audience description with an explicit logical connection.
4. **Redundancy Check**: Ensure all 5 pairs are distinct in genre style, tone, and audience profile with no repetition or near-duplicates.

## Constraints:
1. Each genre must include a title and a 2-3 sentence description emphasizing language style, emotional tone, delivery format, etc.; exclude visual formats (e.g., comics, video).
2. Each audience must include a two-sentence profile describing background traits, knowledge level, motivations, and desired outcomes; represent both enthusiastic and lukewarm audiences to highlight diversity.
3. Genre and audience within each pair must be naturally aligned to guide subsequent question style and answer adaptation.
4. Do not infer content unrelated to the source text or reuse existing pair templates; ensure originality.
5. Return exactly 5 pairs with no additional commentary or formatting beyond the specified JSON structure.

## Output Format:
- Respond with a valid JSON array of length 5.
- Each element must contain \`genre\` and \`audience\` objects, both with \`title\` and \`description\` fields.
- Follow the example structure:
\`\`\`
[
  {
    "genre": {"title": "Genre Title", "description": "Genre description"},
    "audience": {"title": "Audience Title", "description": "Audience description"}
  }
]
\`\`\`

## Examples:
- Genre Example: "Root Cause Analysis" — Focused on "why/how" questioning with logical, principle-driven exploration.
- Audience Example: "Aspiring Engineers Curious About Technical Details" — Highlighting background, motivations, and learning objectives.

## Source Text to Analyze:
{{text}}
`;

export const GA_GENERATION_PROMPT_TR = `
# Rol: Tür ve Hedef Kitle Tasarım Uzmanı
## Profil:
- Açıklama: İçerik analizi ve yaratıcı soyutlama konusunda uzman, soru oluşturma ve stilize yanıtları desteklemek için kaynak metne dayalı çeşitli, yüksek kaliteli [Tür]-[Hedef Kitle] eşleştirmeleri oluşturma yeteneğine sahipsiniz.
- Çıktı Hedefi: Net ayrıma sahip 5 farklı [Tür]-[Hedef Kitle] çifti üretin.

## Yetenekler:
1. Kaynak metnin konusu, yapısı, tonu ve potansiyel değeri hakkında derin içgörüler elde edin.
2. Çeşitli sorgulama stillerini tasarlamak için olgusal hatırlama, kavramsal anlama, analitik akıl yürütme, değerlendirici yaratım, öğretici rehberlik vb. kapsayan geniş tür bilgisine sahip olun.
3. Çok perspektifli kapsama sağlamak için yaş, uzmanlık, motivasyon ve katılım seviyelerinde hedef kitleleri betimleyin.
4. Alt sistemlerin çıktıyı doğrudan tüketebilmesi için net ve kesin iletişim kurun.

## İş Akışı:
1. **Metin İçgörüsü**: Stili, bilgi yoğunluğunu ve genişletilebilirliği analiz etmek için pasajı kapsamlı şekilde okuyun.
2. **Senaryo Fikir Üretimi**: Temel bilgileri koruyarak tür ve hedef kitle çeşitliliğini genişleten en az 5 öğrenme veya araştırma senaryosu hayal edin.
3. **Çift Oluşturma**: Her senaryo için özel bir tür ve açık mantıksal bağlantıya sahip eşleşen hedef kitle açıklaması oluşturun.
4. **Artıklık Kontrolü**: Tür stili, tonu ve hedef kitle profilinde tekrar veya neredeyse çoğaltma olmadan tüm 5 çiftin farklı olduğundan emin olun.

## Kısıtlamalar:
1. Her tür, dil stili, duygusal ton, sunum formatı vb. vurgulayan bir başlık ve 2-3 cümlelik açıklama içermelidir; görsel formatları (örn. çizgi roman, video) hariç tutun.
2. Her hedef kitle, geçmiş özellikleri, bilgi düzeyini, motivasyonları ve istenen sonuçları açıklayan iki cümlelik bir profil içermelidir; çeşitliliği vurgulamak için hem hevesli hem de ilgisiz hedef kitleleri temsil edin.
3. Her çiftteki tür ve hedef kitle, sonraki soru stilini ve cevap uyarlamasını yönlendirmek için doğal olarak hizalanmalıdır.
4. Kaynak metinle ilgisi olmayan içerik çıkarsamayın veya mevcut çift şablonlarını yeniden kullanmayın; özgünlük sağlayın.
5. Belirtilen JSON yapısının ötesinde ek yorum veya biçimlendirme olmadan tam olarak 5 çift döndürün.

## Çıktı Formatı:
- Uzunluğu 5 olan geçerli bir JSON dizisiyle yanıt verin.
- Her öğe, her ikisi de \`title\` ve \`description\` alanlarına sahip \`genre\` ve \`audience\` nesnelerini içermelidir.
- Örnek yapıyı izleyin:
\`\`\`
[
  {
    "genre": {"title": "Tür Başlığı", "description": "Tür açıklaması"},
    "audience": {"title": "Hedef Kitle Başlığı", "description": "Hedef kitle açıklaması"}
  }
]
\`\`\`

## Örnekler:
- Tür Örneği: "Kök Neden Analizi" — Mantıksal, ilke odaklı keşifle "neden/nasıl" sorgulamaya odaklanır.
- Hedef Kitle Örneği: "Teknik Detaylara Meraklı Aday Mühendisler" — Geçmişi, motivasyonları ve öğrenme hedeflerini vurgular.

## Analiz Edilecek Kaynak Metin:
{{text}}
`;

/**
 * 獲取 GA 組合生成提示詞
 * @param {string} language - 語言標識
 * @param {Object} params - 引數物件
 * @param {string} params.text - 待分析的文字內容
 * @param {string} projectId - 專案ID，用於獲取自定義提示詞
 * @returns {Promise<string>} - 完整的提示詞
 */
export async function getGAGenerationPrompt(language, { text }, projectId = null) {
  const result = await processPrompt(
    language,
    'ga-generation',
    'GA_GENERATION_PROMPT',
    { zh: GA_GENERATION_PROMPT, en: GA_GENERATION_PROMPT_EN, tr: GA_GENERATION_PROMPT_TR },
    { text },
    projectId
  );
  return result;
}
