import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LOCATIONS } from '@/lib/engine/config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetTable, csvText } = body;

    if (!csvText || typeof csvText !== 'string') {
      return NextResponse.json({ error: 'csvText string is required' }, { status: 400 });
    }

    if (!['inventory', 'sales'].includes(targetTable)) {
      return NextResponse.json({ error: 'targetTable must be either "inventory" or "sales"' }, { status: 400 });
    }

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 1) {
      return NextResponse.json({ error: 'CSV must contain a header row and at least one data row' }, { status: 400 });
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const validProducts = new Set((await db.product.findMany({ select: { sku: true } })).map((p) => p.sku));
    const validLocations = new Set(LOCATIONS as readonly string[]);

    const errors: Array<{ row: number; line: string; reason: string }> = [];
    let importedCount = 0;

    if (targetTable === 'inventory') {
      const skuIdx = header.indexOf('sku');
      const locIdx = header.indexOf('location');
      const stockIdx = header.indexOf('stock');

      if (skuIdx === -1 || locIdx === -1 || stockIdx === -1) {
        return NextResponse.json({
          error: 'Header must contain columns: sku, location, stock',
        }, { status: 400 });
      }

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const line = lines[i];
        const cols = line.split(',').map((c) => c.trim());

        const sku = cols[skuIdx];
        const location = cols[locIdx];
        const stockStr = cols[stockIdx];

        if (!sku || !location || stockStr === undefined) {
          errors.push({ row: rowNum, line, reason: 'Missing required columns' });
          continue;
        }

        if (!validProducts.has(sku)) {
          errors.push({ row: rowNum, line, reason: `Unknown SKU '${sku}'. Product not registered in catalog.` });
          continue;
        }

        if (!validLocations.has(location)) {
          errors.push({ row: rowNum, line, reason: `Invalid location '${location}'. Must be a registered store or warehouse.` });
          continue;
        }

        const stock = parseInt(stockStr, 10);
        if (isNaN(stock) || stock < 0) {
          errors.push({ row: rowNum, line, reason: `Invalid stock value '${stockStr}'. Must be non-negative integer.` });
          continue;
        }

        // Upsert inventory
        await db.inventory.upsert({
          where: { sku_location: { sku, location } },
          create: { sku, location, stock },
          update: { stock },
        });

        importedCount++;
      }
    } else if (targetTable === 'sales') {
      const skuIdx = header.indexOf('sku');
      const locIdx = header.indexOf('location');
      const dateIdx = header.indexOf('date');
      const qtyIdx = header.indexOf('qty_sold') !== -1 ? header.indexOf('qty_sold') : header.indexOf('qty');

      if (skuIdx === -1 || locIdx === -1 || dateIdx === -1 || qtyIdx === -1) {
        return NextResponse.json({
          error: 'Header must contain columns: date, sku, location, qty_sold',
        }, { status: 400 });
      }

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const line = lines[i];
        const cols = line.split(',').map((c) => c.trim());

        const sku = cols[skuIdx];
        const location = cols[locIdx];
        const dateStr = cols[dateIdx];
        const qtyStr = cols[qtyIdx];

        if (!sku || !location || !dateStr || !qtyStr) {
          errors.push({ row: rowNum, line, reason: 'Missing required columns' });
          continue;
        }

        if (!validProducts.has(sku)) {
          errors.push({ row: rowNum, line, reason: `Unknown SKU '${sku}'` });
          continue;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          errors.push({ row: rowNum, line, reason: `Invalid date '${dateStr}'` });
          continue;
        }

        const qty = parseInt(qtyStr, 10);
        if (isNaN(qty) || qty <= 0) {
          errors.push({ row: rowNum, line, reason: `Invalid qty '${qtyStr}'. Must be positive integer.` });
          continue;
        }

        await db.sales.create({
          data: {
            sku,
            location,
            date,
            qty_sold: qty,
          },
        });

        importedCount++;
      }
    }

    // Log import to AuditLog
    await db.auditLog.create({
      data: {
        action_type: 'DATA_IMPORT',
        actor: 'Data Administrator',
        details: JSON.stringify({
          targetTable,
          totalRows: lines.length - 1,
          importedCount,
          errorCount: errors.length,
          errorsSample: errors.slice(0, 5),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      importedCount,
      errorCount: errors.length,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
