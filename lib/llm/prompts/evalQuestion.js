import { processPrompt } from '../common/prompt-loader';

// ==================== 是否題 (True/False) ====================

export const EVAL_TRUE_FALSE_PROMPT = `
# Role: 判斷題生成專家
## Profile:
- Description: 你是一名專業的測評題目設計專家，擅長根據文字內容生成高品質的是否判斷題，用於評估模型對知識的理解程度。
- Input Length: {{textLength}} 字
- Output Goal: 生成 {{number}} 道是否判斷題，每道題需包含題目和正確答案。

## Skills:
1. 能夠從文字中提取明確的事實性陳述。
2. 擅長設計具有明確對錯判斷的題目。
3. 善於設計干擾性題目，避免題目過於簡單。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **文字解析**：通讀全文，識別關鍵事實、定義、結論。
2. **題目設計**：
   - 提取明確的事實性陳述作為正確題目。
   - 設計部分錯誤陳述作為干擾題目。
   - 確保題目覆蓋文字的不同方面。
3. **品質檢查**：
   - 每道題的答案必須明確（是或否）。
   - 題目不能模稜兩可。
   - 避免使用"可能"、"也許"等不確定詞彙。

## Constraints:
1. 所有題目必須嚴格依據原文內容，不得新增外部資訊。
2. 題目需覆蓋文字的不同主題，避免集中於單一片段。
3. 禁止輸出與材料元資訊相關的題目（如作者、章節等）。
4. 題目表述需簡潔明瞭，避免冗長複雜的句式。
5. 必須生成 {{number}} 道題目。

## Output Format:
- 使用合法的 JSON 陣列，每個元素包含 question 和 correctAnswer 欄位。
- correctAnswer 必須是 "❌" 或 "✅"。
- 嚴格遵循以下結構：
\`\`\`json
[
  {
    "question": "題目內容",
    "correctAnswer": "✅"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "人工智慧是計算機科學的一個分支",
    "correctAnswer": "✅"
  },
  {
    "question": "深度學習不需要大量資料進行訓練",
    "correctAnswer": "❌"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_TRUE_FALSE_PROMPT_EN = `
# Role: True/False Question Generation Expert
## Profile:
- Description: You are an expert in designing true/false questions based on text content to assess model comprehension.
- Input Length: {{textLength}} characters
- Output Goal: Generate {{number}} true/false questions with correct answers.

## Skills:
1. Extract clear factual statements from text.
2. Design questions with definitive true/false answers.
3. Create challenging distractors to avoid overly simple questions.
4. Ensure strict formatting for programmatic processing.

## Workflow:
1. **Text Parsing**: Read the passage and identify key facts, definitions, and conclusions.
2. **Question Design**:
   - Extract clear factual statements as true questions.
   - Design false statements as distractors.
   - Ensure questions cover different aspects of the text.
3. **Quality Check**:
   - Each question must have a definitive answer (true or false).
   - Questions must be unambiguous.
   - Avoid uncertain words like "might", "perhaps".

## Constraints:
1. All questions must be strictly based on the provided text.
2. Cover diverse topics from the text; avoid clustering.
3. Do not include meta information questions (author, chapters, etc.).
4. Keep questions concise and clear.
5. Must generate exactly {{number}} questions.

## Output Format:
- Return a valid JSON array with question and correctAnswer fields.
- correctAnswer must be "✅" or "❌".
- Follow this exact structure:
\`\`\`json
[
  {
    "question": "Question content",
    "correctAnswer": "✅"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "Artificial intelligence is a branch of computer science",
    "correctAnswer": "✅"
  },
  {
    "question": "Deep learning does not require large amounts of data for training",
    "correctAnswer": "❌"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_TRUE_FALSE_PROMPT_TR = `
# Rol: Doğru/Yanlış Soru Oluşturma Uzmanı
## Profil:
- Açıklama: Metin içeriğine dayalı olarak model anlama düzeyini değerlendirmek için yüksek kaliteli doğru/yanlış soruları tasarlama konusunda uzmansınız.
- Girdi Uzunluğu: {{textLength}} karakter
- Çıktı Hedefi: Doğru cevapları ile birlikte {{number}} adet doğru/yanlış sorusu oluşturun.

## Beceriler:
1. Metinden net olgusal ifadeleri çıkarma.
2. Kesin doğru/yanlış cevapları olan sorular tasarlama.
3. Soruların çok kolay olmasını önlemek için zorlayıcı çeldiriciler oluşturma.
4. Programatik işleme için katı biçimlendirme sağlama.

## İş Akışı:
1. **Metin Analizi**: Metni okuyun ve temel gerçekleri, tanımları ve sonuçları belirleyin.
2. **Soru Tasarımı**:
   - Net olgusal ifadeleri doğru sorular olarak çıkarın.
   - Çeldirici olarak yanlış ifadeler tasarlayın.
   - Soruların metnin farklı yönlerini kapsamasını sağlayın.
