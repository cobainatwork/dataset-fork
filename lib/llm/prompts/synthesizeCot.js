import { processPrompt } from '../common/prompt-loader';

export const SYNTHESIZE_COT_PROMPT = `
# Role: 高品質思維鏈逆向構建專家
## Profile:
- Description: 你是一位擅長逆向構建推理思維鏈的專家。給定一個問題、參考內容和最終答案，你需要還原出一條從問題出發、經過嚴謹推理、最終自然得出答案的完整思維路徑。你的思維鏈應當像一位領域專家在真實思考時的內心獨白——有分析、有判斷、有取捨、有驗證。

## Skills:
1. 逆向推導：從答案出發，識別支撐答案的關鍵證據和邏輯節點，反向構建推理路徑。
2. 多步推理：將複雜問題拆解為多個子問題，逐層遞進，確保每一步推理都有據可依。
3. 資訊篩選：從參考內容中精準提取與問題和答案相關的核心資訊，忽略無關干擾項。
4. 自然表達：以第一人稱內心推理的方式組織語言，避免機械羅列，呈現真實的思考過程。
5. 自洽驗證：在推理結束前進行邏輯自檢，確保思維鏈與答案完全一致，不存在矛盾或跳躍。

## Workflow:
1. **理解問題意圖**：深入分析問題的核心訴求，明確問題型別（事實查詢、因果推理、比較分析、觀點論證等），確定推理方向。
2. **錨定答案要素**：拆解答案的關鍵組成部分，識別每個要素需要哪些前置推理來支撐。
3. **提取關鍵資訊**：從參考內容中定位與答案要素直接相關的核心事實和資料，建立資訊與答案之間的對映關係。
4. **構建推理鏈條**：按照自然的認知順序（從已知到未知、從表層到深層）串聯推理步驟，確保每一步都為下一步提供邏輯基礎。
5. **邏輯自檢與收束**：回顧整條推理鏈，檢查是否存在邏輯斷層或多餘分支，確保推理自然收束於給定答案。

## 問題
{{question}}

## 參考內容

------ 參考內容 Start ------
{{text}}
------ 參考內容 End ------

## 答案
{{answer}}

## Constrains:
1. **邏輯連貫性**：思維鏈必須形成完整的因果鏈條，每個推理步驟之間必須有明確的邏輯承接關係，禁止出現無依據的跳躍式結論。
2. **零引用原則**：嚴禁出現"根據參考內容""文獻/資料中提到""依據/引用"等任何引用性表述，所有資訊必須以自然推理或常識分析的方式呈現。
3. **漸進式推理結構**：按照"首先分析問題本質 → 然後梳理關鍵條件 → 接著逐步推導 → 進一步深入分析 → 最後綜合得出結論"的遞進結構組織思維鏈，體現層層深入的思考過程。
4. **資訊密度控制**：每個推理步驟應當承載實質性的推理進展，避免空洞的過渡句或重複已有資訊；同時避免單步堆砌過多資訊導致推理模糊。
5. **與答案嚴格對齊**：思維鏈的最終推導結果必須與給定答案完全一致，不得引入答案中未涉及的額外結論，也不得遺漏答案中的關鍵要點。
6. **自然思維風格**：以真實思考的語氣表達（如"這裡需要注意的是……""進一步來看……""綜合以上分析……"），避免機械化的編號羅列或公式化表達。
7. **合理推理粒度**：簡單問題的思維鏈應簡潔高效（3-5個推理步驟），複雜問題則應適當展開（5-8個推理步驟），推理深度應與問題複雜度匹配。
8. **直接輸出**：直接返回思維鏈正文內容，不要包含"思維鏈""推理過程"等標題性話術，也不要新增任何字首說明。
`;

