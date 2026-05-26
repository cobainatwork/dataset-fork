import { processPrompt } from '../common/prompt-loader';

export const IMAGE_QUESTION_PROMPT = `
# Role: 影像問題生成專家
## Profile:
- Description: 你是一名專業的視覺內容分析與問題設計專家，能夠從影像中提煉關鍵資訊併產出可用於視覺模型微調的高品質問題集合。
- Output Goal: 生成 {{number}} 個高品質問題，用於構建視覺問答訓練資料集。

## Skills:
1. 能夠全面理解影像內容，識別核心物件、場景、關係與細節。
2. 擅長設計具有明確答案指向性的問題，覆蓋影像多個層面。
3. 善於控制問題難度與型別，保證多樣性與代表性。
4. 嚴格遵守格式規範，確保輸出可直接用於程式化處理。

## Workflow:
1. **影像解析**：仔細觀察影像，識別主要物件、場景、顏色、位置關係、動作、情感等要素。
2. **問題設計**：基於影像內容的豐富程度和重要性選擇最佳提問切入點，涵蓋：
   - 內容描述（What）：影像中有什麼物件、場景
   - 細節分析（Detail）：顏色、形狀、數量、位置等具體特徵
   - 場景理解（Where/When）：場景型別、時間、地點等背景資訊
   - 關係推理（Relation）：物件之間的關係、空間位置
   - 情感表達（Emotion）：影像傳達的情感、氛圍
   - 深度理解（Why/How）：可能的原因、目的、方式
3. **品質檢查**：逐條校驗問題，確保：
   - 問題答案可在影像中直接觀察或合理推斷。
   - 問題之間主題不重複、角度不雷同。
   - 語言表述準確、無歧義且符合常規問句形式。
   - 問題具有一定深度，避免過於簡單的是非問題。

## Constraints:
1. 所有問題必須嚴格基於影像內容，不得新增影像中不存在的資訊。
2. 問題需覆蓋影像的不同方面（物件、場景、細節、關係等），避免集中於單一元素。
3. 禁止輸出與影像元資訊相關的問題（如拍攝裝置、檔案格式等）。
4. 問題不得包含"圖片中/照片中/畫面中"等冗餘表述，直接提問即可。
5. 輸出恰好 {{number}} 個問題，且保持格式一致。
6. 避免簡單的是非問題，鼓勵開放性和描述性問題。
7. 問題必須要自然，不能在問題中出現："圖片中/照片中/畫面中/文中/這段文字/這張圖片" 這樣的表述。

## Output Format:
- 使用合法的 JSON 陣列，僅包含字串元素。
- 欄位必須使用英文雙引號。
- 嚴格遵循以下結構：
\`\`\`json
["問題1", "問題2", "問題3"]
\`\`\`

## Output Example:
\`\`\`json
["畫面的主要內容是什麼？", "前景中的人物在做什麼？", "這個場景最可能發生在什麼時間？"]
\`\`\`

請仔細觀察影像，生成 {{number}} 個高品質問題。
`;

export const IMAGE_QUESTION_PROMPT_EN = `
# Role: Image Question Generation Expert
## Profile:
- Description: You are an expert in visual content analysis and question design, capable of extracting key information from images and producing high-quality questions for vision model fine-tuning datasets.
- Output Goal: Generate {{number}} high-quality questions suitable for visual question-answering training data.

## Skills:
1. Comprehend image content thoroughly and identify core objects, scenes, relationships, and details.
2. Design questions with clear answer orientation that cover multiple aspects of the image.
3. Balance difficulty and variety to ensure representative coverage of the visual content.
4. Enforce strict formatting so the output can be consumed programmatically.

## Workflow:
1. **Image Analysis**: Carefully observe the image and identify main objects, scenes, colors, spatial relationships, actions, emotions, and other elements.
2. **Question Design**: Select the most informative focal points based on the richness and importance of image content, covering:
   - Content Description (What): What objects and scenes are in the image
   - Detail Analysis (Detail): Specific features like colors, shapes, quantities, positions
   - Scene Understanding (Where/When): Scene type, time, location, and background information
   - Relationship Reasoning (Relation): Relationships between objects, spatial positions
   - Emotional Expression (Emotion): Emotions and atmosphere conveyed by the image
   - Deep Understanding (Why/How): Possible reasons, purposes, methods
3. **Quality Check**: Validate each question to ensure:
   - The answer can be directly observed or reasonably inferred from the image.
   - Questions do not duplicate topics or angles.
   - Wording is precise, unambiguous, and uses natural interrogative phrasing.
   - Questions have sufficient depth, avoiding overly simple yes/no questions.

## Constraints:
1. Every question must be strictly based on image content; no information not present in the image.
2. Cover diverse aspects of the image (objects, scenes, details, relationships, etc.); avoid clustering around a single element.
3. Do not include questions about image metadata (camera, file format, etc.).
4. Avoid redundant phrases like "in the image/photo/picture"; ask questions directly.
5. Produce exactly {{number}} questions with consistent formatting.
6. Avoid simple yes/no questions; encourage open-ended and descriptive questions.
7. Questions must be natural, cannot contain phrases like "in the image/photo/picture/this text/this image".

## Output Format:
- Return a valid JSON array containing only strings.
- Use double quotes for all strings.
- Follow this exact structure:
\`\`\`json
["Question 1", "Question 2", "Question 3"]
\`\`\`

## Output Example:
\`\`\`json
["What is the main content of the scene?", "What is the person in the foreground doing?", "When is this scene most likely taking place?"]
\`\`\`

Please carefully observe the image and generate {{number}} high-quality questions.
`;

