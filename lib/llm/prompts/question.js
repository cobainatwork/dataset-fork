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
   (c) **脈絡限定**：問題單獨抽離原文時，答案仍只指向本文件範疇。**從「{{fileName}}」「{{chunkName}}」推導出**業務領域／流程／合約類型／法規範疇**（如「保險金申請」「勞動契約」「健保給付」），把這個概念自然融入問題的動詞片語或介系詞片語。

7. **檔案名稱（{{fileName}}）是技術識別碼，僅供你內部理解文件主題，禁止字面引用進問題本身**。檔名常含底線、part 編號、版本號、副檔名等技術符號（如「台灣人壽_保險金申請書-part-1」），直接寫入問題會破壞自然語感。請改用人類可讀的主題描述。

## Anti-Pattern (避免):
- 反例：「要保人若未提供相關個人資料，可能導致什麼後果？」
  問題：可套用到任何「個人資料提供」場景，答案發散。
- 正例：「辦理保險金申請時，要保人若未提供相關個人資料，可能導致什麼後果？」
  改善：脈絡用「辦理保險金申請時」融入問題的時間副詞片語。
- 反例：「於台灣人壽_保險金申請書-part-1 中，若未勾選個人險、團體險…」
  問題：把檔名字面塞進問題，含底線、part 編號等技術符號，閱讀生硬。
- 正例：「**填寫保險金申請書時**，若未勾選個人險、團體險、旅平險或其它申請項目，視為同意申請什麼範圍的保單？」
  改善：把檔名概念抽象成「填寫保險金申請書時」這個自然動作。
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
["辦理保險金申請時，要保人若未提供相關個人資料，可能導致什麼後果？", "依本保單條款，要保人申請退保的程序為何？"]
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
   (c) **Scope anchor**: **Derive the business domain / process / contract type / regulatory area** (e.g. "insurance claim", "employment contract", "health insurance reimbursement") from "{{fileName}}" or "{{chunkName}}", and weave that concept naturally into the question's verb or prepositional phrase. The question, when read in isolation, must still point uniquely to this document's scope.

7. **{{fileName}} is a technical identifier — use it only to understand the document's topic, NEVER quote it verbatim in the question**. File names usually contain underscores, part numbers, version suffixes, file extensions (e.g. "taiwan_life_claim_form-part-1"), which read awkwardly when embedded in a sentence. Always paraphrase into a human-readable subject.

## Anti-Pattern (avoid):
- Bad:  "What happens if the applicant fails to provide relevant personal data?"
  Why:  Could apply to any "personal data submission" scenario — answers diverge.
- Good: "When filing an insurance claim, what happens if the policyholder fails to provide relevant personal data?"
  Why:  Scope baked into the time-adverb phrase ("when filing an insurance claim").
- Bad:  "In taiwan_life_claim_form-part-1, if the applicant does not check personal/group/travel insurance …"
  Why:  File name with underscores and part suffix dropped verbatim into the question — unnatural.
- Good: "**When completing the insurance claim form**, if the applicant does not check personal, group, travel, or other coverage, which scope of policy is deemed accepted?"
  Why:  The file-name concept is paraphrased into the natural action "completing the insurance claim form".
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
["When filing an insurance claim, what happens if the policyholder fails to provide relevant personal data?", "Under the terms of this policy, how does the policyholder cancel coverage?"]
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
   (c) **Kapsam çıpası**: "{{fileName}}" veya "{{chunkName}}" kaynaklarından **iş alanını / süreci / sözleşme türünü / mevzuat alanını** (örneğin "sigorta tazminat başvurusu", "iş sözleşmesi", "sağlık sigortası geri ödemesi") çıkarın ve bu kavramı sorunun fiil ya da edat öbeğine doğal biçimde yerleştirin. Soru orijinal metinden ayrı okunduğunda yalnızca bu belgenin kapsamına işaret etmelidir.

7. **{{fileName}} teknik bir tanımlayıcıdır — yalnızca belgenin konusunu anlamak için kullanın, soruya KELİMESİ KELİMESİNE kopyalamayın**. Dosya adları genellikle alt çizgi, bölüm numarası, sürüm soneki, dosya uzantısı içerir (örn. "taiwan_life_claim_form-part-1"), bunlar bir cümleye gömüldüğünde tuhaf okunur. Mutlaka okunabilir bir konuya parafraz edin.

## Anti-Pattern (kaçının):
- Kötü: "İlgili kişisel verileri sağlamazsa ne olur?"
  Neden: Herhangi bir "kişisel veri gönderimi" senaryosuna uyabilir — cevaplar dağılır.
- İyi:  "Sigorta tazminat başvurusu yaparken, sigortalı ilgili kişisel verileri sağlamazsa ne olur?"
  Neden: Kapsam zaman zarfı öbeği ile içselleştirilmiş.
- Kötü: "taiwan_life_claim_form-part-1 içinde, başvuran bireysel/grup/seyahat sigortasını işaretlemezse …"
  Neden: Alt çizgi ve bölüm soneki içeren dosya adı doğrudan soruya kopyalanmış — doğal değil.
- İyi:  "**Sigorta tazminat başvuru formunu doldururken**, başvuran bireysel, grup, seyahat veya diğer kapsamları işaretlemezse hangi poliçe kapsamı kabul edilmiş sayılır?"
  Neden: Dosya adı kavramı "sigorta tazminat başvuru formunu doldururken" gibi doğal bir eyleme parafraz edilmiş.
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
["Sigorta tazminat başvurusu yaparken, sigortalı ilgili kişisel verileri sağlamazsa ne olur?", "Bu poliçenin şartları uyarınca, sigortalı sigortayı nasıl iptal eder?"]
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
