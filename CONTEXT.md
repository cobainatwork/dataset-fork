# CONTEXT

專案領域詞彙。工程 skills 在產出（issue 標題、重構提案、測試名）中使用這些詞，不自造同義詞。

## File replacement（docver replace）

替換既有文件的實體內容：新檔寫入同一 path/fileName，DB 建新 `UploadFiles` row 並沿用 `lineageId`，寫 append-only 稽核記錄（`DocumentReplacement`），完整清除舊文件的衍生資料（chunks、questions、datasets、embeddings、cluster 收斂），接著 server 端直接建立 `file-processing` task 重跑 PDF 轉換與分塊（領域樹固定 `keep`）。UI 只負責送 bytes，不參與後續協調。

- 實作位置：`app/api/projects/[projectId]/files/[fileId]/replace/route.js`（orchestration）＋ `lib/db/upload-files.js` 的 `replaceUploadFile`（lineage / 稽核 / purge）。
- 同義詞避免：不要稱「上傳」（upload 是新增文件）、不要稱「更新檔」（update 沒有 lineage 語意）。

## Lineage

同一份文件多次替換後的版本鏈：所有版本共用一個 `lineageId`（首版以自身 id 為根），透過 `DocumentReplacement` 記錄 old→new 對應。

## Chunk

文件經分塊（split）後的文字單位，是問題生成的來源。一個 file 替換會清掉舊 chunk 並由 `file-processing` task 重建。