3. **Kalite Kontrolü**:
   - Her sorunun kesin bir cevabı (doğru veya yanlış) olmalıdır.
   - Sorular belirsiz olmamalıdır.
   - "Belki", "muhtemelen" gibi belirsiz kelimelerden kaçının.

## Kısıtlamalar:
1. Tüm sorular kesinlikle verilen metne dayanmalıdır.
2. Metnin farklı konularını kapsayın; tek bir bölüme yoğunlaşmaktan kaçının.
3. Meta bilgi sorularını (yazar, bölüm vb.) dahil etmeyin.
4. Soruları kısa ve net tutun.
5. Tam olarak {{number}} soru oluşturulmalıdır.

## Çıktı Biçimi:
- question ve correctAnswer alanlarını içeren geçerli bir JSON dizisi döndürün.
- correctAnswer "✅" veya "❌" olmalıdır.
- Aşağıdaki yapıyı tam olarak takip edin:
\`\`\`json
[
  {
    "question": "Soru içeriği",
    "correctAnswer": "✅"
  }
]
\`\`\`

## Çıktı Örneği:
\`\`\`json
[
  {
    "question": "Yapay zeka, bilgisayar biliminin bir dalıdır",
    "correctAnswer": "✅"
  },
  {
    "question": "Derin öğrenme, eğitim için büyük miktarda veri gerektirmez",
    "correctAnswer": "❌"
  }
]
\`\`\`

## Analiz Edilecek Metin:
{{text}}
`;

// ==================== 單選題 (Single Choice) ====================

export const EVAL_SINGLE_CHOICE_PROMPT = `
# Role: 單選題生成專家
## Profile:
- Description: 你是一名專業的測評題目設計專家，擅長根據文字內容生成高品質的單選題，用於評估模型的知識掌握程度。
- Input Length: {{textLength}} 字
- Output Goal: 生成 {{number}} 道單選題，每道題需包含題目、4個選項和正確答案。

## Skills:
1. 能夠從文字中提取關鍵資訊點作為考查物件。
2. 擅長設計合理的干擾選項，增加題目難度。
3. 善於控制題目難度，確保題目具有區分度。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **文字解析**：通讀全文，識別關鍵概念、定義、分類、資料等。
2. **題目設計**：
   - 選擇重要知識點作為題幹。
   - 設計4個選項（A、B、C、D），其中1個正確，3個干擾。
   - 干擾選項應具有一定迷惑性，但明確錯誤。
3. **品質檢查**：
   - 確保只有一個選項完全正確。
   - 干擾選項不能模稜兩可。
   - 選項長度儘量均衡。

## Constraints:
1. 所有題目必須嚴格依據原文內容，不得新增外部資訊。
2. 題目需覆蓋文字的不同主題，避免集中於單一片段。
3. 禁止輸出與材料元資訊相關的題目。
4. 每道題必須有且僅有4個選項。
5. 必須生成 {{number}} 道題目。

## Output Format:
- 使用合法的 JSON 陣列，每個元素包含 question、options 和 correctAnswer 欄位。
- options 是包含4個選項的陣列。
- correctAnswer 是正確選項的索引標識（A、B、C、D），對應 options 陣列中的第 0、1、2、3 個元素。
- 嚴格遵循以下結構：
\`\`\`json
[
  {
    "question": "題目內容",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "correctAnswer": "B"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "以下哪項是深度學習的核心特徵？",
    "options": ["需要人工特徵工程", "自動學習特徵表示", "只能處理結構化資料", "不需要大量資料"],
    "correctAnswer": "B"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_SINGLE_CHOICE_PROMPT_EN = `
# Role: Single Choice Question Generation Expert
## Profile:
- Description: You are an expert in designing single-choice questions to assess model knowledge comprehension.
- Input Length: {{textLength}} characters
- Output Goal: Generate {{number}} single-choice questions with 4 options and correct answers.

## Skills:
1. Extract key information points from text as examination targets.
2. Design reasonable distractors to increase difficulty.
3. Control question difficulty to ensure discrimination.
4. Ensure strict formatting for programmatic processing.

## Workflow:
1. **Text Parsing**: Read the passage and identify key concepts, definitions, classifications, data, etc.
2. **Question Design**:
   - Select important knowledge points as question stems.
   - Design 4 options (A, B, C, D) with 1 correct and 3 distractors.
   - Distractors should be plausible but clearly incorrect.
3. **Quality Check**:
   - Ensure only one option is completely correct.
   - Distractors must not be ambiguous.
   - Options should be roughly equal in length.

## Constraints:
1. All questions must be strictly based on the provided text.
2. Cover diverse topics; avoid clustering.
3. Do not include meta information questions.
4. Each question must have exactly 4 options.
5. Must generate exactly {{number}} questions.

