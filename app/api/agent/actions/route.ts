import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { simulateActionExecution } from '@/lib/engine/simulation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const actions = await db.action.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json(actions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actionId,
      decision,
      reason,
      actor = 'Ramesh Kulkarni (Purchasing Head)',
      sku,
      location,
      type,
      payload: rawPayload,
    } = body;

    // Undo case
    if (decision === 'undo') {
      const lastDecidedAction = actionId
        ? await db.action.findUnique({ where: { id: actionId } })
        : await db.action.findFirst({
            where: { status: { in: ['approved', 'rejected'] } },
            orderBy: { decided_at: 'desc' },
          });

      if (!lastDecidedAction) {
        return NextResponse.json({ error: 'No recent action found to undo' }, { status: 404 });
      }

      // If it was approved, reverse simulated state changes
      let undoPayload: any = {};
      try {
        undoPayload = JSON.parse(lastDecidedAction.payload);
      } catch {}

      if (lastDecidedAction.status === 'approved') {
        if (
          (lastDecidedAction.type === 'TRANSFER' || undoPayload.action === 'STOCK_TRANSFER') &&
          undoPayload.from_location &&
          undoPayload.to_location
        ) {
          const qty = Math.round(Number(undoPayload.qty) || 10);
          // Reverse: put stock back in donor, remove from receiver
          await db.inventory.updateMany({
            where: { sku: lastDecidedAction.sku, location: undoPayload.from_location },
            data: { stock: { increment: qty } },
          });
          await db.inventory.updateMany({
            where: { sku: lastDecidedAction.sku, location: undoPayload.to_location },
            data: { stock: { decrement: qty } },
          });
        }

        if (
          (lastDecidedAction.type === 'PO_DRAFT' || undoPayload.action === 'PURCHASE_ORDER') &&
          undoPayload.po_number
        ) {
          await db.purchaseOrder.deleteMany({
            where: { po: undoPayload.po_number },
          });
        }
      }

      // Revert action status to pending
      const reverted = await db.action.update({
        where: { id: lastDecidedAction.id },
        data: {
          status: 'pending',
          reason: null,
          decided_at: null,
        },
      });

      // Record in AuditLog
      await db.auditLog.create({
        data: {
          action_type: 'ACTION_UNDONE',
          actor,
          details: JSON.stringify({
            actionId: lastDecidedAction.id,
            previousStatus: lastDecidedAction.status,
            type: lastDecidedAction.type,
            sku: lastDecidedAction.sku,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Action ${lastDecidedAction.id} was successfully undone. Reverted to pending.`,
        action: reverted,
      });
    }

    // Approve or Reject
    if (!['approve', 'reject'].includes(decision)) {
      return NextResponse.json(
        { error: 'Valid decision (approve/reject/undo) required' },
        { status: 400 }
      );
    }

    // Lookup action record: by id, or by sku + location fallback
    let actionRecord: any = null;
    if (actionId) {
      actionRecord = await db.action.findUnique({ where: { id: actionId } });
    }

    if (!actionRecord && sku && location) {
      actionRecord = await db.action.findFirst({
        where: {
          sku,
          location,
          status: 'pending',
        },
      });
    }

    if (!actionRecord && sku) {
      actionRecord = await db.action.findFirst({
        where: { sku, status: 'pending' },
      });
    }

    // If still not found, create a record so human approval/rejection never drops
    if (!actionRecord) {
      actionRecord = await db.action.create({
        data: {
          type: type || 'PO_DRAFT',
          sku: sku || 'GENERAL',
          location: location || 'Belgaum',
          payload: JSON.stringify(rawPayload || {}),
          status: 'pending',
          reason: reason || null,
        },
      });
    }

    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(actionRecord.payload);
    } catch {}

    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    const updated = await db.action.update({
      where: { id: actionRecord.id },
      data: {
        status: newStatus,
        reason: reason || (decision === 'approve' ? 'Approved by user' : 'Rejected by user'),
        decided_at: new Date(),
      },
    });

    // If approved, run simulated state update
    let simulationResult: any = null;
    if (decision === 'approve') {
      simulationResult = simulateActionExecution(actionRecord.type, payload, actor);

      // If PO draft was approved, create or update PO record in db
      if (actionRecord.type === 'PO_DRAFT' || payload.action === 'PURCHASE_ORDER') {
        const poNum = payload.po_number || `PO-${Date.now()}`;
        const qty = Math.round(Number(payload.qty) || 20);
        await db.purchaseOrder.upsert({
          where: { po: poNum },
          create: {
            po: poNum,
            supplier: payload.supplier || 'Standard Supplier',
            sku: actionRecord.sku,
            qty,
            expected_date: payload.expected_date ? new Date(payload.expected_date) : new Date(Date.now() + 3 * 86400000),
            status: 'approved',
          },
          update: {
            status: 'approved',
          },
        });
      }

      // If stock transfer was approved, decrement donor stock and increment receiving stock
      if (
        (actionRecord.type === 'TRANSFER' || payload.action === 'STOCK_TRANSFER') &&
        payload.from_location &&
        payload.to_location
      ) {
        const qty = Math.round(Number(payload.qty) || 10);
        // Decrement donor stock
        await db.inventory.updateMany({
          where: { sku: actionRecord.sku, location: payload.from_location },
          data: { stock: { decrement: qty } },
        });

        // Increment receiver stock (or simulate in-transit)
        await db.inventory.updateMany({
          where: { sku: actionRecord.sku, location: payload.to_location },
          data: { stock: { increment: qty } },
        });
      }
    }

    // Record decision in AuditLog
    await db.auditLog.create({
      data: {
        action_type: decision === 'approve' ? 'ACTION_APPROVED' : 'ACTION_REJECTED',
        actor,
        details: JSON.stringify({
          actionId: actionRecord.id,
          type: actionRecord.type,
          sku: actionRecord.sku,
          location: actionRecord.location,
          payload,
          decision,
          reason,
          simulationResult,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      action: updated,
      simulationResult,
      message:
        decision === 'approve'
          ? `Action approved successfully. ${simulationResult?.message || ''}`
          : `Action rejected. Reason recorded.`,
    });
  } catch (err: any) {
    console.error('Action decision error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
