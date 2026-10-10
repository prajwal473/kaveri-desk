export type IssueType =
  | 'STOCKOUT_RISK'
  | 'SLOW_MOVING'
  | 'OVERDUE_PO'
  | 'SUPPLIER_MISMATCH'
  | 'DEMAND_ANOMALY'
  | 'OVERSTOCK_IMBALANCE';

export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

export type OptionType =
  | 'TRANSFER'
  | 'PO_STANDARD'
  | 'PO_FAST'
  | 'COMBO'
  | 'WAIT';

export type ActionType =
  | 'PO_DRAFT'
  | 'TRANSFER'
  | 'SUPPLIER_ENQUIRY'
  | 'ALERT';

export interface DemandRate {
  sku: string;
  location: string;
  rate7: number;
  rate28: number;
  blendedRate: number; // 0.6 * rate7 + 0.4 * rate28
  spikeRatio: number;  // rate7 / rate28
  anomaly: 'SPIKE' | 'DROP' | 'NORMAL';
  totalSold7: number;
  totalSold28: number;
}

export interface NetworkSurplus {
  location: string;
  stock: number;
  blendedRate: number;
  targetStock: number; // rate * target_cover_days
  safetyStock: number; // rate * safety_days
  surplus: number;     // stock - targetStock (only positive can donate)
  maxDonation: number; // stock - safetyStock
  canDonate: boolean;
}

export interface EvaluatedOption {
  id: string;
  type: OptionType;
  name: string;
  description: string;
  units_covered: number;
  gap_days: number;           // days out of stock before relief
  lost_sales_units: number;   // gap_days * rate
  lost_margin_rs: number;     // lost_sales_units * (unit_price * margin_pct)
  purchase_cost: number;      // order_qty * unit_price
  premium_vs_cheapest: number;// extra purchase cost compared to standard supplier
  transfer_cost: number;      // units_transferred * transfer_cost_per_unit
  excess_units_from_moq: number;
  holding_cost: number;       // holding cost for excess units over 1 month
  total_expected_cost: number;// lost_margin_rs + purchase_cost + transfer_cost + holding_cost
  feasible: boolean;
  infeasible_reason: string | null;
  // Specific parameters
  donor_location?: string;
  supplier?: string;
  lead_time_days?: number;
  unit_price?: number;
  order_qty?: number;
  transfer_qty?: number;
  extra_cost_flag?: string | null;
}

export interface IssueEvidence {
  stock: number;
  daily_demand_rate: number;
  days_of_cover: number;
  stockout_date: string; // ISO date string
  inbound_po_qty?: number;
  inbound_po_date?: string;
  overdue_po_id?: string;
  overdue_days?: number;
  cash_tied_up_rs?: number;
  revenue_at_risk_rs?: number;
  spike_ratio?: number;
  donor_available?: {
    location: string;
    surplus: number;
  };
  suppliers_available?: Array<{
    supplier: string;
    price: number;
    lead_time_days: number;
    moq: number;
  }>;
  store_messages?: string[];
  historical_7d_sales?: number[];
  historical_28d_sales?: number[];
  notes?: string;
}

export interface EngineIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  sku: string;
  sku_name: string;
  category: string;
  machine_model: string;
  location: string;
  title: string;
  description: string;
  priority_score: number;
  is_top_3: boolean;
  evidence: IssueEvidence;
  options: EvaluatedOption[];
  chosen_option: EvaluatedOption;
  runner_up_option: EvaluatedOption | null;
  runner_up_reason: string | null;
  drafted_actions: DraftedAction[];
  cached_explanation?: string;
}

export interface DraftedAction {
  id?: string;
  type: ActionType;
  sku: string;
  sku_name: string;
  location: string;
  title: string;
  reason: string;
  priority: number;
  payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AgentRunResult {
  asOfDate: string;
  steps: {
    name: 'Observe' | 'Reason' | 'Evaluate' | 'Decide' | 'Act' | 'Explain';
    duration_ms: number;
    summary: string;
  }[];
  totalIssues: number;
  totalAtRiskRs: number;
  top3Issues: EngineIssue[];
  allIssues: EngineIssue[];
  draftedActions: DraftedAction[];
}
