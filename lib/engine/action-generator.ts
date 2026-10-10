import { EvaluatedOption, DraftedAction, ActionType } from './types';
import { DetectedRawIssue } from './detectors';

/**
 * Converts a chosen option and its parent issue into fully specified DraftedAction objects
 * with complete payloads ready for human review and 1-click execution.
 */
export function generateDraftedActions(
  issue: DetectedRawIssue,
  chosenOption: EvaluatedOption,
  asOf: Date = new Date()
): DraftedAction[] {
  const actions: DraftedAction[] = [];
  const asOfTime = asOf.getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  switch (chosenOption.type) {
    case 'PO_FAST':
    case 'PO_STANDARD': {
      const leadDays = chosenOption.lead_time_days || 3;
      const expectedDate = new Date(asOfTime + leadDays * msPerDay).toISOString();
      const qty = chosenOption.order_qty || 20;
      const unitPrice = chosenOption.unit_price || 400;
      const totalCost = qty * unitPrice;

      actions.push({
        type: 'PO_DRAFT',
        sku: issue.sku,
        sku_name: issue.sku_name,
        location: issue.location,
        title: `Draft PO to ${chosenOption.supplier}: ${qty} units of ${issue.sku}`,
        reason: `Replenish urgent deficit before stockout. ${chosenOption.extra_cost_flag ? `Note: ${chosenOption.extra_cost_flag}` : 'Economy standard supplier.'}`,
        priority: 1,
        status: 'pending',
        payload: {
          action: 'PURCHASE_ORDER',
          po_number: `PO-KAV-${Math.floor(1000 + Math.random() * 9000)}`,
          supplier: chosenOption.supplier,
          sku: issue.sku,
          sku_name: issue.sku_name,
          receiving_location: issue.location,
          qty,
          unit_price: unitPrice,
          total_cost: totalCost,
          lead_time_days: leadDays,
          expected_date: expectedDate,
          extra_cost_flag: chosenOption.extra_cost_flag,
          premium_vs_cheapest: chosenOption.premium_vs_cheapest,
        },
      });
      break;
    }

    case 'TRANSFER': {
      const qty = chosenOption.transfer_qty || 10;
      const expectedArrival = new Date(asOfTime + 1 * msPerDay).toISOString();

      actions.push({
        type: 'TRANSFER',
        sku: issue.sku,
        sku_name: issue.sku_name,
        location: issue.location,
        title: `Stock Transfer: ${qty} units from ${chosenOption.donor_location} to ${issue.location}`,
        reason: `Fastest and cheapest relief leveraging regional network surplus. Delivery in 24 hours.`,
        priority: 1,
        status: 'pending',
        payload: {
          action: 'STOCK_TRANSFER',
          transfer_id: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
          from_location: chosenOption.donor_location,
          to_location: issue.location,
          sku: issue.sku,
          sku_name: issue.sku_name,
          qty,
          transit_days: 1,
          expected_arrival: expectedArrival,
          transfer_cost_rs: chosenOption.transfer_cost,
        },
      });
      break;
    }

    case 'COMBO': {
      // 1. Transfer portion
      const transferQty = chosenOption.transfer_qty || 10;
      const transferArrival = new Date(asOfTime + 1 * msPerDay).toISOString();
      actions.push({
        type: 'TRANSFER',
        sku: issue.sku,
        sku_name: issue.sku_name,
        location: issue.location,
        title: `Bridge Transfer: ${transferQty} units from ${chosenOption.donor_location}`,
        reason: `Immediate bridge supply to cover consumption during supplier replenishment lead time.`,
        priority: 1,
        status: 'pending',
        payload: {
          action: 'STOCK_TRANSFER',
          transfer_id: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
          from_location: chosenOption.donor_location,
          to_location: issue.location,
          sku: issue.sku,
          sku_name: issue.sku_name,
          qty: transferQty,
          transit_days: 1,
          expected_arrival: transferArrival,
          transfer_cost_rs: chosenOption.transfer_cost,
        },
      });

      // 2. Standard PO portion
      const leadDays = chosenOption.lead_time_days || 7;
      const expectedDate = new Date(asOfTime + leadDays * msPerDay).toISOString();
      const orderQty = chosenOption.order_qty || 30;
      const unitPrice = chosenOption.unit_price || 400;

      actions.push({
        type: 'PO_DRAFT',
        sku: issue.sku,
        sku_name: issue.sku_name,
        location: issue.location,
        title: `Economy Replenishment PO: ${orderQty} units to ${chosenOption.supplier}`,
        reason: `Standard economic batch order arriving after bridge transfer exhausts.`,
        priority: 2,
        status: 'pending',
        payload: {
          action: 'PURCHASE_ORDER',
          po_number: `PO-KAV-${Math.floor(1000 + Math.random() * 9000)}`,
          supplier: chosenOption.supplier,
          sku: issue.sku,
          sku_name: issue.sku_name,
          receiving_location: issue.location,
          qty: orderQty,
          unit_price: unitPrice,
          total_cost: orderQty * unitPrice,
          lead_time_days: leadDays,
          expected_date: expectedDate,
        },
      });
      break;
    }

    case 'WAIT':
    default: {
      if (issue.type === 'OVERDUE_PO') {
        actions.push({
          type: 'SUPPLIER_ENQUIRY',
          sku: issue.sku,
          sku_name: issue.sku_name,
          location: issue.location,
          title: `Overdue PO Escalation Notice: ${issue.evidence.overdue_po_id}`,
          reason: `PO is ${issue.evidence.overdue_days} days overdue. Critical stockout imminent within ${issue.evidence.days_of_cover} days.`,
          priority: 1,
          status: 'pending',
          payload: {
            action: 'SUPPLIER_ENQUIRY',
            po_id: issue.evidence.overdue_po_id,
            sku: issue.sku,
            location: issue.location,
            overdue_days: issue.evidence.overdue_days,
            message: `URGENT: PO ${issue.evidence.overdue_po_id} is ${issue.evidence.overdue_days} days overdue. Belgaum/Hubli branch will run out of stock in ${issue.evidence.days_of_cover} days. Requesting immediate dispatch tracking or priority air courier.`,
          },
        });
      } else if (issue.type === 'SLOW_MOVING') {
        actions.push({
          type: 'ALERT',
          sku: issue.sku,
          sku_name: issue.sku_name,
          location: issue.location,
          title: `Freeze Reordering & Initiate Stock Redistribution: ${issue.sku}`,
          reason: `₹${issue.evidence.cash_tied_up_rs?.toLocaleString('en-IN')} locked with ${issue.evidence.days_of_cover} days of cover.`,
          priority: 3,
          status: 'pending',
          payload: {
            action: 'CLEARANCE_ALERT',
            sku: issue.sku,
            location: issue.location,
            cash_tied_up: issue.evidence.cash_tied_up_rs,
            recommendation: 'Halt all open reorders. Offer 15% discount bundle to local fleet operators or transfer to Hubli Central WH.',
          },
        });
      } else {
        actions.push({
          type: 'ALERT',
          sku: issue.sku,
          sku_name: issue.sku_name,
          location: issue.location,
          title: `Monitoring Alert: ${issue.sku} at ${issue.location}`,
          reason: `Agent confirmed stock position or anomaly. No capital deployment needed.`,
          priority: 3,
          status: 'pending',
          payload: {
            action: 'MONITOR_ALERT',
            sku: issue.sku,
            location: issue.location,
            note: 'Status logged in system.',
          },
        });
      }
      break;
    }
  }

  return actions;
}
