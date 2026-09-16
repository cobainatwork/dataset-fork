import { NextResponse } from 'next/server';
import { listClusters } from '@/lib/db/clusters';
import { getProjectsMeta } from '@/lib/db/projects';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') || undefined;
  const onlyDivergent = url.searchParams.get('onlyDivergent') === 'true';
  const minSize = parseInt(url.searchParams.get('minSize') || '2', 10);

  const clusters = await listClusters({ projectId, onlyDivergent, minSize });

  // ClusterProject.projectId 是純字串、沒 relation 到 Projects → 另查名稱對照
  const projectIds = [...new Set(clusters.flatMap(c => c.ClusterProject.map(cp => cp.projectId)))];
  const projects = projectIds.length
    ? await getProjectsMeta(projectIds)
    : [];
  const nameById = Object.fromEntries(projects.map(p => [p.id, p.name]));

  const enriched = clusters.map(c => ({
    ...c,
    projectNames: c.ClusterProject.map(cp => ({
      id: cp.projectId,
      name: nameById[cp.projectId] || cp.projectId,
    })),
  }));

  return NextResponse.json({ clusters: enriched });
}
