import { processPrompt } from '../common/prompt-loader';

export const QUESTION_PROMPT = `
# Role: 文字問題生成專家
## Profile:
- Description: 你是一名專業的文字分析與問題設計專家，能夠從複雜文字中提煉關鍵資訊併產出可用於模型微調的高品質問題集合。
- Input Length: {{textLength}} 字
- Output Goal: 生成不少於 {{number}} 個高品質問題，用於構建問答訓練資料集。

## Document Context:
- 文件名稱：{{fileName}}
- 段落主題：{{chunkName}}
- 段落摘要：{{chunkSummary}}

## Skills:
1. 能夠全面理解原文內容，識別核心概念、事實與邏輯結構。
2. 擅長設計具有明確答案指向性的問題，覆蓋文字多個側面。
3. 善於控制問題難度與型別，保證多樣性與代表性。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **文字解析**：通讀全文，分段識別關鍵實體、事件、數值與結論。
2. **問題設計**：基於資訊密度和重要性選擇最佳提問切入點{{gaPromptNote}}。
3. **品質檢查**：逐條校驗問題，確保：
   - 問題答案可在原文中直接找到依據。
   - 問題之間主題不重複、角度不雷同。
   - 語言表述準確、無歧義且符合常規問句形式。
   - **孤立性測試**：將問題從原文抽出單獨閱讀，仍能明確指向「{{fileName}}」這個文件的範疇，不會被誤認為其他文件的通用問題。
   {{gaPromptCheck}}

## Constraints:
1. 所有問題必須嚴格依據原文內容，不得新增外部資訊或假設情境。
2. 問題需覆蓋文字的不同主題、層級或視角，避免集中於單一片段。
3. 禁止輸出與材料元資訊相關的問題（如作者、章節、目錄等）。
4. 問題不得包含「報告/文章/文獻/表格中提到」等表述，需自然流暢。
5. 輸出不少於 {{number}} 個問題，且保持格式一致。
6. **每個問題必須同時包含以下三項，缺一不可**：
   (a) **明確主詞**：事件、物品、人物、產品、流程，從文本中提取，不可用「它」「該」「此」等代名詞取代。
   (b) **明確動作或情境**：申請、終止、查詢、變更、違反、計算 …等動詞，標明問題談的「事情」。
   (c) **脈絡限定**：必須帶入「{{fileName}}」或「{{chunkName}}」所代表的範疇，使問題單獨抽離原文時，答案仍只指向本文件。例如「在保險金申請流程中…」「於勞動契約終止時…」「依本保單條款…」。
   若原文敘述的主體（保險金申請、勞動契約、退款流程等）能從 {{fileName}} 或 {{chunkName}} 推導出來，請主動把這個主體寫入問題本身。

## Anti-Pattern (避免):
- 反例：「要保人若未提供相關個人資料，可能導致什麼後果？」
  問題：可套用到任何「個人資料提供」場景，答案發散。
- 正例：「於本保險金申請流程中，要保人若未提供相關個人資料，可能導致什麼後果？」
  改善：脈絡明確（保險金申請），答案只能源自本文件。
- 反例：「如何辦理退保？」
  問題：缺主詞（哪種保單）與脈絡（哪份契約）。
- 正例：「依本保單條款，要保人如何辦理退保並取得退還保費？」

## Output Format:
- 使用合法的 JSON 陣列，僅包含字串元素。
- 欄位必須使用英文雙引號。
- 嚴格遵循以下結構：
\`\`\`
["問題1", "問題2", "..."]
\`\`\`

## Output Example:
\`\`\`
["於本保險金申請流程中，要保人若未提供相關個人資料，可能導致什麼後果？", "依本保單條款，要保人申請退保的程序為何？"]
\`\`\`

## Text to Analyze:
{{text}}

## GA Instruction (Optional):
{{gaPrompt}}
`;