## Output Format:
- Return a valid JSON array with question, options, and correctAnswer fields.
- options is an array of 4 choices.
- correctAnswer is the option index identifier (A, B, C, D), corresponding to the 0th, 1st, 2nd, 3rd element in the options array.
- Follow this exact structure:
\`\`\`json
[
  {
    "question": "Question content",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "B"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "Which of the following is a core feature of deep learning?",
    "options": ["Requires manual feature engineering", "Automatically learns feature representations", "Can only process structured data", "Does not require large amounts of data"],
    "correctAnswer": "B"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_SINGLE_CHOICE_PROMPT_TR = `
# Rol: Tek Seçenekli Soru Oluşturma Uzmanı
## Profil:
- Açıklama: Model bilgi kavrama düzeyini değerlendirmek için tek seçenekli sorular tasarlama konusunda uzmansınız.
- Girdi Uzunluğu: {{textLength}} karakter
- Çıktı Hedefi: 4 seçenekli ve doğru cevaplı {{number}} adet tek seçenekli soru oluşturun.

## Beceriler:
1. Metinden temel bilgi noktalarını sınav konusu olarak çıkarma.
2. Zorluğu artırmak için makul çeldiriciler tasarlama.
3. Ayırt edicilik sağlamak için soru zorluğunu kontrol etme.
4. Programatik işleme için katı biçimlendirme sağlama.

## İş Akışı:
1. **Metin Analizi**: Metni okuyun ve temel kavramları, tanımları, sınıflandırmaları, verileri vb. belirleyin.
2. **Soru Tasarımı**:
   - Önemli bilgi noktalarını soru kökleri olarak seçin.
   - 1 doğru ve 3 çeldirici olmak üzere 4 seçenek (A, B, C, D) tasarlayın.
   - Çeldiriciler inandırıcı ama açıkça yanlış olmalıdır.
3. **Kalite Kontrolü**:
   - Yalnızca bir seçeneğin tamamen doğru olduğundan emin olun.
   - Çeldiriciler belirsiz olmamalıdır.
   - Seçenekler yaklaşık olarak eşit uzunlukta olmalıdır.

## Kısıtlamalar:
1. Tüm sorular kesinlikle verilen metne dayanmalıdır.
2. Farklı konuları kapsayın; tek bir bölüme yoğunlaşmaktan kaçının.
3. Meta bilgi sorularını dahil etmeyin.
4. Her soruda tam olarak 4 seçenek olmalıdır.
5. Tam olarak {{number}} soru oluşturulmalıdır.

## Çıktı Biçimi:
- question, options ve correctAnswer alanlarını içeren geçerli bir JSON dizisi döndürün.
- options, 4 seçenekten oluşan bir dizidir.
- correctAnswer, doğru seçeneğin harf tanımlayıcısıdır (A, B, C, D), options dizisindeki 0., 1., 2., 3. elemana karşılık gelir.
- Aşağıdaki yapıyı tam olarak takip edin:
\`\`\`json
[
  {
    "question": "Soru içeriği",
    "options": ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
    "correctAnswer": "B"
  }
]
\`\`\`

## Çıktı Örneği:
\`\`\`json
[
  {
    "question": "Aşağıdakilerden hangisi derin öğrenmenin temel özelliğidir?",
    "options": ["Manuel özellik mühendisliği gerektirir", "Otomatik olarak özellik temsilleri öğrenir", "Yalnızca yapılandırılmış verileri işleyebilir", "Büyük miktarda veri gerektirmez"],
    "correctAnswer": "B"
  }
]
\`\`\`

## Analiz Edilecek Metin:
{{text}}
`;

// ==================== 多選題 (Multiple Choice) ====================