export const IMAGE_QUESTION_PROMPT_TR = `
# Rol: Görsel Soru Oluşturma Uzmanı
## Profil:
- Açıklama: Görsel içerik analizi ve soru tasarımında uzman, görüntülerden anahtar bilgileri çıkarabilen ve görme modeli ince ayar veri setleri için yüksek kaliteli sorular üretebilen bir uzmansınız.
- Çıktı Hedefi: Görsel soru-cevap eğitim verileri için uygun {{number}} adet yüksek kaliteli soru oluşturun.

## Yetenekler:
1. Görüntü içeriğini kapsamlı şekilde anlayın ve temel nesneleri, sahneleri, ilişkileri ve detayları tanımlayın.
2. Görüntünün birden fazla yönünü kapsayan net cevap yönelimli sorular tasarlayın.
3. Görsel içeriğin temsili kapsamını sağlamak için zorluk ve çeşitliliği dengeleyin.
4. Çıktının programatik olarak tüketilebilmesi için katı biçimlendirme uygulayın.

## İş Akışı:
1. **Görüntü Analizi**: Görüntüyü dikkatlice gözlemleyin ve ana nesneleri, sahneleri, renkleri, mekansal ilişkileri, eylemleri, duyguları ve diğer öğeleri tanımlayın.
2. **Soru Tasarımı**: Görüntü içeriğinin zenginliğine ve önemine göre en bilgilendirici odak noktalarını seçin, kapsayacak alanlar:
   - İçerik Tanımı (Ne): Görüntüde hangi nesneler ve sahneler var
   - Detay Analizi (Detay): Renkler, şekiller, miktarlar, pozisyonlar gibi belirli özellikler
   - Sahne Anlayışı (Nerede/Ne Zaman): Sahne türü, zaman, konum ve arka plan bilgisi
   - İlişki Akıl Yürütme (İlişki): Nesneler arasındaki ilişkiler, mekansal pozisyonlar
   - Duygusal İfade (Duygu): Görüntünün ilettiği duygular ve atmosfer
   - Derin Anlayış (Neden/Nasıl): Olası nedenler, amaçlar, yöntemler
3. **Kalite Kontrolü**: Her soruyu doğrulayarak şunları sağlayın:
   - Cevap görüntüden doğrudan gözlemlenebilir veya makul şekilde çıkarılabilir.
   - Sorular konuları veya açıları tekrarlamıyor.
   - İfadeler kesin, belirsizlikten uzak ve doğal soru cümlesi kullanıyor.
   - Sorular yeterli derinliğe sahip, aşırı basit evet/hayır sorularından kaçınılıyor.

## Kısıtlamalar:
1. Her soru kesinlikle görüntü içeriğine dayalı olmalı; görüntüde olmayan bilgi eklenmemeli.
2. Görüntünün çeşitli yönlerini kapsayın (nesneler, sahneler, detaylar, ilişkiler, vb.); tek bir öğe etrafında kümelenmekten kaçının.
3. Görüntü meta verileri hakkında sorular eklemeyin (kamera, dosya formatı, vb.).
4. "Görüntüde/fotoğrafta/resimde" gibi gereksiz ifadelerden kaçının; doğrudan soru sorun.
5. Tutarlı biçimlendirmeyle tam olarak {{number}} soru üretin.
6. Basit evet/hayır sorularından kaçının; açık uçlu ve tanımlayıcı soruları teşvik edin.
7. Sorular doğal olmalı, "görüntüde/fotoğrafta/resimde/bu metinde/bu görüntüde" gibi ifadeler içeremez.

## Çıktı Formatı:
- Yalnızca dizeler içeren geçerli bir JSON dizisi döndürün.
- Tüm dizeler için çift tırnak kullanın.
- Bu tam yapıyı izleyin:
\`\`\`json
["Soru 1", "Soru 2", "Soru 3"]
\`\`\`

## Çıktı Örneği:
\`\`\`json
["Sahnenin ana içeriği nedir?", "Ön plandaki kişi ne yapıyor?", "Bu sahne büyük olasılıkla ne zaman gerçekleşiyor?"]
\`\`\`

Lütfen görüntüyü dikkatlice gözlemleyin ve {{number}} adet yüksek kaliteli soru oluşturun.
`;

/**
 * 生成影像問題提示詞
 * @param {string} language - 語言，'en' 或 'zh-TW'
 * @param {Object} params - 引數物件
 * @param {number} params.number - 問題數量
 * @param {string} projectId - 專案ID（用於自定義提示詞）
 * @returns {string} - 完整的提示詞
 */
export async function getImageQuestionPrompt(language, { number = 3 }, projectId = null) {
  const result = await processPrompt(
    language,
    'imageQuestion',
    'IMAGE_QUESTION_PROMPT',
    { zh: IMAGE_QUESTION_PROMPT, en: IMAGE_QUESTION_PROMPT_EN, tr: IMAGE_QUESTION_PROMPT_TR },
    {
      number
    },
    projectId
  );
  return result;
}
