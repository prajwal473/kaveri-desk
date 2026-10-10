import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const table = params.table;
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('q') || '';
    const location = searchParams.get('location');
    const limit = Number(searchParams.get('limit') || 100);

    let data: any[] = [];

    switch (table) {
      case 'products': {
        data = await db.product.findMany({
          where: search
            ? {
                OR: [
                  { sku: { contains: search } },
                  { name: { contains: search } },
                  { category: { contains: search } },
                  { machine_model: { contains: search } },
                ],
              }
            : {},
          take: limit,
          orderBy: { sku: 'asc' },
        });
        break;
      }

      case 'inventory': {
        const where: any = {};
        if (location) where.location = location;
        if (search) {
          where.OR = [
            { sku: { contains: search } },
            { location: { contains: search } },
          ];
        }
        data = await db.inventory.findMany({
          where,
          include: { product: true },
          take: limit,
          orderBy: [{ sku: 'asc' }, { location: 'asc' }],
        });
        break;
      }

      case 'sales': {
        const where: any = {};
        if (location) where.location = location;
        if (search) {
          where.sku = { contains: search };
        }
        data = await db.sales.findMany({
          where,
          take: limit,
          orderBy: { date: 'desc' },
        });
        break;
      }

      case 'suppliers': {
        data = await db.supplier.findMany({
          where: search
            ? {
                OR: [
                  { supplier: { contains: search } },
                  { sku: { contains: search } },
                ],
              }
            : {},
          include: { product: true },
          take: limit,
          orderBy: [{ sku: 'asc' }, { price: 'asc' }],
        });
        break;
      }

      case 'purchase-orders': {
        data = await db.purchaseOrder.findMany({
          where: search
            ? {
                OR: [
                  { po: { contains: search } },
                  { supplier: { contains: search } },
                  { sku: { contains: search } },
                ],
              }
            : {},
          include: { product: true },
          take: limit,
          orderBy: { expected_date: 'desc' },
        });
        break;
      }

      case 'store-messages': {
        data = await db.storeMessage.findMany({
          take: limit,
          orderBy: { date: 'desc' },
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 });
    }

    return NextResponse.json({ table, count: data.length, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