export const EVAL_MULTIPLE_CHOICE_PROMPT = `
# Role: 多選題生成專家
## Profile:
- Description: 你是一名專業的測評題目設計專家，擅長根據文字內容生成高品質的多選題，用於評估模型的綜合理解能力。
- Input Length: {{textLength}} 字
- Output Goal: 生成 {{number}} 道多選題，每道題需包含題目、4-6個選項和正確答案（2個或以上）。

## Skills:
1. 能夠從文字中提取多個相關的知識點。
2. 擅長設計具有多個正確答案的題目。
3. 善於設計合理的干擾選項。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **文字解析**：通讀全文，識別可以組合的多個知識點。
2. **題目設計**：
   - 選擇包含多個要點的知識作為題幹。
   - 設計4-6個選項，其中2-4個正確，其餘為干擾項。
   - 確保正確選項之間有邏輯關聯。
3. **品質檢查**：
   - 確保至少有2個正確選項。
   - 干擾選項應具有迷惑性。
   - 避免"以上都對"、"以上都錯"等選項。

## Constraints:
1. 所有題目必須嚴格依據原文內容，不得新增外部資訊。
2. 題目需覆蓋文字的不同主題。
3. 每道題必須有2個或以上的正確答案。
4. 必須生成 {{number}} 道題目。

## Output Format:
- 使用合法的 JSON 陣列，每個元素包含 question、options 和 correctAnswer 欄位。
- options 是包含4-6個選項的陣列。
- correctAnswer 是包含所有正確選項索引標識的陣列（如 ["A", "C"]），對應 options 陣列中的元素位置。
- 嚴格遵循以下結構：
\`\`\`json
[
  {
    "question": "題目內容",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "correctAnswer": ["A", "C"]
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "以下哪些是深度學習的常用框架？",
    "options": ["TensorFlow", "PyTorch", "Excel", "Keras", "Word"],
    "correctAnswer": ["A", "B", "D"]
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_MULTIPLE_CHOICE_PROMPT_EN = `
# Role: Multiple Choice Question Generation Expert
## Profile:
- Description: You are an expert in designing multiple-choice questions to assess comprehensive understanding.
- Input Length: {{textLength}} characters
- Output Goal: Generate {{number}} multiple-choice questions with 4-6 options and 2+ correct answers.

## Skills:
1. Extract multiple related knowledge points from text.
2. Design questions with multiple correct answers.
3. Create reasonable distractors.
4. Ensure strict formatting for programmatic processing.

## Workflow:
1. **Text Parsing**: Read the passage and identify combinable knowledge points.
2. **Question Design**:
   - Select knowledge with multiple key points as question stem.
   - Design 4-6 options with 2-4 correct and others as distractors.
   - Ensure logical connection between correct options.
3. **Quality Check**:
   - Ensure at least 2 correct options.
   - Distractors should be plausible.
   - Avoid options like "all of the above" or "none of the above".

## Constraints:
1. All questions must be strictly based on the provided text.
2. Cover diverse topics.
3. Each question must have 2 or more correct answers.
4. Must generate exactly {{number}} questions.

## Output Format:
- Return a valid JSON array with question, options, and correctAnswer fields.
- options is an array of 4-6 choices.
- correctAnswer is an array containing all correct option index identifiers (e.g., ["A", "C"]), corresponding to positions in the options array.
- Follow this exact structure:
\`\`\`json
[
  {
    "question": "Question content",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": ["A", "C"]
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "Which of the following are commonly used deep learning frameworks?",
    "options": ["TensorFlow", "PyTorch", "Excel", "Keras", "Word"],
    "correctAnswer": ["A", "B", "D"]
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_MULTIPLE_CHOICE_PROMPT_TR = `
# Rol: Çoktan Seçmeli Soru Oluşturma Uzmanı
## Profil:
- Açıklama: Kapsamlı anlama yeteneğini değerlendirmek için çoktan seçmeli sorular tasarlama konusunda uzmansınız.
- Girdi Uzunluğu: {{textLength}} karakter
- Çıktı Hedefi: 4-6 seçenekli ve 2+ doğru cevaplı {{number}} adet çoktan seçmeli soru oluşturun.

## Beceriler:
1. Metinden birbirleriyle ilişkili birden fazla bilgi noktasını çıkarma.
2. Birden fazla doğru cevabı olan sorular tasarlama.
3. Makul çeldiriciler oluşturma.
4. Programatik işleme için katı biçimlendirme sağlama.

## İş Akışı:
1. **Metin Analizi**: Metni okuyun ve birleştirilebilir bilgi noktalarını belirleyin.
2. **Soru Tasarımı**:
   - Birden fazla temel noktayı içeren bilgileri soru kökü olarak seçin.
   - 2-4 doğru ve diğerleri çeldirici olmak üzere 4-6 seçenek tasarlayın.
   - Doğru seçenekler arasında mantıksal bağlantı olmasını sağlayın.
3. **Kalite Kontrolü**:
   - En az 2 doğru seçenek olduğundan emin olun.
   - Çeldiriciler inandırıcı olmalıdır.
   - "Yukarıdakilerin hepsi" veya "hiçbiri" gibi seçeneklerden kaçının.

## Kısıtlamalar:
1. Tüm sorular kesinlikle verilen metne dayanmalıdır.
2. Farklı konuları kapsayın.
3. Her soruda 2 veya daha fazla doğru cevap olmalıdır.
4. Tam olarak {{number}} soru oluşturulmalıdır.

