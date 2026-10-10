import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = performance.now();
  let dbHealthy = false;
  let dbError: string | null = null;

  try {
    // Quick probe query to confirm DB connectivity
    await db.systemConfig.findFirst();
    dbHealthy = true;
  } catch (err: any) {
    dbError = err.message || 'Database connection error';
  }

  const latencyMs = Math.round(performance.now() - start);

  return NextResponse.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbHealthy,
      latency_ms: latencyMs,
      error: dbError,
    },
    uptime: process.uptime(),
    node_version: process.version,
  }, {
    status: dbHealthy ? 200 : 503,
  });
}
