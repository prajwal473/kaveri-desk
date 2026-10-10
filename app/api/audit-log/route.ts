import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const actionType = searchParams.get('type');
    const limit = Number(searchParams.get('limit') || 50);

    const where: any = {};
    if (actionType) where.action_type = actionType;

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