## Çıktı Biçimi:
- question, options ve correctAnswer alanlarını içeren geçerli bir JSON dizisi döndürün.
- options, 4-6 seçenekten oluşan bir dizidir.
- correctAnswer, tüm doğru seçeneklerin harf tanımlayıcılarını içeren bir dizidir (örn. ["A", "C"]), options dizisindeki konumlarına karşılık gelir.
- Aşağıdaki yapıyı tam olarak takip edin:
\`\`\`json
[
  {
    "question": "Soru içeriği",
    "options": ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
    "correctAnswer": ["A", "C"]
  }
]
\`\`\`

## Çıktı Örneği:
\`\`\`json
[
  {
    "question": "Aşağıdakilerden hangileri yaygın olarak kullanılan derin öğrenme çerçeveleridir?",
    "options": ["TensorFlow", "PyTorch", "Excel", "Keras", "Word"],
    "correctAnswer": ["A", "B", "D"]
  }
]
\`\`\`

## Analiz Edilecek Metin:
{{text}}
`;

// ==================== 固定短答案 (Short Answer) ====================

export const EVAL_SHORT_ANSWER_PROMPT = `
# Role: 短答案題生成專家
## Profile:
- Description: 你是一名專業的測評題目設計專家，擅長根據文字內容生成需要簡短答案的題目，用於評估模型的資訊提取能力。
- Input Length: {{textLength}} 字
- Output Goal: 生成 {{number}} 道短答案題，每道題需包含題目和標準答案（極短）。

## Skills:
1. 能夠從文字中提取關鍵事實、定義、資料等。
2. 擅長設計答案明確、簡短的題目。
3. 善於將答案控制到極短，便於客觀評判。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **文字解析**：通讀全文，識別關鍵事實、定義、資料、結論等。
2. **題目設計**：
   - 選擇有明確答案的知識點作為題幹。
   - 題目優先選擇可用極短答案回答的事實點（實體、數值、時間、地點、名稱、術語等）。
   - 題目應該是"是什麼/是誰/哪裡/何時/多少/哪個/哪一項"等型別，避免需要長解釋的"為什麼/如何"。
3. **品質檢查**：
   - 答案必須明確、極短，且可從原文直接找到或直接歸納得出。
   - 答案可以在原文中直接找到或總結得出。
   - 避免需要解釋、論證、比較、舉例的題目。

## Constraints:
1. 所有題目必須嚴格依據原文內容，不得新增外部資訊。
2. 題目需覆蓋文字的不同主題。
3. correctAnswer 必須滿足以下三選一（且只能選其一）：
   - 一個詞或一個短語（不要分點、不要換行、不要解釋）
   - 一個數字或一個數值（可包含小數/百分號/單位）
   - 一句簡單的話（單句，不要分號/冒號/並列要點，不要解釋原因）
4. 必須生成 {{number}} 道題目。

## Output Format:
- 使用合法的 JSON 陣列，每個元素包含 question 和 correctAnswer 欄位。
- correctAnswer 是極短答案文字（符合 Constraints 第3條）。
- 嚴格遵循以下結構：
\`\`\`json
[
  {
    "question": "題目內容",
    "correctAnswer": "簡短答案"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "深度學習使用的典型模型結構是什麼？",
    "correctAnswer": "神經網路"
  },
  {
    "question": "文中提到的最大樣本量是多少？",
    "correctAnswer": "1000"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_SHORT_ANSWER_PROMPT_EN = `
# Role: Short Answer Question Generation Expert
## Profile:
- Description: You are an expert in designing short-answer questions to assess information extraction ability.
- Input Length: {{textLength}} characters
- Output Goal: Generate {{number}} short-answer questions with ultra-short answers.

## Skills:
1. Extract key facts, definitions, data from text.
2. Design questions with clear, concise answers.
3. Control answer length for objective evaluation.
4. Ensure strict formatting for programmatic processing.

## Workflow:
1. **Text Parsing**: Read the passage and identify key facts, definitions, data, conclusions.
2. **Question Design**:
   - Select knowledge points with clear answers as question stems.
   - Prioritize facts answerable with an ultra-short response (entity, name, number, date, place, term).
   - Prefer "what/who/where/when/how many/which" types; avoid "why/how" that require explanations.
3. **Quality Check**:
   - Answers must be clear, ultra-short, and grounded in the text.
   - Answers can be found or summarized from the text.
   - Avoid questions requiring long explanations, argumentation, or comparisons.

## Constraints:
1. All questions must be strictly based on the provided text.
2. Cover diverse topics.
3. Each correctAnswer must be exactly one of the following (and only one):
   - A single word (no spaces), or a short phrase (no lists, no line breaks, no explanation)
   - A single number or numeric value (decimals/percent/units allowed)
   - One simple sentence (single sentence only; no lists; no explanation)
4. Must generate exactly {{number}} questions.

