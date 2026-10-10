import { db } from '@/lib/db';
import { executeAgent } from '@/lib/engine/service';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any) => Promise<any>;
}

export const AGENT_TOOLS: Record<string, ToolDefinition> = {
  get_attention_list: {
    name: 'get_attention_list',
    description: 'Returns the prioritized list of supply-chain issues needing attention today across North Karnataka branches.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
    execute: async () => {
      const result = await executeAgent();
      return {
        totalIssues: result.totalIssues,
        totalAtRiskRs: result.totalAtRiskRs,
        top3Issues: result.top3Issues.map((i) => ({
          id: i.id,
          sku: i.sku,
          sku_name: i.sku_name,
          location: i.location,
          type: i.type,
          severity: i.severity,
          title: i.title,
          daysOfCover: i.evidence.days_of_cover,
          recommendedAction: i.chosen_option.name,
          cost: i.chosen_option.total_expected_cost,
        })),
        allIssuesSummary: result.allIssues.map((i) => ({
          id: i.id,
          sku: i.sku,
          location: i.location,
          type: i.type,
          priority_score: i.priority_score,
        })),
      };
    },
  },

  get_issue_detail: {
    name: 'get_issue_detail',
    description: 'Returns deep evidence, financial breakdown, and options evaluation for a specific issue ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'The issue ID, e.g. issue-hf-210-gokak-stockout-risk' },
      },
      required: ['id'],
    },
    execute: async ({ id }: { id: string }) => {
      const result = await executeAgent();
      const issue = result.allIssues.find((i) => i.id.toLowerCase() === id.toLowerCase() || i.sku.toLowerCase() === id.toLowerCase());
      if (!issue) return { error: `Issue '${id}' not found in current run.` };

      return {
        id: issue.id,
        sku: issue.sku,
        sku_name: issue.sku_name,
        location: issue.location,
        type: issue.type,
        severity: issue.severity,
        evidence: issue.evidence,
        chosen_option: issue.chosen_option,
        runner_up_option: issue.runner_up_option,
        runner_up_reason: issue.runner_up_reason,
        options_comparison: issue.options.map((o) => ({
          name: o.name,
          type: o.type,
          gap_days: o.gap_days,
          lost_margin_rs: o.lost_margin_rs,
          purchase_cost: o.purchase_cost,
          transfer_cost: o.transfer_cost,
          total_expected_cost: o.total_expected_cost,
          feasible: o.feasible,
        })),
      };
    },
  },

  compare_options: {
    name: 'compare_options',
    description: 'Compares all available operational options (Transfer vs Express PO vs Economy PO vs Combo vs Wait) for a specific SKU and branch.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sku: { type: 'STRING', description: 'Product SKU, e.g. HF-210 or SK-45' },
        location: { type: 'STRING', description: 'Store location, e.g. Gokak or Hubli' },
      },
      required: ['sku', 'location'],
    },
    execute: async ({ sku, location }: { sku: string; location: string }) => {
      const result = await executeAgent();
      const issue = result.allIssues.find(
        (i) => i.sku.toLowerCase() === sku.toLowerCase() && i.location.toLowerCase() === location.toLowerCase()
      );
      if (!issue) {
        return {
          message: `No active issue flagged for ${sku} at ${location}. Inventory position is stable.`,
        };
      }

      return {
        sku,
        location,
        currentStock: issue.evidence.stock,
        dailyRate: issue.evidence.daily_demand_rate,
        daysOfCover: issue.evidence.days_of_cover,
        chosenOption: issue.chosen_option.name,
        runnerUpOption: issue.runner_up_option?.name,
        runnerUpReason: issue.runner_up_reason,
        options: issue.options.map((o) => ({
          type: o.type,
          name: o.name,
          unitsCovered: o.units_covered,
          gapDays: o.gap_days,
          lostMarginRs: o.lost_margin_rs,
          totalCostRs: o.total_expected_cost,
          feasible: o.feasible,
          infeasibleReason: o.infeasible_reason,
        })),
      };
    },
  },

  get_stock: {
    name: 'get_stock',
    description: 'Returns the exact real-time inventory count for a SKU across all 6 regional stores and 2 warehouses.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sku: { type: 'STRING', description: 'Product SKU, e.g. HF-210, SK-45, AF-300' },
      },
      required: ['sku'],
    },
    execute: async ({ sku }: { sku: string }) => {
      const inventory = await db.inventory.findMany({
        where: { sku },
        include: { product: true },
      });

      if (inventory.length === 0) {
        return { error: `SKU '${sku}' not found in inventory catalog.` };
      }

      const totalStock = inventory.reduce((sum, item) => sum + item.stock, 0);

      return {
        sku,
        name: inventory[0].product.name,
        category: inventory[0].product.category,
        totalNetworkStock: totalStock,
        byLocation: inventory.map((i) => ({
          location: i.location,
          stock: i.stock,
        })),
      };
    },
  },

  get_supplier_options: {
    name: 'get_supplier_options',
    description: 'Returns all contracted suppliers for a SKU with unit price, lead time in days, and minimum order quantity (MOQ).',
    parameters: {
      type: 'OBJECT',
      properties: {
        sku: { type: 'STRING', description: 'Product SKU, e.g. HF-210, CV-99' },
      },
      required: ['sku'],
    },
    execute: async ({ sku }: { sku: string }) => {
      const suppliers = await db.supplier.findMany({
        where: { sku },
        orderBy: { price: 'asc' },
      });

      if (suppliers.length === 0) {
        return { error: `No supplier contracts found for SKU '${sku}'.` };
      }

      return {
        sku,
        contractCount: suppliers.length,
        suppliers: suppliers.map((s) => ({
          supplier: s.supplier,
          pricePerUnit: s.price,
          leadTimeDays: s.lead_time_days,
          moq: s.moq,
        })),
      };
    },
  },

  simulate_whatif: {
    name: 'simulate_whatif',
    description: 'Performs on-the-fly supply chain simulation (e.g. changing supplier lead time, simulating a demand surge, or altering stock) without persisting changes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sku: { type: 'STRING', description: 'SKU being simulated' },
        location: { type: 'STRING', description: 'Branch location' },
        simulatedLeadTimeDays: { type: 'NUMBER', description: 'Alternative supplier lead time in days' },
        simulatedDailyDemand: { type: 'NUMBER', description: 'Alternative daily consumption rate' },
        simulatedStock: { type: 'NUMBER', description: 'Alternative on-hand stock' },
      },
      required: ['sku', 'location'],
    },
    execute: async (args: any) => {
      const { sku, location, simulatedLeadTimeDays, simulatedDailyDemand, simulatedStock } = args;
      const inv = await db.inventory.findFirst({ where: { sku, location } });
      const suppliers = await db.supplier.findMany({ where: { sku } });

      const stock = simulatedStock !== undefined ? Number(simulatedStock) : inv?.stock || 10;
      const rate = simulatedDailyDemand !== undefined ? Number(simulatedDailyDemand) : 2.0;
      const daysOfCover = rate > 0 ? Number((stock / rate).toFixed(1)) : 999;

      const supplierComparison = suppliers.map((s) => {
        const lead = simulatedLeadTimeDays !== undefined && s.lead_time_days > 4 ? Number(simulatedLeadTimeDays) : s.lead_time_days;
        const gapDays = Math.max(0, lead - daysOfCover);
        const lostUnits = gapDays * rate;
        return {
          supplier: s.supplier,
          leadTimeDays: lead,
          gapDays,
          lostUnits,
          stockoutRisk: gapDays > 0,
        };
      });

      return {
        sku,
        location,
        simulatedStock: stock,
        simulatedRate: rate,
        newDaysOfCover: daysOfCover,
        supplierComparison,
        analysis:
          daysOfCover < 3
            ? `Critical: Under these conditions, branch runs out in ${daysOfCover} days before standard replenishment arrives.`
            : `Safe: Inventory maintains ${daysOfCover} days of cover.`,
      };
    },
  },

  propose_action: {
    name: 'propose_action',
    description: 'Generates or stages a formal draft action (PO or Stock Transfer) for user approval.',
    parameters: {
      type: 'OBJECT',
      properties: {
        issueId: { type: 'STRING', description: 'Issue ID to draft action for' },
      },
      required: ['issueId'],
    },
    execute: async ({ issueId }: { issueId: string }) => {
      const result = await executeAgent();
      const issue = result.allIssues.find((i) => i.id.toLowerCase() === issueId.toLowerCase() || i.sku.toLowerCase() === issueId.toLowerCase());
      if (!issue) return { error: `Issue '${issueId}' not found.` };

      return {
        success: true,
        stagedActions: issue.drafted_actions.map((a) => ({
          type: a.type,
          title: a.title,
          reason: a.reason,
          payload: a.payload,
          status: 'pending_review',
        })),
        message: `Action staged for Ramesh Kulkarni in Approval Queue.`,
      };
    },
  },
};
