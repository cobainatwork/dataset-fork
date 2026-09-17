const { promoteNewPrimary, decideClusterUpdateOnMemberRemoval } = require('./domain/cluster');
const { withOptimisticRetry } = require('./errors');

/**
 * Cluster member 離開的 deep module：吸收 vector 清理、cluster size 收斂、
 * primary promotion 與刪除決策。所有 QuestionCluster 寫入走 optimistic lock
 * （version precondition + retry），與 pipeline 同一 lock discipline。
 *
 * 契約：呼叫端在呼叫前已刪除該 question row。removeMember 讀「剩餘 members」
 * 計算 size（authoritative），因此 batch 多題同刪不會重複減一，也自動修正
 * 歷史 size drift。
 *
 * @param {Object} deps
 * @param {import('./ports').IClusterRepository} deps.clusterRepo
 * @param {import('./ports').IQuestionStore} deps.questionStore
 * @param {import('./ports').IVectorStore} deps.vectorStore
 */
function createClusterManager({ clusterRepo, questionStore, vectorStore }) {
  /**
   * 收斂一個 member 離開後的 cluster。
   * @param {string} questionId 已刪除的 question id（用於清 vector）
   * @param {string|null} clusterId 該 question 原屬 cluster（無則只清 vector）
   */
  async function removeMember({ questionId, clusterId }) {
    // 永遠先刪 vector，避免 orphan 向量
    await vectorStore.deletePoints('question', [questionId]);
    if (!clusterId) return;

    await withOptimisticRetry(async () => {
      const cluster = await clusterRepo.findById(clusterId);
      if (!cluster) return; // 已被其他路徑刪

      // row 已刪 → remaining 即真實剩餘集
      const remaining = await questionStore.findClusterMembers(clusterId);
      // remaining 已不含被刪者，故以 remaining+1 視為「離開前 size」
      const { shouldDelete, newSize } = decideClusterUpdateOnMemberRemoval({
        size: remaining.length + 1,
      });

      if (shouldDelete) {
        await clusterRepo.delete(clusterId, cluster.version);
        return;
      }

      // size-1 cluster（primary 獨自存活）刻意保留：與 domain 決策
      // decideClusterUpdateOnMemberRemoval 一致，且 cluster 列表預設
      // minSize=2 不會顯示，無 UI 成本。
      const primaryStillMember = remaining.some(m => m.id === cluster.primaryQuestionId);
      const newPrimary = primaryStillMember ? cluster.primaryQuestionId : promoteNewPrimary(remaining);
      await clusterRepo.update(clusterId, {
        size: newSize,
        ...(newPrimary !== cluster.primaryQuestionId ? { primaryQuestionId: newPrimary } : {}),
        version: cluster.version,
      });
    });
  }

  return { removeMember };
}

module.exports = { createClusterManager };
