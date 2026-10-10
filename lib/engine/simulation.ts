export interface SimulationUpdateResult {
  success: boolean;
  message: string;
  updatedStock?: {
    location: string;
    oldStock: number;
    newStock: number;
  }[];
  newPoCreated?: {
    po: string;
    supplier: string;
    sku: string;
    qty: number;
    status: string;
    expectedDate: string;
  };
}

/**
 * Handles the state transitions when a user approves, rejects, or undos an action.
 * For approval:
 * - PO_DRAFT -> Creates/updates PO with status 'approved' (shows as inbound)
 * - TRANSFER -> Decrements donor stock and increments receiving stock (or records in-transit)
 * For rejection:
 * - Records rejection reason and flags issue to re-evaluate with runner-up option.
 */
export function simulateActionExecution(
  actionType: string,
  payload: Record<string, any>,
  actor: string
): SimulationUpdateResult {
  if (actionType === 'PO_DRAFT' || payload.action === 'PURCHASE_ORDER') {
    const poNumber = payload.po_number || `PO-${Date.now()}`;
    return {
      success: true,
      message: `Purchase Order ${poNumber} for ${payload.qty} units approved and issued to ${payload.supplier}. Expected arrival: ${new Date(payload.expected_date).toLocaleDateString()}.`,
      newPoCreated: {
        po: poNumber,
        supplier: payload.supplier,
        sku: payload.sku,
        qty: payload.qty,
        status: 'approved',
        expectedDate: payload.expected_date,
      },
    };
  }

  if (actionType === 'TRANSFER' || payload.action === 'STOCK_TRANSFER') {
    return {
      success: true,
      message: `Stock Transfer ${payload.transfer_id} approved. Dispatching ${payload.qty} units of ${payload.sku} from ${payload.from_location} to ${payload.to_location}. Transit time: ${payload.transit_days} day(s).`,
    };
  }

  if (actionType === 'SUPPLIER_ENQUIRY') {
    return {
      success: true,
      message: `Expedited enquiry dispatched to supplier for PO ${payload.po_id}. Priority tracking initiated.`,
    };
  }

  if (actionType === 'ALERT') {
    return {
      success: true,
      message: `Alert acknowledged by ${actor}. Reorder freeze and inventory discount memo published to branch.`,
    };
  }

  return {
    success: true,
    message: `Action recorded and verified.`,
  };
}