export const QUESTION_PROMPT_EN = `
# Role: Text Question Generation Expert
## Profile:
- Description: You are an expert in text analysis and question design, capable of extracting key information from complex passages and producing high-quality questions for fine-tuning datasets.
- Input Length: {{textLength}} characters
- Output Goal: Generate at least {{number}} high-quality questions suitable for training data.

## Document Context:
- File name: {{fileName}}
- Section topic: {{chunkName}}
- Section summary: {{chunkSummary}}

## Skills:
1. Comprehend the source text thoroughly and identify core concepts, facts, and logical structures.
2. Design questions with clear answer orientation that cover multiple aspects of the text.
3. Balance difficulty and variety to ensure representative coverage of the content.
4. Enforce strict formatting so the output can be consumed programmatically.

## Workflow:
1. **Text Parsing**: Read the entire passage, segment it, and capture key entities, events, metrics, and conclusions.
2. **Question Design**: Select the most informative focal points to craft questions{{gaPromptNote}}.
3. **Quality Check**: Validate each question to ensure:
   - The answer can be located directly in the original text.
   - Questions do not duplicate topics or angles.
   - Wording is precise, unambiguous, and uses natural interrogative phrasing.
   - **Isolation test**: When read alone (outside the original text), the question must still unambiguously belong to "{{fileName}}" and cannot be confused with a generic question that applies to other documents.
   {{gaPromptCheck}}

## Constraints:
1. Every question must be grounded strictly in the provided text; no external information or hypothetical scenarios.
2. Cover diverse themes, layers, or perspectives from the passage; avoid clustering around one segment.
3. Do not include questions about meta information (author, chapters, table of contents, etc.).
4. Avoid phrases such as "in the report/article/literature/table"; questions must read naturally.
5. Produce at least {{number}} questions with consistent formatting.
6. **Every question MUST contain all three of the following — none can be omitted**:
   (a) **Explicit subject**: an event, object, person, product, or process, extracted from the text. Pronouns ("it", "this", "the latter") are not allowed in place of the subject.
   (b) **Explicit action or context**: a verb such as apply, terminate, look up, change, violate, calculate, etc., that names the matter being asked about.
   (c) **Scope anchor**: incorporate the domain represented by "{{fileName}}" or "{{chunkName}}" so the question, when read in isolation, still points uniquely to this document. Examples: "in the insurance claim process …", "upon termination of the employment contract …", "under the terms of this policy …".
   If the underlying subject (insurance claim, employment contract, refund flow, etc.) can be inferred from {{fileName}} or {{chunkName}}, embed that subject into the question itself.

## Anti-Pattern (avoid):
- Bad:  "What happens if the applicant fails to provide relevant personal data?"
  Why:  Could apply to any "personal data submission" scenario — answers diverge.
- Good: "In the insurance claim process, what happens if the policyholder fails to provide relevant personal data?"
  Why:  Scope is anchored, answer is grounded in this document.
- Bad:  "How do you cancel?"
  Why:  Missing subject (cancel what?) and scope (which contract?).
- Good: "Under the terms of this policy, how does the policyholder cancel coverage and reclaim the premium?"

## Output Format:
- Return a valid JSON array containing only strings.
- Use double quotes for all strings.
- Follow this exact structure:
\`\`\`
["Question 1", "Question 2", "..."]
\`\`\`

## Output Example:
\`\`\`
["In the insurance claim process, what happens if the policyholder fails to provide relevant personal data?", "Under the terms of this policy, how does the policyholder cancel coverage?"]
\`\`\`

## Text to Analyze:
{{text}}

## GA Instruction (Optional):
{{gaPrompt}}
`;

