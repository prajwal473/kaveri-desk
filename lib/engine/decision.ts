import { EvaluatedOption, DraftedAction, EngineIssue, IssueType } from './types';
import { DetectedRawIssue } from './detectors';
import { generateOptions } from './options';
import { EngineConfig, DEFAULT_CONFIG } from './config';
import { NetworkSurplus } from './types';
import { RawSupplier } from './detectors';

/**
 * Evaluates all options for an issue, selects the lowest-cost feasible option,
 * identifies runner-up with the explicit business rationale for why it lost,
 * and calculates priority score.
 */
export function decideBestOption(
  rawIssue: DetectedRawIssue,
  surplusDonors: NetworkSurplus[],
  suppliers: RawSupplier[],
  config: EngineConfig = DEFAULT_CONFIG
): {
  options: EvaluatedOption[];
  chosenOption: EvaluatedOption;
  runnerUpOption: EvaluatedOption | null;
  runnerUpReason: string | null;
  priorityScore: number;
} {
  const options = generateOptions({
    sku: rawIssue.sku,
    location: rawIssue.location,
    issueType: rawIssue.type,
    currentStock: rawIssue.evidence.stock,
    dailyRate: rawIssue.evidence.daily_demand_rate,
    category: rawIssue.category,
    daysOfCover: rawIssue.evidence.days_of_cover,
    surplusDonors,
    suppliers,
    config,
  });

  // Filter feasible options. If none feasible, fallback to all options.
  const feasibleOptions = options.filter((o) => o.feasible);
  const candidates = feasibleOptions.length > 0 ? feasibleOptions : options;

  // Compare candidates based on total expected financial cost
  const scoreOption = (opt: EvaluatedOption) => {
    // For urgent stockout / shortage issues, WAIT cannot be picked as active relief
    if (opt.type === 'WAIT' && rawIssue.evidence.days_of_cover < 7 && rawIssue.evidence.daily_demand_rate > 0) {
      return 10000000 + opt.total_expected_cost;
    }
    return opt.total_expected_cost;
  };

  const sortedCandidates = [...candidates].sort((a, b) => scoreOption(a) - scoreOption(b));

  const chosenOption = sortedCandidates[0];
  const runnerUpOption = sortedCandidates.length > 1 ? sortedCandidates[1] : null;

  let runnerUpReason: string | null = null;
  if (runnerUpOption) {
    if (!runnerUpOption.feasible) {
      runnerUpReason = runnerUpOption.infeasible_reason || 'Infeasible under current network/supplier constraints.';
    } else if (runnerUpOption.gap_days > chosenOption.gap_days) {
      runnerUpReason = `Lost due to ${runnerUpOption.gap_days - chosenOption.gap_days} extra stockout gap days causing ₹${runnerUpOption.lost_margin_rs - chosenOption.lost_margin_rs} higher lost gross margin.`;
    } else if (runnerUpOption.premium_vs_cheapest > chosenOption.premium_vs_cheapest) {
      runnerUpReason = `Lost due to ₹${runnerUpOption.premium_vs_cheapest - chosenOption.premium_vs_cheapest} higher supplier price premium.`;
    } else if (runnerUpOption.excess_units_from_moq > chosenOption.excess_units_from_moq) {
      runnerUpReason = `Lost due to excessive MOQ forcing ₹${runnerUpOption.holding_cost} holding cost on ${runnerUpOption.excess_units_from_moq} excess units.`;
    } else if (runnerUpOption.transfer_cost > chosenOption.transfer_cost) {
      runnerUpReason = `Lost due to ₹${runnerUpOption.transfer_cost - chosenOption.transfer_cost} higher transit logistics cost.`;
    } else {
      const diff = scoreOption(runnerUpOption) - scoreOption(chosenOption);
      runnerUpReason = `Higher total expected financial cost (+₹${Math.round(diff)} vs recommended option).`;
    }
  }

  // Priority score formula:
  // revenue_at_risk (or cash_tied_up for slow stock) * urgency factor (1 / max(daysOfCover, 0.5))
  const baseValue =
    rawIssue.type === 'SLOW_MOVING'
      ? rawIssue.evidence.cash_tied_up_rs || 50000
      : rawIssue.evidence.revenue_at_risk_rs || 20000;

  const urgencyFactor = 1 / Math.max(rawIssue.evidence.days_of_cover, 0.5);
  const priorityScore = Number((baseValue * urgencyFactor).toFixed(0));

  return {
    options,
    chosenOption,
    runnerUpOption,
    runnerUpReason,
    priorityScore,
  };
}
