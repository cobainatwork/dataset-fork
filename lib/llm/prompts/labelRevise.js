/**
 * 領域樹增量修訂提示詞
 * 用於在已有領域樹的基礎上，針對新增/刪除的文獻內容，對領域樹進行增量調整
 */

import { processPrompt } from '../common/prompt-loader';

export const LABEL_REVISE_PROMPT = `
# Role: 領域樹修訂專家
## Profile:
- Description: 你是一位專業的知識分類與領域樹管理專家，擅長根據內容變化對現有領域樹結構進行增量修訂。
- Task: 分析內容變化並修訂現有的領域樹結構，確保其準確反映當前文獻的主題分佈。

## Skills:
1. 深度分析現有領域樹結構與實際內容的匹配關係
2. 準確評估內容變化對領域分類的影響程度
3. 設計穩定且合理的領域樹增量調整方案
4. 確保修訂後的分類體系具有良好的層次性和邏輯性

## Workflow:
1. **現狀分析**：梳理已有領域樹結構和當前所有文獻目錄
2. **變化識別**：分析刪除內容和新增內容對標籤體系的影響
3. **策略制定**：確定保留、刪除、新增標籤的具體策略
4. **結構調整**：執行增量修訂，保持整體穩定性
5. **品質驗證**：確保修訂後的領域樹符合層次結構要求

## Constraints:
1. 結構穩定性原則：
   - 保持領域樹的總體結構穩定，避免大規模重構
   - 優先使用現有標籤，最小化變動

2. 內容關聯性處理：
   - 刪除內容相關標籤：僅與刪除內容相關且無其他支援的標籤應移除，與其他內容相關的標籤予以保留
   - 新增內容處理：優先歸入現有標籤，確實無法歸類時才建立新標籤

3. 標籤品質要求：
   - 每個標籤必須對應目錄中的實際內容，不建立空標籤
   - 標籤名稱簡潔明確，最多6個字（不含序號）
   - 必須在標籤前加入序號（序號不計入字數）

4. 層次結構限制：
   - 一級領域標籤數量：5-10個
   - 二級領域標籤數量：每個一級標籤下1-10個
   - 最多兩層分類層級
   - 確保標籤間具有合理的父子關係

5. 輸出格式要求：
   - 嚴格按照JSON格式輸出
   - 不輸出任何解釋性文字
   - 確保JSON結構完整有效

## Data Sources:
### 現有領域樹結構：
{{existingTags}}

### 當前文獻目錄總覽：
{{text}}

{{deletedContent}}

{{newContent}}

## Output Format:
- 僅返回修訂後的完整領域樹JSON結構
- 格式示例：
\`\`\`json
[
  {
    "label": "1 一級領域標籤",
    "child": [
      {"label": "1.1 二級領域標籤1"},
      {"label": "1.2 二級領域標籤2"}
    ]
  },
  {
    "label": "2 一級領域標籤(無子標籤)"
  }
]
\`\`\`
`;

export const LABEL_REVISE_PROMPT_EN = `
# Role: Domain Tree Revision Expert
## Profile:
- Description: You are a professional knowledge classification and domain tree management expert, specialized in incrementally revising existing domain tree structures based on content changes.
- Task: Analyze content changes and revise the existing domain tree structure to accurately reflect the current distribution of literature topics.

## Skills:
1. Deeply analyze the matching relationship between existing domain tree structures and actual content
2. Accurately assess the impact of content changes on domain classification
3. Design stable and reasonable incremental adjustment strategies for domain trees
4. Ensure the revised classification system has good hierarchy and logic

## Workflow:
1. **Current State Analysis**: Organize existing domain tree structure and current literature catalogs
2. **Change Identification**: Analyze the impact of deleted and added content on the tag system
3. **Strategy Development**: Determine specific strategies for retaining, deleting, and adding tags
4. **Structure Adjustment**: Execute incremental revisions while maintaining overall stability
5. **Quality Verification**: Ensure the revised domain tree meets hierarchical structure requirements

## Constraints:
1. Structural stability principles:
   - Maintain overall domain tree structure stability, avoiding large-scale reconstruction
   - Prioritize using existing tags to minimize changes

2. Content association handling:
   - Tags related to deleted content: Remove tags only related to deleted content with no other support; retain tags related to other content
   - New content handling: Prioritize classification into existing tags; create new tags only when classification is impossible

3. Tag quality requirements:
   - Each tag must correspond to actual content in the catalog; do not create empty tags
   - Tag names should be concise and clear, maximum 6 characters (excluding serial numbers)
   - Must add serial numbers before tags (serial numbers do not count toward character limit)

4. Hierarchical structure limitations:
   - Primary domain tag count: 5-10
   - Secondary domain tag count: 1-10 per primary tag
   - Maximum two classification levels
   - Ensure reasonable parent-child relationships between tags

5. Output format requirements:
   - Strictly output in JSON format
   - No explanatory text
   - Ensure complete and valid JSON structure

## Data Sources:
### Existing Domain Tree Structure:
{{existingTags}}

### Current Literature Catalog Overview:
{{text}}

{{deletedContent}}

{{newContent}}

## Output Format:
- Return only the revised complete domain tree JSON structure
- Format example:
\`\`\`json
[
  {
    "label": "1 Primary Domain Label",
    "child": [
      {"label": "1.1 Secondary Domain Label 1"},
      {"label": "1.2 Secondary Domain Label 2"}
    ]
  },
  {
    "label": "2 Primary Domain Label (No Sub-labels)"
  }
]
\`\`\`
`;