## Output Format:
- Return a valid JSON array with question and correctAnswer fields.
- correctAnswer is an ultra-short answer that follows the constraints above.
- Follow this exact structure:
\`\`\`json
[
  {
    "question": "Question content",
    "correctAnswer": "Concise answer"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "What model structure is typically used for deep learning in the text?",
    "correctAnswer": "neural network"
  },
  {
    "question": "What is the maximum sample size mentioned in the text?",
    "correctAnswer": "1000"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_SHORT_ANSWER_PROMPT_TR = `
# Rol: Kısa Cevaplı Soru Oluşturma Uzmanı
## Profil:
- Açıklama: Bilgi çıkarma yeteneğini değerlendirmek için kısa cevaplı sorular tasarlama konusunda uzmansınız.
- Girdi Uzunluğu: {{textLength}} karakter
- Çıktı Hedefi: Çok kısa cevaplı {{number}} adet kısa cevaplı soru oluşturun.

## Beceriler:
1. Metinden temel gerçekleri, tanımları, verileri çıkarma.
2. Net ve kısa cevaplı sorular tasarlama.
3. Objektif değerlendirme için cevap uzunluğunu kontrol etme.
4. Programatik işleme için katı biçimlendirme sağlama.

## İş Akışı:
1. **Metin Analizi**: Metni okuyun ve temel gerçekleri, tanımları, verileri, sonuçları belirleyin.
2. **Soru Tasarımı**:
   - Net cevapları olan bilgi noktalarını soru kökleri olarak seçin.
   - Çok kısa cevapla yanıtlanabilecek olgusal noktaları tercih edin (varlık, isim, sayı, tarih, yer, terim).
   - "ne/kim/nerede/ne zaman/kaç/hangi" türü soruları tercih edin; açıklama gerektiren "neden/nasıl" sorularından kaçının.
3. **Kalite Kontrolü**:
   - Cevaplar net, çok kısa ve metne dayalı olmalıdır.
   - Cevaplar metinden bulunabilir veya özetlenebilir olmalıdır.
   - Uzun açıklama, tartışma veya karşılaştırma gerektiren sorulardan kaçının.

## Kısıtlamalar:
1. Tüm sorular kesinlikle verilen metne dayanmalıdır.
2. Farklı konuları kapsayın.
3. Her correctAnswer aşağıdakilerden tam olarak biri olmalıdır (ve yalnızca biri):
   - Tek bir kelime veya kısa bir ifade (liste yok, satır sonu yok, açıklama yok)
   - Tek bir sayı veya sayısal değer (ondalık/yüzde/birim olabilir)
   - Basit bir cümle (tek cümle; liste yok; açıklama yok)
4. Tam olarak {{number}} soru oluşturulmalıdır.

## Çıktı Biçimi:
- question ve correctAnswer alanlarını içeren geçerli bir JSON dizisi döndürün.
- correctAnswer, yukarıdaki kısıtlamalara uygun çok kısa bir cevaptır.
- Aşağıdaki yapıyı tam olarak takip edin:
\`\`\`json
[
  {
    "question": "Soru içeriği",
    "correctAnswer": "Kısa cevap"
  }
]
\`\`\`

## Çıktı Örneği:
\`\`\`json
[
  {
    "question": "Metinde derin öğrenme için tipik olarak kullanılan model yapısı nedir?",
    "correctAnswer": "sinir ağı"
  },
  {
    "question": "Metinde belirtilen maksimum örnek boyutu nedir?",
    "correctAnswer": "1000"
  }
]
\`\`\`

## Analiz Edilecek Metin:
{{text}}
`;

// ==================== 開放式回答 (Open-ended) ====================

export const EVAL_OPEN_ENDED_PROMPT = `
# Role: 開放式問題生成專家
## Profile:
- Description: 你是一名專業的測評題目設計專家，擅長根據文字內容生成需要深入分析和論述的開放式問題，用於評估模型的理解和推理能力。
- Input Length: {{textLength}} 字
- Output Goal: 生成 {{number}} 道開放式問題，每道題需包含題目和參考答案（形式不限）。

## Skills:
1. 能夠從文字中提取需要深入理解的主題。
2. 擅長設計需要分析、比較、評價的題目。
3. 善於提供基於原文的參考答案，能體現推理與論證過程。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **文字解析**：通讀全文，識別核心主題、觀點、論證邏輯等。
2. **題目設計**：
   - 選擇需要深入理解的主題作為題幹。
   - 題目應該是"如何"、"為什麼"、"分析"、"比較"等型別。
   - 參考答案不要求固定要點數、句子數或固定結構；可用段落、分點、步驟、對比等任意合適形式表達。
3. **品質檢查**：
   - 題目應該有一定的開放性，允許多角度回答。
   - 參考答案應基於原文資訊組織論述，邏輯自洽，能夠覆蓋題幹核心要求。
   - 避免過於簡單或過於寬泛的題目。

## Constraints:
1. 所有題目必須嚴格依據原文內容，不得新增外部資訊。
2. 題目需覆蓋文字的核心主題。
4. 必須生成 {{number}} 道題目。

## Output Format:
- 使用合法的 JSON 陣列，每個元素包含 question 和 correctAnswer 欄位。
- correctAnswer 是參考答案（形式不限，但需基於原文、邏輯自洽，直接回應問題）。
- 嚴格遵循以下結構：
\`\`\`json
[
  {
    "question": "題目內容",
    "correctAnswer": "參考答案，包含多個要點"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "分析深度學習在計算機視覺領域取得成功的主要原因。",
    "correctAnswer": "深度學習在計算機視覺的成功可以從模型、資料與算力三個維度解釋：一方面，卷積等結構更適合提取影像的層次化特徵；另一方面，大規模標註資料讓模型能夠學習到更穩健的表示；同時，GPU等硬體與工程最佳化使得更大模型與更長訓練成為可行。結合遷移學習等方法，落地成本進一步降低，從而推動了效果與應用的快速提升。"
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_OPEN_ENDED_PROMPT_EN = `
# Role: Open-ended Question Generation Expert
## Profile:
- Description: You are an expert in designing open-ended questions requiring deep analysis to assess understanding and reasoning.
- Input Length: {{textLength}} characters
- Output Goal: Generate {{number}} open-ended questions with reference answers (no fixed format).

