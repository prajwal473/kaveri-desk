import { NextRequest, NextResponse } from 'next/server';
import { executeAgent } from '@/lib/engine/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const asOfParam = searchParams.get('asOf');
    const role = searchParams.get('role') || 'PURCHASING_HEAD';
    const userLocation = searchParams.get('userLocation') || 'Belgaum';
    const id = searchParams.get('id');

    const asOf = asOfParam ? new Date(asOfParam) : new Date();
    const result = await executeAgent(asOf, role, userLocation);

    if (id) {
      const issue = result.allIssues.find((i) => i.id === id);
      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      return NextResponse.json(issue);
    }

    return NextResponse.json(result.allIssues);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
