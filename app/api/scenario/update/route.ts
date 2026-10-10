import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, params } = body;

    switch (action) {
      // 1. Edit Stock
      case 'EDIT_STOCK': {
        const { sku, location, stock } = params;
        await db.inventory.upsert({
          where: { sku_location: { sku, location } },
          create: { sku, location, stock: Number(stock) },
          update: { stock: Number(stock) },
        });
        break;
      }

      // 2. Add Sales Spike
      case 'ADD_SALES_SPIKE': {
        const { sku, location, multiplier = 3, days = 5 } = params;
        const now = new Date();
        const msPerDay = 24 * 60 * 60 * 1000;
        // Inject spike entries for recent days
        for (let i = 1; i <= Number(days); i++) {
          const d = new Date(now.getTime() - i * msPerDay);
          await db.sales.create({
            data: {
              sku,
              location,
              date: d,
              qty_sold: Math.round(10 * Number(multiplier)),
            },
          });
        }
        break;
      }

      // 3. Change Supplier Lead Time or Price
      case 'UPDATE_SUPPLIER': {
        const { supplier, sku, lead_time_days, price } = params;
        await db.supplier.updateMany({
          where: { supplier, sku },
          data: {
            ...(lead_time_days !== undefined ? { lead_time_days: Number(lead_time_days) } : {}),
            ...(price !== undefined ? { price: Number(price) } : {}),
          },
        });
        break;
      }

      // 4. Mark PO Late
      case 'MARK_PO_LATE': {
        const { po, delayDays = 7 } = params;
        const existing = await db.purchaseOrder.findUnique({ where: { po } });
        if (existing) {
          const newExpDate = new Date(Date.now() - Number(delayDays) * 24 * 60 * 60 * 1000);
          await db.purchaseOrder.update({
            where: { po },
            data: { expected_date: newExpDate, status: 'open' },
          });
        }
        break;
      }

      // 5. Presets
      case 'APPLY_PRESET': {
        const { presetId } = params;
        if (presetId === 'preset-gokak-crisis') {
          // Drain Gokak HF-210 to 3 units, raise Shree Hydro lead time to 10 days
          await db.inventory.updateMany({
            where: { sku: 'HF-210', location: 'Gokak' },
            data: { stock: 3 },
          });
          await db.supplier.updateMany({
            where: { supplier: 'Shree Hydro Systems', sku: 'HF-210' },
            data: { lead_time_days: 10 },
          });
        } else if (presetId === 'preset-dharwad-surplus') {
          // Deplete Hubli SK-45 to 1 unit, inflate Dharwad surplus to 90 units
          await db.inventory.updateMany({
            where: { sku: 'SK-45', location: 'Hubli' },
            data: { stock: 1 },
          });
          await db.inventory.updateMany({
            where: { sku: 'SK-45', location: 'Dharwad' },
            data: { stock: 90 },
          });
        } else if (presetId === 'preset-bagalkot-canal') {
          // Surge OR-12 demand at Bagalkot by injecting sales & lowering stock
          await db.inventory.updateMany({
            where: { sku: 'OR-12', location: 'Bagalkot' },
            data: { stock: 10 },
          });
          const now = new Date();
          for (let i = 1; i <= 5; i++) {
            await db.sales.create({
              data: {
                sku: 'OR-12',
                location: 'Bagalkot',
                date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
                qty_sold: 25,
              },
            });
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Log update
    await db.auditLog.create({
      data: {
        action_type: 'SCENARIO_MUTATION',
        actor: 'Scenario Lab Tester',
        details: JSON.stringify({ action, params }),
      },
    });

    return NextResponse.json({ success: true, message: `Scenario mutation '${action}' applied successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
