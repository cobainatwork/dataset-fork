import { NextResponse } from 'next/server';
import { getRecentClusterFeedback } from '@/lib/db/clusters';
import { bucketize, suggestThreshold } from '@/lib/services/embedding/domain/feedback';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fbs = await getRecentClusterFeedback(5000);
  const buckets = bucketize(fbs, 0.05);
  const suggestion = suggestThreshold(fbs, { targetPrecision: 0.95, bin: 0.05 });
  return NextResponse.json({ buckets, suggestion, totalFeedback: fbs.length });
}
