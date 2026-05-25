import { NextResponse } from 'next/server';
import { getDashboardStats, getRecentErrors, getLatencyPercentiles } from '@/lib/services/embedding/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [stats, errors, latencies] = await Promise.all([
    getDashboardStats(),
    getRecentErrors(50),
    getLatencyPercentiles(),
  ]);
  return NextResponse.json({ stats, errors, latencies });
}