export const SYNTHESIZE_COT_PROMPT_EN = `
# Role: High-Quality Chain-of-Thought Reverse Engineering Expert
## Profile:
- Description: You are an expert in reverse-engineering reasoning chains of thought. Given a question, reference content, and the final answer, you need to reconstruct a complete reasoning path that starts from the question, proceeds through rigorous reasoning, and naturally arrives at the answer. Your chain of thought should read like the internal monologue of a domain expert genuinely thinking through the problem — with analysis, judgment, trade-offs, and verification.

## Skills:
1. Reverse Derivation: Starting from the answer, identify key evidence and logical nodes that support it, then construct the reasoning path backward.
2. Multi-Step Reasoning: Decompose complex problems into sub-questions, progressing layer by layer, ensuring each reasoning step is well-supported.
3. Information Filtering: Precisely extract core information relevant to the question and answer from the reference content, ignoring irrelevant distractors.
4. Natural Expression: Organize language as a first-person internal reasoning process, avoiding mechanical listing and presenting an authentic thinking process.
5. Self-Consistency Verification: Perform a logical self-check before concluding to ensure the chain of thought is fully consistent with the answer, with no contradictions or gaps.

## Workflow:
1. **Understand the Question Intent**: Deeply analyze the core demand of the question, identify its type (factual query, causal reasoning, comparative analysis, argumentative, etc.), and determine the reasoning direction.
2. **Anchor Answer Components**: Break down the key components of the answer and identify what prerequisite reasoning each component requires.
3. **Extract Key Information**: Locate core facts and data from the reference content that directly relate to the answer components, establishing a mapping between information and answer.
4. **Build the Reasoning Chain**: Connect reasoning steps in a natural cognitive order (from known to unknown, from surface to depth), ensuring each step provides a logical foundation for the next.
5. **Logical Self-Check and Convergence**: Review the entire reasoning chain, check for logical gaps or redundant branches, and ensure the reasoning naturally converges to the given answer.

## Question
{{question}}

## Reference Content

------ Reference Content Start ------
{{text}}
------ Reference Content End ------

## Answer
{{answer}}

## Constrains:
1. **Logical Coherence**: The chain of thought must form a complete causal chain. Every reasoning step must have a clear logical connection to the next. No unsupported leaps to conclusions are allowed.
2. **Zero-Citation Principle**: Absolutely no citation-related expressions such as "according to the reference," "the document/source mentions," or "based on/cited from" are allowed. All information must be presented as natural reasoning or common-sense analysis.
3. **Progressive Reasoning Structure**: Organize the chain of thought following a progressive structure: "First, analyze the essence of the problem → Then, sort out the key conditions → Next, derive step by step → Further, deepen the analysis → Finally, synthesize and reach the conclusion." This should reflect a layer-by-layer deepening thought process.
4. **Information Density Control**: Each reasoning step should carry substantive reasoning progress. Avoid hollow transitional sentences or repeating existing information. At the same time, avoid packing too much information into a single step, which would make the reasoning unclear.
5. **Strict Alignment with the Answer**: The final derivation of the chain of thought must be fully consistent with the given answer. Do not introduce additional conclusions not covered in the answer, and do not omit key points from the answer.
6. **Natural Thinking Style**: Express in the tone of genuine thinking (e.g., "What's worth noting here is…", "Looking at this further…", "Combining the above analysis…"). Avoid mechanical numbered lists or formulaic expressions.
7. **Appropriate Reasoning Granularity**: For simple questions, the chain of thought should be concise and efficient (3-5 reasoning steps). For complex questions, expand appropriately (5-8 reasoning steps). The reasoning depth should match the complexity of the question.
8. **Direct Output**: Directly return the chain of thought body content. Do not include titles like "Chain of Thought" or "Reasoning Process," and do not add any prefatory explanations.
`;

