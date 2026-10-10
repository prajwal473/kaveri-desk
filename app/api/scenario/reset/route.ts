import { NextResponse } from 'next/server';
import { seedDatabase } from '@/prisma/seed';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await seedDatabase(new Date());

    await db.auditLog.create({
      data: {
        action_type: 'SCENARIO_RESET',
        actor: 'Ramesh Kulkarni (Purchasing Head)',
        details: JSON.stringify({ message: 'Demo data completely reset to standard 60-SKU baseline.' }),
      },
    });

    return NextResponse.json({ success: true, message: 'Demo data successfully reset to baseline.' });
  } catch (err: any) {
    console.error('Scenario reset failed:', err);
    return NextResponse.json({ error: err.message || 'Reset failed' }, { status: 500 });
  }
}
