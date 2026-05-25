import { db } from '@/lib/db/index';
import { promoteNewPrimary } from '@/lib/services/embedding/domain/cluster.js';

export async function processClusterMaintenanceTask(_task) {
  const clusters = await db.questionCluster.findMany();

  for (const c of clusters) {
    const members = await db.questions.findMany({
      where: { clusterId: c.id },
      select: { id: true, createAt: true },
    });
    if (members.length === 0) {
      await db.questionCluster.delete({ where: { id: c.id } });
      console.log(`[cluster-maintenance] deleted empty cluster=${c.id}`);
      continue;
    }
    if (members.length === 1) {
      await db.questions.update({
        where: { id: members[0].id },
        data: { clusterId: null, clusterRole: null, similarityScore: null },
      });
      await db.questionCluster.delete({ where: { id: c.id } });
      console.log(`[cluster-maintenance] deleted size-1 cluster=${c.id}`);
      continue;
    }
    const primaryExists = members.find(m => m.id === c.primaryQuestionId);
    if (!primaryExists) {
      const newPrimary = promoteNewPrimary(members);
      await db.questionCluster.update({
        where: { id: c.id },
        data: { primaryQuestionId: newPrimary, version: { increment: 1 } },
      });
      console.log(`[cluster-maintenance] primary-promoted cluster=${c.id} newPrimary=${newPrimary}`);
    }
    if (members.length !== c.size) {
      await db.questionCluster.update({
        where: { id: c.id },
        data: { size: members.length, version: { increment: 1 } },
      });
    }
  }
}