export const SYNTHESIZE_COT_PROMPT_TR = `
# Rol: Yüksek Kaliteli Düşünme Zinciri Tersine Mühendislik Uzmanı
## Profil:
- Açıklama: Akıl yürütme düşünme zincirlerini tersine mühendislik yapma konusunda uzmansınız. Verilen bir soru, referans içerik ve nihai cevaba dayanarak, sorudan başlayan, titiz bir akıl yürütme ile ilerleyen ve doğal olarak cevaba ulaşan eksiksiz bir akıl yürütme yolunu yeniden oluşturmanız gerekir. Düşünme zinciriniz, bir alan uzmanının problemi gerçekten düşünürken iç monologu gibi okunmalıdır — analiz, yargı, değerlendirme ve doğrulama ile birlikte.

## Yetenekler:
1. Tersine Türetme: Cevaptan başlayarak, onu destekleyen temel kanıtları ve mantıksal düğümleri belirleyin, ardından akıl yürütme yolunu geriye doğru oluşturun.
2. Çok Adımlı Akıl Yürütme: Karmaşık problemleri alt sorulara ayırın, katman katman ilerleyin ve her akıl yürütme adımının iyi desteklendiğinden emin olun.
3. Bilgi Filtreleme: Referans içerikten soru ve cevapla doğrudan ilgili temel bilgileri hassas bir şekilde çıkarın, ilgisiz dikkat dağıtıcıları göz ardı edin.
4. Doğal İfade: Birinci şahıs iç akıl yürütme süreci olarak dili organize edin, mekanik listelemeyi önleyin ve otantik bir düşünme süreci sunun.
5. Öz Tutarlılık Doğrulaması: Sonuçlandırmadan önce mantıksal bir öz kontrol yapın, düşünme zincirinin cevapla tamamen tutarlı olduğundan, çelişki veya boşluk olmadığından emin olun.

## İş Akışı:
1. **Soru Amacını Anlayın**: Sorunun temel talebini derinlemesine analiz edin, türünü belirleyin (olgusal sorgu, nedensel akıl yürütme, karşılaştırmalı analiz, argümentatif vb.) ve akıl yürütme yönünü belirleyin.
2. **Cevap Bileşenlerini Sabitleyin**: Cevabın temel bileşenlerini parçalayın ve her bileşenin hangi ön koşul akıl yürütmeyi gerektirdiğini belirleyin.
3. **Temel Bilgileri Çıkarın**: Referans içerikten cevap bileşenleriyle doğrudan ilişkili temel olguları ve verileri bulun, bilgi ve cevap arasında bir eşleme oluşturun.
4. **Akıl Yürütme Zincirini Oluşturun**: Akıl yürütme adımlarını doğal bir bilişsel sırayla (bilinenden bilinmeyene, yüzeyden derine) bağlayın ve her adımın bir sonraki için mantıksal bir temel sağladığından emin olun.
5. **Mantıksal Öz Kontrol ve Yakınsama**: Tüm akıl yürütme zincirini gözden geçirin, mantıksal boşlukları veya gereksiz dalları kontrol edin ve akıl yürütmenin doğal olarak verilen cevaba yakınsadığından emin olun.

## Soru
{{question}}

## Referans İçerik

------ Referans İçerik Başlangıç ------
{{text}}
------ Referans İçerik Bitiş ------

## Cevap
{{answer}}

## Kısıtlamalar:
1. **Mantıksal Tutarlılık**: Düşünme zinciri eksiksiz bir nedensel zincir oluşturmalıdır. Her akıl yürütme adımının bir sonrakiyle net bir mantıksal bağlantısı olmalıdır. Desteksiz sonuç sıçramalarına izin verilmez.
2. **Sıfır Alıntı İlkesi**: "Referansa göre", "belge/kaynak bahsediyor" veya "dayanak/alıntı" gibi alıntıyla ilgili ifadelere kesinlikle izin verilmez. Tüm bilgiler doğal akıl yürütme veya sağduyu analizi olarak sunulmalıdır.
3. **İlerleyici Akıl Yürütme Yapısı**: Düşünme zincirini ilerleyici bir yapıda organize edin: "İlk olarak, problemin özünü analiz edin → Sonra, temel koşulları düzenleyin → Ardından, adım adım türetin → Daha sonra, analizi derinleştirin → Son olarak, sentezleyin ve sonuca ulaşın." Bu, katman katman derinleşen bir düşünce sürecini yansıtmalıdır.
4. **Bilgi Yoğunluğu Kontrolü**: Her akıl yürütme adımı önemli bir akıl yürütme ilerlemesi taşımalıdır. Boş geçiş cümleleri veya mevcut bilgileri tekrarlamaktan kaçının. Aynı zamanda, tek bir adıma çok fazla bilgi yüklemekten kaçının, bu da akıl yürütmeyi belirsiz hale getirir.
5. **Cevapla Sıkı Uyum**: Düşünme zincirinin nihai türetimi verilen cevapla tamamen tutarlı olmalıdır. Cevabın kapsamadığı ek sonuçlar eklemeyin ve cevaptaki temel noktaları atlamayın.
6. **Doğal Düşünme Tarzı**: Gerçek düşünmenin tonuyla ifade edin (örneğin, "Burada dikkat edilmesi gereken…", "Buna daha yakından baktığımızda…", "Yukarıdaki analizi birleştirdiğimizde…"). Mekanik numaralı listeler veya kalıplaşmış ifadelerden kaçının.
7. **Uygun Akıl Yürütme Ayrıntı Düzeyi**: Basit sorular için düşünme zinciri kısa ve verimli olmalıdır (3-5 akıl yürütme adımı). Karmaşık sorular için uygun şekilde genişletin (5-8 akıl yürütme adımı). Akıl yürütme derinliği sorunun karmaşıklığıyla eşleşmelidir.
8. **Doğrudan Çıktı**: Düşünme zinciri gövde içeriğini doğrudan döndürün. "Düşünme Zinciri" veya "Akıl Yürütme Süreci" gibi başlıklar eklemeyin ve herhangi bir giriş açıklaması eklemeyin.
`;

/**
 * 獲取思維鏈合成提示詞
 * @param {string} language - 語言標識
 * @param {Object} params - 引數物件
 * @param {string} params.question - 問題
 * @param {string} params.text - 參考文字塊內容
 * @param {string} params.answer - 答案
 * @param {string} projectId - 專案ID，用於獲取自定義提示詞
 * @returns {Promise<string>} - 完整的提示詞
 */
export async function getSynthesizeCotPrompt(language, { question, text, answer }, projectId = null) {
  const result = await processPrompt(
    language,
    'synthesizeCot',
    'SYNTHESIZE_COT_PROMPT',
    { zh: SYNTHESIZE_COT_PROMPT, en: SYNTHESIZE_COT_PROMPT_EN, tr: SYNTHESIZE_COT_PROMPT_TR },
    { question, text, answer },
    projectId
  );
  return result;
}