## Skills:
1. Extract topics requiring deep understanding from text.
2. Design questions requiring analysis, comparison, evaluation.
3. Provide grounded reference answers that show reasoning and justification.
4. Ensure strict formatting for programmatic processing.

## Workflow:
1. **Text Parsing**: Read the passage and identify core themes, viewpoints, reasoning logic.
2. **Question Design**:
   - Select topics requiring deep understanding as question stems.
   - Questions should be "how", "why", "analyze", "compare" types.
   - Reference answers should NOT be forced into a fixed number of points or sentences; use whatever structure best fits the question.
3. **Quality Check**:
   - Questions should be somewhat open-ended, allowing multiple perspectives.
   - Reference answers should be grounded in the text, logical, and directly address the question.
   - Avoid overly simple or overly broad questions.

## Constraints:
1. All questions must be strictly based on the provided text.
2. Cover core themes of the text.
4. Must generate exactly {{number}} questions.

## Output Format:
- Return a valid JSON array with question and correctAnswer fields.
- correctAnswer is a reference answer (no fixed format), grounded in the text and logically coherent.
- Follow this exact structure:
\`\`\`json
[
  {
    "question": "Question content",
    "correctAnswer": "Reference answer with multiple points"
  }
]
\`\`\`

## Output Example:
\`\`\`json
[
  {
    "question": "Analyze the main reasons for deep learning's success in computer vision.",
    "correctAnswer": "Deep learning's success in computer vision can be explained by the interaction of model inductive biases, data scale, and compute. Architectures such as convolutional networks are well-suited to learning hierarchical visual features; large labeled datasets enable robust representation learning; and GPU-driven training makes large models practical. Together with engineering advances and transfer learning, these factors translate into strong performance and broad applicability across tasks."
  }
]
\`\`\`

## Text to Analyze:
{{text}}
`;

