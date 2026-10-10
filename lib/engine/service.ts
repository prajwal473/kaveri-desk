import { db } from '@/lib/db';
import { runAgentLoop, AgentRunResult, DEFAULT_CONFIG, EngineConfig } from './index';

export async function executeAgent(asOfDate?: Date, role?: string, userLocation?: string): Promise<AgentRunResult> {
  const asOf = asOfDate || new Date();

  // Load configs
  const configRows = await db.systemConfig.findMany();
  const config: EngineConfig = { ...DEFAULT_CONFIG };
  for (const row of configRows) {
    if (row.key === 'transfer_cost_per_unit') config.transfer_cost_per_unit = Number(row.value);
    if (row.key === 'transfer_days') config.transfer_days = Number(row.value);
    if (row.key === 'target_cover_days') config.target_cover_days = Number(row.value);
    if (row.key === 'safety_days') config.safety_days = Number(row.value);
    if (row.key === 'holding_cost_pct_per_month') config.holding_cost_pct_per_month = Number(row.value);
    if (row.key === 'gross_margin_pct') {
      try {
        config.gross_margin_pct = JSON.parse(row.value);
      } catch {}
    }
  }

  // Fetch DB records
  const [products, inventory, sales, suppliers, purchaseOrders, storeMessages, rejectedDbActions] = await Promise.all([
    db.product.findMany(),
    db.inventory.findMany(),
    db.sales.findMany({
      where: {
        date: {
          gte: new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000),
          lte: asOf,
        },
      },
    }),
    db.supplier.findMany(),
    db.purchaseOrder.findMany(),
    db.storeMessage.findMany({
      orderBy: { date: 'desc' },
      take: 20,
    }),
    db.action.findMany({
      where: { status: 'rejected' },
    }),
  ]);

  const rejectedActions = rejectedDbActions.map((r) => {
    let payloadObj: any = {};
    try {
      payloadObj = JSON.parse(r.payload);
    } catch {}
    return {
      sku: r.sku,
      location: r.location,
      type: r.type,
      supplier: payloadObj.supplier,
      reason: r.reason,
    };
  });

  // Execute engine loop
  const result = runAgentLoop({
    products,
    inventory,
    sales,
    suppliers,
    purchaseOrders,
    storeMessages,
    asOf,
    config,
    rejectedActions,
  });

  // Filter if role is Store Manager
  if (role === 'STORE_MANAGER' && userLocation) {
    result.allIssues = result.allIssues.filter((i) => i.location === userLocation);
    result.top3Issues = result.allIssues.slice(0, 3);
    result.top3Issues.forEach((i) => (i.is_top_3 = true));
    result.totalIssues = result.allIssues.length;
    result.totalAtRiskRs = result.allIssues.reduce(
      (sum, i) => sum + (i.evidence.revenue_at_risk_rs || i.evidence.cash_tied_up_rs || 0),
      0
    );
  }

  // Ensure all drafted actions exist in db.action and have action IDs assigned
  for (const drafted of result.draftedActions) {
    const existing = await db.action.findFirst({
      where: {
        sku: drafted.sku,
        location: drafted.location,
        type: drafted.type,
        status: 'pending',
      },
    });

    if (existing) {
      drafted.id = existing.id;
    } else {
      const created = await db.action.create({
        data: {
          type: drafted.type,
          sku: drafted.sku,
          location: drafted.location,
          payload: JSON.stringify(drafted.payload),
          status: 'pending',
          reason: drafted.reason,
          priority: drafted.priority,
        },
      });
      drafted.id = created.id;
    }
  }

  // Ensure every issue's drafted_actions array elements have valid id
  for (const issue of result.allIssues) {
    for (const drafted of issue.drafted_actions) {
      if (!drafted.id) {
        const matching = result.draftedActions.find(
          (d) => d.sku === drafted.sku && d.location === drafted.location && d.type === drafted.type && d.id
        );
        if (matching) {
          drafted.id = matching.id;
        }
      }
    }
  }

  return result;
}