export const QUESTION_PROMPT_TR = `
# Rol: Metin Soru Üretim Uzmanı
## Profil:
- Açıklama: Karmaşık metinlerden temel bilgileri çıkarabilen ve ince ayar veri setleri için yüksek kaliteli sorular üretebilen bir metin analizi ve soru tasarımı uzmanısınız.
- Girdi Uzunluğu: {{textLength}} karakter
- Çıktı Hedefi: Eğitim verisi için uygun en az {{number}} yüksek kaliteli soru üretin.

## Belge Bağlamı:
- Dosya adı: {{fileName}}
- Bölüm konusu: {{chunkName}}
- Bölüm özeti: {{chunkSummary}}

## Yetenekler:
1. Kaynak metni tamamen anlayın ve temel kavramları, gerçekleri ve mantıksal yapıları tanımlayın.
2. Metnin birden fazla yönünü kapsayan net cevap yönlendirmeli sorular tasarlayın.
3. İçeriğin temsili kapsamını sağlamak için zorluk ve çeşitlilik dengesini kurun.
4. Çıktının programatik olarak tüketilebilmesi için katı biçimlendirme uygulayın.

## İş Akışı:
1. **Metin Ayrıştırma**: Tüm pasajı okuyun, bölümlere ayırın ve temel varlıkları, olayları, metrikleri ve sonuçları yakalayın.
2. **Soru Tasarımı**: Soru oluşturmak için en bilgilendirici odak noktalarını seçin{{gaPromptNote}}.
3. **Kalite Kontrolü**: Her soruyu doğrulayarak şunları sağlayın:
   - Cevap doğrudan orijinal metinde bulunabilir.
   - Sorular konuları veya açıları tekrar etmez.
   - İfade kesin, belirsiz değil ve doğal soru tümcecikleri kullanır.
   - **İzolasyon testi**: Soru orijinal metinden ayrı okunduğunda "{{fileName}}" belgesine kesin olarak ait olmalıdır; başka belgelere de uyabilen genel bir soru ile karıştırılmamalıdır.
   {{gaPromptCheck}}

## Kısıtlamalar:
1. Her soru yalnızca sağlanan metne dayanmalıdır; harici bilgi veya varsayımsal senaryolar olmamalıdır.
2. Pasajdan farklı temaları, katmanları veya bakış açılarını kapsayın; tek bir segment etrafında kümelenmekten kaçının.
3. Meta bilgilerle ilgili sorular eklemeyin (yazar, bölümler, içindekiler tablosu vb.).
4. "Raporda/makalede/literatürde/tabloda" gibi ifadelerden kaçının; sorular doğal okunmalıdır.
5. Tutarlı biçimlendirmeyle en az {{number}} soru üretin.
6. **Her soru aşağıdaki üç ögeyi birlikte içermelidir — hiçbiri eksik olamaz**:
   (a) **Açık özne**: metinden çıkarılan bir olay, nesne, kişi, ürün veya süreç. "O", "bu", "ikincisi" gibi zamirler özne yerine kullanılamaz.
   (b) **Açık eylem veya bağlam**: başvurmak, sonlandırmak, sorgulamak, değiştirmek, ihlal etmek, hesaplamak gibi sorunun "ne hakkında" olduğunu belirten bir fiil.
   (c) **Kapsam çıpası**: "{{fileName}}" veya "{{chunkName}}" tarafından temsil edilen alanı dahil edin; böylece soru tek başına okunduğunda yalnızca bu belgeye işaret eder. Örnekler: "sigorta tazminat başvurusu sürecinde …", "iş sözleşmesinin feshi sırasında …", "bu poliçenin şartları uyarınca …".
   Altta yatan konu (sigorta talebi, iş sözleşmesi, iade akışı vb.) {{fileName}} veya {{chunkName}} kaynaklarından çıkarılabiliyorsa, bu konuyu doğrudan sorunun içine yerleştirin.

## Anti-Pattern (kaçının):
- Kötü: "İlgili kişisel verileri sağlamazsa ne olur?"
  Neden: Herhangi bir "kişisel veri gönderimi" senaryosuna uyabilir — cevaplar dağılır.
- İyi:  "Sigorta tazminat başvurusu sürecinde, sigortalı ilgili kişisel verileri sağlamazsa ne olur?"
  Neden: Kapsam çıpalanmış, cevap bu belgeye dayanıyor.
- Kötü: "Nasıl iptal edilir?"
  Neden: Özne (neyi iptal etmek?) ve kapsam (hangi sözleşme?) eksik.
- İyi:  "Bu poliçenin şartları uyarınca, sigortalı sigortayı nasıl iptal eder ve primi nasıl geri alır?"

## Çıktı Formatı:
- Yalnızca string içeren geçerli bir JSON dizisi döndürün.
- Tüm stringler için çift tırnak kullanın.
- Bu yapıyı tam olarak takip edin:
\`\`\`
["Soru 1", "Soru 2", "..."]
\`\`\`

## Çıktı Örneği:
\`\`\`
["Sigorta tazminat başvurusu sürecinde, sigortalı ilgili kişisel verileri sağlamazsa ne olur?", "Bu poliçenin şartları uyarınca, sigortalı sigortayı nasıl iptal eder?"]
\`\`\`

## Analiz Edilecek Metin:
{{text}}

## GA Talimatı (Opsiyonel):
{{gaPrompt}}
`;

export const GA_QUESTION_PROMPT = `
**目標體裁**: {{genre}}
**目標受眾**: {{audience}}

請確保：
1. 問題應完全符合「{{genre}}」所定義的風格、焦點和深度等等屬性。
2. 問題應考慮到「{{audience}}」的知識水平、認知特點和潛在興趣點。
3. 從該受眾群體的視角和需求出發提出問題
4. 保持問題的針對性和實用性，確保問題-答案的風格一致性
5. 問題應具有一定的清晰度和具體性，避免過於寬泛或模糊。
`;

export const GA_QUESTION_PROMPT_EN = `
## Special Requirements - Genre & Audience Perspective Questioning:
Adjust your questioning approach and question style based on the following genre and audience combination:

**Target Genre**: {{genre}}
**Target Audience**: {{audience}}

Please ensure:
1. The question should fully conform to the style, focus, depth, and other attributes defined by "{{genre}}".
2. The question should consider the knowledge level, cognitive characteristics, and potential points of interest of "{{audience}}".
3. Propose questions from the perspective and needs of this audience group.
4. Maintain the specificity and practicality of the questions, ensuring consistency in the style of questions and answers.
5. The question should have a certain degree of clarity and specificity, avoiding being too broad or vague.
`;

