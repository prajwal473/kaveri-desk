import { NextRequest, NextResponse } from 'next/server';
import { executeAgent } from '@/lib/engine/service';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const asOf = body.asOf ? new Date(body.asOf) : new Date();
    const role = body.role || 'PURCHASING_HEAD';
    const userLocation = body.userLocation || 'Belgaum';

    const result = await executeAgent(asOf, role, userLocation);

    // Record AGENT_RUN in AuditLog
    await db.auditLog.create({
      data: {
        action_type: 'AGENT_RUN',
        actor: role === 'PURCHASING_HEAD' ? 'Ramesh Kulkarni (Purchasing Head)' : `Store Manager (${userLocation})`,
        details: JSON.stringify({
          asOf: asOf.toISOString(),
          issuesIdentified: result.totalIssues,
          top3: result.top3Issues.map((i) => ({ sku: i.sku, loc: i.location, type: i.type })),
          totalAtRiskRs: result.totalAtRiskRs,
          steps: result.steps,
        }),
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Agent run failed:', err);
    return NextResponse.json({ error: err.message || 'Agent run failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const asOfParam = searchParams.get('asOf');
    const role = searchParams.get('role') || 'PURCHASING_HEAD';
    const userLocation = searchParams.get('userLocation') || 'Belgaum';

    const asOf = asOfParam ? new Date(asOfParam) : new Date();
    const result = await executeAgent(asOf, role, userLocation);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Failed to get agent issues:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch issues' }, { status: 500 });
  }
}