export const EVAL_OPEN_ENDED_PROMPT_TR = `
# Rol: Açık Uçlu Soru Oluşturma Uzmanı
## Profil:
- Açıklama: Anlama ve muhakeme yeteneğini değerlendirmek için derinlemesine analiz gerektiren açık uçlu sorular tasarlama konusunda uzmansınız.
- Girdi Uzunluğu: {{textLength}} karakter
- Çıktı Hedefi: Referans cevaplarla birlikte (sabit biçim yok) {{number}} adet açık uçlu soru oluşturun.

## Beceriler:
1. Metinden derin anlayış gerektiren konuları çıkarma.
2. Analiz, karşılaştırma, değerlendirme gerektiren sorular tasarlama.
3. Muhakeme ve gerekçelendirme gösteren, metne dayalı referans cevaplar sağlama.
4. Programatik işleme için katı biçimlendirme sağlama.

## İş Akışı:
1. **Metin Analizi**: Metni okuyun ve temel temaları, bakış açılarını, muhakeme mantığını belirleyin.
2. **Soru Tasarımı**:
   - Derin anlayış gerektiren konuları soru kökleri olarak seçin.
   - Sorular "nasıl", "neden", "analiz edin", "karşılaştırın" türünde olmalıdır.
   - Referans cevaplar sabit sayıda madde veya cümleye zorlanmamalıdır; soruya en uygun yapıyı kullanın.
3. **Kalite Kontrolü**:
   - Sorular bir miktar açık uçlu olmalı, birden fazla bakış açısına izin vermelidir.
   - Referans cevaplar metne dayalı, mantıksal ve soruya doğrudan yanıt veren olmalıdır.
   - Çok basit veya çok geniş kapsamlı sorulardan kaçının.

## Kısıtlamalar:
1. Tüm sorular kesinlikle verilen metne dayanmalıdır.
2. Metnin temel konularını kapsayın.
4. Tam olarak {{number}} soru oluşturulmalıdır.

## Çıktı Biçimi:
- question ve correctAnswer alanlarını içeren geçerli bir JSON dizisi döndürün.
- correctAnswer, bir referans cevaptır (sabit biçim yok), metne dayalı ve mantıksal olarak tutarlı olmalıdır.
- Aşağıdaki yapıyı tam olarak takip edin:
\`\`\`json
[
  {
    "question": "Soru içeriği",
    "correctAnswer": "Birden fazla nokta içeren referans cevap"
  }
]
\`\`\`

## Çıktı Örneği:
\`\`\`json
[
  {
    "question": "Derin öğrenmenin bilgisayarla görme alanındaki başarısının ana nedenlerini analiz edin.",
    "correctAnswer": "Derin öğrenmenin bilgisayarla görmedeki başarısı model, veri ve hesaplama gücü olmak üzere üç boyuttan açıklanabilir: Bir yandan, evrişimli ağlar gibi yapılar görüntülerin hiyerarşik özelliklerini çıkarmaya daha uygundur; öte yandan, büyük ölçekli etiketlenmiş veriler modelin daha sağlam temsiller öğrenmesini sağlar; aynı zamanda, GPU gibi donanımlar ve mühendislik optimizasyonları daha büyük modelleri ve daha uzun eğitimi mümkün kılmaktadır. Transfer öğrenme gibi yöntemlerle birleştiğinde, uygulama maliyeti daha da düşerek performans ve uygulama alanlarında hızlı bir ilerleme sağlanmıştır."
  }
]
\`\`\`

## Analiz Edilecek Metin:
{{text}}
`;

// ==================== 主函式 ====================

/**
 * 根據題型生成評估題目的提示詞
 * @param {string} language - 語言，'zh-TW' 或 'en'
 * @param {string} questionType - 題型: true_false, single_choice, multiple_choice, short_answer, open_ended
 * @param {Object} params - 引數物件
 * @param {string} params.text - 待處理的文字
 * @param {number} params.number - 題目數量
 * @param {string} projectId - 專案ID（用於自定義提示詞）
 * @returns {Promise<string>} - 完整的提示詞
 */
export async function getEvalQuestionPrompt(language, questionType, { text, number = 5 }, projectId = null) {
  // 根據題型選擇對應的提示詞模板
  const promptMap = {
    true_false: {
      promptType: 'evalQuestion',
      promptKey: 'EVAL_TRUE_FALSE_PROMPT',
      templates: {
        zh: EVAL_TRUE_FALSE_PROMPT,
        en: EVAL_TRUE_FALSE_PROMPT_EN,
        tr: EVAL_TRUE_FALSE_PROMPT_TR
      }
    },
    single_choice: {
      promptType: 'evalQuestion',
      promptKey: 'EVAL_SINGLE_CHOICE_PROMPT',
      templates: {
        zh: EVAL_SINGLE_CHOICE_PROMPT,
        en: EVAL_SINGLE_CHOICE_PROMPT_EN,
        tr: EVAL_SINGLE_CHOICE_PROMPT_TR
      }
    },
    multiple_choice: {
      promptType: 'evalQuestion',
      promptKey: 'EVAL_MULTIPLE_CHOICE_PROMPT',
      templates: {
        zh: EVAL_MULTIPLE_CHOICE_PROMPT,
        en: EVAL_MULTIPLE_CHOICE_PROMPT_EN,
        tr: EVAL_MULTIPLE_CHOICE_PROMPT_TR
      }
    },
    short_answer: {
      promptType: 'evalQuestion',
      promptKey: 'EVAL_SHORT_ANSWER_PROMPT',
      templates: {
        zh: EVAL_SHORT_ANSWER_PROMPT,
        en: EVAL_SHORT_ANSWER_PROMPT_EN,
        tr: EVAL_SHORT_ANSWER_PROMPT_TR
      }
    },
    open_ended: {
      promptType: 'evalQuestion',
      promptKey: 'EVAL_OPEN_ENDED_PROMPT',
      templates: {
        zh: EVAL_OPEN_ENDED_PROMPT,
        en: EVAL_OPEN_ENDED_PROMPT_EN,
        tr: EVAL_OPEN_ENDED_PROMPT_TR
      }
    }
  };

  const config = promptMap[questionType];
  if (!config) {
    throw new Error(`不支援的題型: ${questionType}`);
  }

  const result = await processPrompt(
    language,
    config.promptType,
    config.promptKey,
    config.templates,
    {
      textLength: text.length,
      number,
      text
    },
    projectId
  );

  return result;
}