export const GA_QUESTION_PROMPT_TR = `
## Özel Gereksinimler - Tür & Hedef Kitle Perspektifi Sorgulama:
Aşağıdaki tür ve hedef kitle kombinasyonuna göre sorgulama yaklaşımınızı ve soru stilinizi ayarlayın:

**Hedef Tür**: {{genre}}
**Hedef Kitle**: {{audience}}

Lütfen şunları sağlayın:
1. Soru, "{{genre}}" tarafından tanımlanan stil, odak, derinlik ve diğer özelliklere tam olarak uygun olmalıdır.
2. Soru, "{{audience}}" hedef kitlesinin bilgi seviyesini, bilişsel özelliklerini ve potansiyel ilgi noktalarını dikkate almalıdır.
3. Bu hedef kitle grubunun bakış açısından ve ihtiyaçlarından yola çıkarak sorular sorun.
4. Soruların özgüllüğünü ve pratikliğini koruyun, soru-cevap stilinde tutarlılık sağlayın.
5. Soru belirli bir netlik ve özgüllüğe sahip olmalı, çok geniş veya belirsiz olmaktan kaçınmalıdır.
`;

/**
 * 構建 GA 提示詞
 * @param {string} language - 語言，'en' 或 '中文' 或 'tr'
 * @param {Object} activeGaPair - 當前啟用的 GA 組合
 * @returns {String} 構建的 GA 提示詞
 */
export function getGAPrompt(language, { activeGaPair }) {
  if (!activeGaPair || !activeGaPair.active) {
    return '';
  }
  let prompt;
  if (language === 'en') {
    prompt = GA_QUESTION_PROMPT_EN;
  } else if (language === 'tr') {
    prompt = GA_QUESTION_PROMPT_TR;
  } else {
    prompt = GA_QUESTION_PROMPT;
  }
  return prompt.replaceAll('{{genre}}', activeGaPair.genre).replaceAll('{{audience}}', activeGaPair.audience);
}

/**
 * 生成問題提示詞生成提示模板。
 * @param {string} language - 語言，'en' 或 '中文' 或 'tr'
 * @param {Object} params - 引數物件
 * @param {string} params.text - 待處理的文字
 * @param {number} params.number - 問題數量
 * @param {string} params.fileName - 文件名稱（用於脈絡錨定）
 * @param {string} params.chunkName - 段落主題／標題
 * @param {string} params.chunkSummary - 段落摘要
 * @param {Object} params.activeGaPair - 當前啟用的 GA對
 * @returns {string} - 完整的提示詞
 */
export async function getQuestionPrompt(
  language,
  { text, number = Math.floor(text.length / 240), fileName = '', chunkName = '', chunkSummary = '', activeGaPair = null },
  projectId = null
) {
  // 構建GA pairs相關的提示詞
  const gaPromptText = getGAPrompt(language, { activeGaPair });
  let gaPromptNote, gaPromptCheck;

  if (gaPromptText) {
    if (language === 'en') {
      gaPromptNote = ', and incorporate the specified genre-audience perspective';
      gaPromptCheck = '- Question style matches the specified genre and audience';
    } else if (language === 'tr') {
      gaPromptNote = ', ve belirtilen tür-hedef kitle perspektifini dahil edin';
      gaPromptCheck = '- Soru stili belirtilen tür ve hedef kitle ile eşleşir';
    } else {
      gaPromptNote = '，並結合指定的體裁受眾視角';
      gaPromptCheck = '- 問題風格與指定的體裁受眾匹配';
    }
  } else {
    gaPromptNote = '';
    gaPromptCheck = '';
  }

  // 文件脈絡 fallback：若 chunkName / fileName 缺，告訴 LLM 從文本自行推導
  const fallbackTopic = language === 'en'
    ? '(infer the main subject from the text below)'
    : language === 'tr'
    ? '(metinden ana konuyu çıkarın)'
    : '（請從以下文本自行推導主題）';

  const result = await processPrompt(
    language,
    'question',
    'QUESTION_PROMPT',
    { zh: QUESTION_PROMPT, en: QUESTION_PROMPT_EN, tr: QUESTION_PROMPT_TR },
    {
      textLength: text.length,
      number,
      fileName: fileName || fallbackTopic,
      chunkName: chunkName || fallbackTopic,
      chunkSummary: chunkSummary || fallbackTopic,
      gaPrompt: gaPromptText,
      gaPromptNote,
      gaPromptCheck,
      text
    },
    projectId
  );
  return result;
}

export default getQuestionPrompt;
