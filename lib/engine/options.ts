import { EngineConfig, DEFAULT_CONFIG } from './config';
import { EvaluatedOption, IssueType } from './types';
import { RawSupplier } from './detectors';
import { NetworkSurplus } from './types';

export interface OptionContext {
  sku: string;
  location: string;
  issueType: IssueType;
  currentStock: number;
  dailyRate: number;
  category: string;
  daysOfCover: number;
  surplusDonors: NetworkSurplus[];
  suppliers: RawSupplier[];
  config?: EngineConfig;
}

/**
 * Generates and evaluates options for a given supply chain issue.
 * Computes exact financial metrics: gap days, lost sales units, lost margin,
 * purchase cost, transfer cost, excess MOQ units, holding cost, and total expected cost.
 */
export function generateOptions(ctx: OptionContext): EvaluatedOption[] {
  const {
    sku,
    location,
    issueType,
    currentStock,
    dailyRate,
    category,
    daysOfCover,
    surplusDonors,
    suppliers,
    config = DEFAULT_CONFIG,
  } = ctx;

  const options: EvaluatedOption[] = [];
  const marginPct = (config.gross_margin_pct[category] || 35) / 100;
  const holdingPct = (config.holding_cost_pct_per_month || 2.0) / 100;

  // Suppliers sorted by price (standard) vs speed (express)
  const sortedByPrice = [...suppliers].sort((a, b) => a.price - b.price);
  const sortedBySpeed = [...suppliers].sort((a, b) => a.lead_time_days - b.lead_time_days);

  const standardSupplier = sortedByPrice[0];
  const fastSupplier = sortedBySpeed[0];
  const benchmarkPrice = standardSupplier?.price || 500;

  // Margin per unit calculation: selling price = cost / (1 - marginPct)
  const marginPerUnit = (cost: number) => {
    const sellingPrice = cost / Math.max(0.01, 1 - marginPct);
    return sellingPrice - cost;
  };

  // Units needed to reach target cover (14 days)
  const targetUnits = Math.max(1, Math.ceil(dailyRate * config.target_cover_days));
  const netNeeded = Math.max(1, targetUnits - currentStock);

  // Best donor for transfer
  const potentialDonors = surplusDonors
    .filter((d) => d.location !== location && d.canDonate)
    .sort((a, b) => b.surplus - a.surplus);
  const bestDonor = potentialDonors[0];

  // 1. OPTION: TRANSFER
  if (bestDonor) {
    const availableTransfer = Math.min(netNeeded, bestDonor.maxDonation);
    const isPartial = availableTransfer < netNeeded;
    const transferLead = config.transfer_days; // 1 day
    const gapDays = Math.max(0, transferLead - daysOfCover);
    const lostSalesUnits = Number((gapDays * dailyRate).toFixed(1));
    const lostMarginRs = Number((lostSalesUnits * marginPerUnit(benchmarkPrice)).toFixed(0));
    const transferCost = availableTransfer * config.transfer_cost_per_unit;
    const purchaseCost = 0; // already owned inventory
    const holdingCost = 0;
    const totalExpectedCost = lostMarginRs + transferCost;

    options.push({
      id: `opt-transfer-${bestDonor.location}`,
      type: 'TRANSFER',
      name: isPartial ? `Partial Inter-Store Transfer from ${bestDonor.location}` : `Inter-Store Transfer from ${bestDonor.location}`,
      description: `Transfer ${availableTransfer} units from ${bestDonor.location} (${transferLead} day lead time). ${isPartial ? `Only covers ${availableTransfer}/${netNeeded} units.` : 'Covers full target deficit.'}`,
      units_covered: availableTransfer,
      gap_days: gapDays,
      lost_sales_units: lostSalesUnits,
      lost_margin_rs: lostMarginRs,
      purchase_cost: purchaseCost,
      premium_vs_cheapest: 0,
      transfer_cost: transferCost,
      excess_units_from_moq: 0,
      holding_cost: holdingCost,
      total_expected_cost: totalExpectedCost,
      feasible: availableTransfer > 0,
      infeasible_reason: availableTransfer <= 0 ? 'Donor surplus exhausted' : null,
      donor_location: bestDonor.location,
      transfer_qty: availableTransfer,
      lead_time_days: transferLead,
    });
  } else {
    // Infeasible transfer option for transparent comparison
    options.push({
      id: 'opt-transfer-none',
      type: 'TRANSFER',
      name: 'Inter-Store Transfer (Network Stock)',
      description: 'Transfer surplus units from regional stores or central warehouse.',
      units_covered: 0,
      gap_days: 999,
      lost_sales_units: 0,
      lost_margin_rs: 0,
      purchase_cost: 0,
      premium_vs_cheapest: 0,
      transfer_cost: 0,
      excess_units_from_moq: 0,
      holding_cost: 0,
      total_expected_cost: 999999,
      feasible: false,
      infeasible_reason: 'No store or warehouse holds surplus above safety stock.',
    });
  }

  // 2. OPTION: PO_FAST (Fastest Supplier if faster than standard)
  if (fastSupplier && standardSupplier && fastSupplier.supplier !== standardSupplier.supplier) {
    // For fast express replenishment, order emergency quantity to prevent stockout:
    // e.g. enough to cover until standard orders could arrive or MOQ
    const emergencyNeeded = Math.max(
      fastSupplier.moq,
      Math.min(netNeeded, Math.ceil(dailyRate * Math.max(standardSupplier.lead_time_days, 7)))
    );
    const orderQty = emergencyNeeded;
    const excessMoq = Math.max(0, orderQty - netNeeded);
    const gapDays = Math.max(0, fastSupplier.lead_time_days - daysOfCover);
    const lostSalesUnits = Number((gapDays * dailyRate).toFixed(1));
    const lostMarginRs = Number((lostSalesUnits * marginPerUnit(fastSupplier.price)).toFixed(0));
    const purchaseCost = orderQty * fastSupplier.price;
    const standardCostForSameQty = orderQty * standardSupplier.price;
    const premiumVsCheapest = Math.max(0, purchaseCost - standardCostForSameQty);
    const holdingCost = Number((excessMoq * fastSupplier.price * holdingPct).toFixed(0));
    const totalExpectedCost = lostMarginRs + purchaseCost + holdingCost;

    options.push({
      id: `opt-po-fast-${fastSupplier.supplier}`,
      type: 'PO_FAST',
      name: `Express PO: ${fastSupplier.supplier} (${fastSupplier.lead_time_days}d Delivery)`,
      description: `Order ${orderQty} units at ₹${fastSupplier.price}/unit (${fastSupplier.lead_time_days} days lead time vs standard ${standardSupplier.lead_time_days} days).`,
      units_covered: orderQty,
      gap_days: gapDays,
      lost_sales_units: lostSalesUnits,
      lost_margin_rs: lostMarginRs,
      purchase_cost: purchaseCost,
      premium_vs_cheapest: premiumVsCheapest,
      transfer_cost: 0,
      excess_units_from_moq: excessMoq,
      holding_cost: holdingCost,
      total_expected_cost: totalExpectedCost,
      feasible: true,
      infeasible_reason: null,
      supplier: fastSupplier.supplier,
      lead_time_days: fastSupplier.lead_time_days,
      unit_price: fastSupplier.price,
      order_qty: orderQty,
      extra_cost_flag: premiumVsCheapest > 0 ? `+₹${premiumVsCheapest} premium over ${standardSupplier.supplier}` : null,
    });
  }

  // 3. OPTION: PO_STANDARD (Cheapest Supplier)
  if (standardSupplier) {
    const rawQty = netNeeded;
    const orderQty = Math.max(rawQty, standardSupplier.moq);
    const excessMoq = Math.max(0, orderQty - rawQty);
    const gapDays = Math.max(0, standardSupplier.lead_time_days - daysOfCover);
    const lostSalesUnits = Number((gapDays * dailyRate).toFixed(1));
    const lostMarginRs = Number((lostSalesUnits * marginPerUnit(standardSupplier.price)).toFixed(0));
    const purchaseCost = orderQty * standardSupplier.price;
    const holdingCost = Number((excessMoq * standardSupplier.price * holdingPct).toFixed(0));
    const totalExpectedCost = lostMarginRs + purchaseCost + holdingCost;

    options.push({
      id: `opt-po-std-${standardSupplier.supplier}`,
      type: 'PO_STANDARD',
      name: `Standard PO: ${standardSupplier.supplier} (Economy)`,
      description: `Order ${orderQty} units at ₹${standardSupplier.price}/unit (MOQ ${standardSupplier.moq}, ${standardSupplier.lead_time_days} days lead time).`,
      units_covered: orderQty,
      gap_days: gapDays,
      lost_sales_units: lostSalesUnits,
      lost_margin_rs: lostMarginRs,
      purchase_cost: purchaseCost,
      premium_vs_cheapest: 0,
      transfer_cost: 0,
      excess_units_from_moq: excessMoq,
      holding_cost: holdingCost,
      total_expected_cost: totalExpectedCost,
      feasible: true,
      infeasible_reason: null,
      supplier: standardSupplier.supplier,
      lead_time_days: standardSupplier.lead_time_days,
      unit_price: standardSupplier.price,
      order_qty: orderQty,
    });
  }

  // 4. OPTION: COMBO (Bridge Transfer + Standard PO)
  // Only generate COMBO if donor CANNOT cover the full deficit (partial transfer)
  if (
    bestDonor &&
    bestDonor.maxDonation < netNeeded &&
    standardSupplier &&
    standardSupplier.lead_time_days > config.transfer_days
  ) {
    const bridgeUnitsNeeded = Math.min(
      Math.ceil(dailyRate * standardSupplier.lead_time_days),
      bestDonor.maxDonation
    );
    if (bridgeUnitsNeeded > 0) {
      const remainingNeeded = Math.max(1, netNeeded - bridgeUnitsNeeded);
      const orderQty = Math.max(remainingNeeded, standardSupplier.moq);
      const excessMoq = Math.max(0, orderQty - remainingNeeded);
      const transferGap = Math.max(0, config.transfer_days - daysOfCover);
      const lostSalesUnits = Number((transferGap * dailyRate).toFixed(1));
      const lostMarginRs = Number((lostSalesUnits * marginPerUnit(standardSupplier.price)).toFixed(0));
      const transferCost = bridgeUnitsNeeded * config.transfer_cost_per_unit;
      const purchaseCost = orderQty * standardSupplier.price;
      const holdingCost = Number((excessMoq * standardSupplier.price * holdingPct).toFixed(0));
      const totalExpectedCost = lostMarginRs + transferCost + purchaseCost + holdingCost;

      options.push({
        id: 'opt-combo-bridge-po',
        type: 'COMBO',
        name: `Combo Strategy: Bridge Transfer (${bridgeUnitsNeeded}u) + Economy PO`,
        description: `Transfer ${bridgeUnitsNeeded} units from ${bestDonor.location} to prevent stockout, and order ${orderQty} units from ${standardSupplier.supplier}.`,
        units_covered: bridgeUnitsNeeded + orderQty,
        gap_days: transferGap,
        lost_sales_units: lostSalesUnits,
        lost_margin_rs: lostMarginRs,
        purchase_cost: purchaseCost,
        premium_vs_cheapest: 0,
        transfer_cost: transferCost,
        excess_units_from_moq: excessMoq,
        holding_cost: holdingCost,
        total_expected_cost: totalExpectedCost,
        feasible: true,
        infeasible_reason: null,
        donor_location: bestDonor.location,
        transfer_qty: bridgeUnitsNeeded,
        supplier: standardSupplier.supplier,
        order_qty: orderQty,
        unit_price: standardSupplier.price,
        lead_time_days: standardSupplier.lead_time_days,
      });
    }
  }

  // 5. OPTION: WAIT / MONITOR
  const lostSalesWait = Number((Math.min(14, Math.max(0, 14 - daysOfCover)) * dailyRate).toFixed(1));
  const lostMarginWait = Number((lostSalesWait * marginPerUnit(benchmarkPrice)).toFixed(0));
  options.push({
    id: 'opt-wait',
    type: 'WAIT',
    name: 'Do Nothing / Rely on Existing Inventory',
    description: daysOfCover >= 14 ? 'Stock cover is healthy. Maintain passive monitoring.' : `Passive waiting: incurs ${lostSalesWait} units lost sales (₹${lostMarginWait} lost margin).`,
    units_covered: currentStock,
    gap_days: daysOfCover >= 14 ? 0 : Math.max(0, 14 - daysOfCover),
    lost_sales_units: lostSalesWait,
    lost_margin_rs: lostMarginWait,
    purchase_cost: 0,
    premium_vs_cheapest: 0,
    transfer_cost: 0,
    excess_units_from_moq: 0,
    holding_cost: 0,
    total_expected_cost: lostMarginWait,
    feasible: true,
    infeasible_reason: null,
  });

  return options;
}