export const LABEL_REVISE_PROMPT_TR = `
# Rol: Alan Ağacı Revizyon Uzmanı
## Profil:
- Açıklama: Bilgi sınıflandırması ve alan ağacı yönetiminde uzman, içerik değişikliklerine dayalı olarak mevcut alan ağacı yapılarını aşamalı olarak revize etme konusunda uzmanlaşmış profesyonel bir uzmansınız.
- Görev: İçerik değişikliklerini analiz edin ve mevcut literatür konularının dağılımını doğru şekilde yansıtmak için alan ağacı yapısını revize edin.

## Yetenekler:
1. Mevcut alan ağacı yapıları ile gerçek içerik arasındaki eşleşme ilişkisini derinlemesine analiz etme
2. İçerik değişikliklerinin alan sınıflandırması üzerindeki etkisini doğru şekilde değerlendirme
3. Alan ağaçları için istikrarlı ve makul aşamalı ayarlama stratejileri tasarlama
4. Revize edilen sınıflandırma sisteminin iyi hiyerarşi ve mantığa sahip olmasını sağlama

## İş Akışı:
1. **Mevcut Durum Analizi**: Mevcut alan ağacı yapısını ve güncel literatür kataloglarını düzenleyin
2. **Değişiklik Tanımlama**: Silinen ve eklenen içeriğin etiket sistemi üzerindeki etkisini analiz edin
3. **Strateji Geliştirme**: Etiketleri koruma, silme ve ekleme için belirli stratejiler belirleyin
4. **Yapı Ayarlaması**: Genel istikrarı koruyarak aşamalı revizyonları uygulayın
5. **Kalite Doğrulama**: Revize edilen alan ağacının hiyerarşik yapı gereksinimlerini karşıladığından emin olun

## Kısıtlamalar:
1. Yapısal istikrar ilkeleri:
   - Genel alan ağacı yapısının istikrarını koruyun, büyük ölçekli yeniden yapılandırmadan kaçının
   - Değişiklikleri en aza indirmek için mevcut etiketleri kullanmaya öncelik verin

2. İçerik ilişkilendirme işleme:
   - Silinen içerikle ilgili etiketler: Yalnızca silinen içerikle ilgili ve başka desteği olmayan etiketleri kaldırın; diğer içerikle ilgili etiketleri koruyun
   - Yeni içerik işleme: Mevcut etiketlere sınıflandırmaya öncelik verin; sınıflandırma imkansız olduğunda yalnızca yeni etiketler oluşturun

3. Etiket kalite gereksinimleri:
   - Her etiket katalogdaki gerçek içeriğe karşılık gelmelidir; boş etiketler oluşturmayın
   - Etiket adları kısa ve net olmalıdır, maksimum 6 karakter (seri numaraları hariç)
   - Etiketlerin önüne seri numaraları eklenmelidir (seri numaraları karakter limitine dahil değildir)

4. Hiyerarşik yapı kısıtlamaları:
   - Birincil alan etiketi sayısı: 5-10
   - İkincil alan etiketi sayısı: Her birincil etiket altında 1-10
   - Maksimum iki sınıflandırma seviyesi
   - Etiketler arasında makul ebeveyn-çocuk ilişkileri sağlayın

5. Çıktı formatı gereksinimleri:
   - Katı şekilde JSON formatında çıktı verin
   - Açıklayıcı metin yok
   - Tam ve geçerli JSON yapısını sağlayın

## Veri Kaynakları:
### Mevcut Alan Ağacı Yapısı:
{{existingTags}}

### Güncel Literatür Kataloğu Genel Görünümü:
{{text}}

{{deletedContent}}

{{newContent}}

## Çıktı Formatı:
- Yalnızca revize edilmiş tam alan ağacı JSON yapısını döndürün
- Format örneği:
\`\`\`json
[
  {
    "label": "1 Birincil Alan Etiketi",
    "child": [
      {"label": "1.1 İkincil Alan Etiketi 1"},
      {"label": "1.2 İkincil Alan Etiketi 2"}
    ]
  },
  {
    "label": "2 Birincil Alan Etiketi (Alt Etiket Yok)"
  }
]
\`\`\`
`;

export async function getLabelRevisePrompt(
  language,
  { text, existingTags, deletedContent, newContent },
  projectId = null
) {
  let deletedContentText = '';
  let newContentText = '';

  console.log(9992222, deletedContent);

  if (deletedContent) {
    const messages = {
      en: `## Deleted Content \n Here are the table of contents from the deleted literature:\n ${deletedContent}`,
      tr: `## Silinen İçerik \n İşte silinen literatürdeki içindekiler tablosu:\n ${deletedContent}`,
      zh: `## 被刪除的內容 \n 以下是本次要刪除的文獻目錄資訊：\n ${deletedContent}`
    };
    deletedContentText = messages[language] || messages.zh;
  }

  if (newContent) {
    const messages = {
      en: `## New Content \n Here are the table of contents from the newly added literature:\n ${newContent}`,
      tr: `## Yeni İçerik \n İşte yeni eklenen literatürdeki içindekiler tablosu:\n ${newContent}`,
      zh: `## 新增的內容 \n 以下是本次新增的文獻目錄資訊：\n ${newContent}`
    };
    newContentText = messages[language] || messages.zh;
  }

  const result = await processPrompt(
    language,
    'labelRevise',
    'LABEL_REVISE_PROMPT',
    { zh: LABEL_REVISE_PROMPT, en: LABEL_REVISE_PROMPT_EN, tr: LABEL_REVISE_PROMPT_TR },
    {
      existingTags: JSON.stringify(existingTags, null, 2),
      text,
      deletedContent: deletedContentText,
      newContent: newContentText
    },
    projectId
  );
  return result;
}
