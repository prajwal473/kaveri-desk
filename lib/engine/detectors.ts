import { EngineConfig, DEFAULT_CONFIG } from './config';
import { IssueType, Severity, IssueEvidence } from './types';

export interface RawProduct {
  sku: string;
  name: string;
  machine_model: string;
  category: string;
}

export interface RawInventory {
  sku: string;
  location: string;
  stock: number;
}

export interface RawSupplier {
  supplier: string;
  sku: string;
  price: number;
  lead_time_days: number;
  moq: number;
}

export interface RawPO {
  po: string;
  supplier: string;
  sku: string;
  qty: number;
  expected_date: Date | string;
  status: string;
}

export interface RawStoreMessage {
  location: string;
  message: string;
  date: Date | string;
}

export interface DetectedRawIssue {
  type: IssueType;
  severity: Severity;
  sku: string;
  sku_name: string;
  category: string;
  machine_model: string;
  location: string;
  title: string;
  description: string;
  evidence: IssueEvidence;
}

/**
 * Runs all 6 issue detectors across products, inventory, sales demand, suppliers, and POs.
 */
export function detectAllIssues(params: {
  products: RawProduct[];
  inventory: RawInventory[];
  demandMap: Record<string, Record<string, { rate: number; rate7: number; rate28: number; spikeRatio: number; anomaly: string }>>;
  suppliers: RawSupplier[];
  purchaseOrders: RawPO[];
  storeMessages: RawStoreMessage[];
  asOf?: Date;
  config?: EngineConfig;
}): DetectedRawIssue[] {
  const {
    products,
    inventory,
    demandMap,
    suppliers,
    purchaseOrders,
    storeMessages,
    asOf = new Date(),
    config = DEFAULT_CONFIG,
  } = params;

  const msPerDay = 24 * 60 * 60 * 1000;
  const asOfTime = asOf.getTime();
  const issues: DetectedRawIssue[] = [];

  const productMap = new Map(products.map((p) => [p.sku, p]));
  const suppliersBySku = new Map<string, RawSupplier[]>();
  for (const s of suppliers) {
    const list = suppliersBySku.get(s.sku) || [];
    list.push(s);
    suppliersBySku.set(s.sku, list);
  }

  const posBySkuLoc = new Map<string, RawPO[]>();
  for (const po of purchaseOrders) {
    const list = posBySkuLoc.get(po.sku) || [];
    list.push(po);
    posBySkuLoc.set(po.sku, list);
  }

  // Precompute inventory by SKU
  const invBySku = new Map<string, Record<string, number>>();
  for (const inv of inventory) {
    if (!invBySku.has(inv.sku)) invBySku.set(inv.sku, {});
    invBySku.get(inv.sku)![inv.location] = inv.stock;
  }

  // 1. Check each SKU + Location
  for (const inv of inventory) {
    const prod = productMap.get(inv.sku);
    if (!prod) continue;

    const skuSuppliers = suppliersBySku.get(inv.sku) || [];
    const minSupplierLead = skuSuppliers.length > 0 ? Math.min(...skuSuppliers.map((s) => s.lead_time_days)) : 999;
    const cheapestSupplier = skuSuppliers.length > 0 ? [...skuSuppliers].sort((a, b) => a.price - b.price)[0] : null;

    const skuDemands = demandMap[inv.sku] || {};
    const locDemand = skuDemands[inv.location] || { rate: 0, rate7: 0, rate28: 0, spikeRatio: 1, anomaly: 'NORMAL' };
    const rate = locDemand.rate;

    const locPOs = (posBySkuLoc.get(inv.sku) || []);
    // Find inbound open POs
    let inboundQty = 0;
    let inboundExpected: string | undefined;
    for (const po of locPOs) {
      const expDate = typeof po.expected_date === 'string' ? new Date(po.expected_date) : po.expected_date;
      const diff = (expDate.getTime() - asOfTime) / msPerDay;
      if (po.status === 'open' && diff >= 0) {
        inboundQty += po.qty;
        inboundExpected = expDate.toISOString();
      }
    }

    // Days of cover (without and with arriving PO)
    const daysOfCover = rate > 0 ? Number((inv.stock / rate).toFixed(1)) : 999;
    const assistedCover = rate > 0 ? Number(((inv.stock + inboundQty) / rate).toFixed(1)) : 999;
    const stockoutDate = new Date(asOfTime + daysOfCover * msPerDay).toISOString();

    const unitPrice = cheapestSupplier?.price || 500;
    const revenueAtRisk = Number((rate * 14 * unitPrice).toFixed(0));

    // Store messages for this location
    const matchedMessages = storeMessages
      .filter((m) => m.location === inv.location)
      .map((m) => m.message);

    // Network donor search
    const skuAllLocs = invBySku.get(inv.sku) || {};
    let bestDonor: { location: string; surplus: number } | undefined;
    let maxSurplus = 0;
    for (const [otherLoc, otherStock] of Object.entries(skuAllLocs)) {
      if (otherLoc === inv.location) continue;
      const otherRate = skuDemands[otherLoc]?.rate || 0;
      const otherTarget = otherRate * config.target_cover_days;
      const surplus = otherStock - otherTarget;
      if (surplus > 0 && surplus > maxSurplus) {
        maxSurplus = surplus;
        bestDonor = { location: otherLoc, surplus: Math.floor(surplus) };
      }
    }

    // a) STOCKOUT RISK detector
    // If donor can cover substantial part (>= 7 days of deficit), transfer is fast (1d).
    // Otherwise replenishment must come from suppliers (minSupplierLead).
    const targetUnits = Math.ceil(rate * config.target_cover_days);
    const deficit = Math.max(1, targetUnits - inv.stock);
    const canTransferFullRelief = bestDonor && bestDonor.surplus >= deficit * 0.7;
    const fastestReplenishment = canTransferFullRelief ? Math.min(config.transfer_days, minSupplierLead) : minSupplierLead;

    // Trigger stockout risk if assisted cover is less than fastest replenishment, OR if cover is critically low (<= 2 days)
    if (rate > 0 && (daysOfCover <= fastestReplenishment || daysOfCover <= 2.0) && inboundQty === 0) {
      issues.push({
        type: 'STOCKOUT_RISK',
        severity: daysOfCover <= 2 ? 'HIGH' : 'MEDIUM',
        sku: inv.sku,
        sku_name: prod.name,
        category: prod.category,
        machine_model: prod.machine_model,
        location: inv.location,
        title: `Critical Stockout Risk: Runs out in ${daysOfCover} days`,
        description: `Current stock of ${inv.stock} units will deplete in ${daysOfCover} days at ${rate}/day. Fastest supplier lead time is ${minSupplierLead} days. Immediate intervention required.`,
        evidence: {
          stock: inv.stock,
          daily_demand_rate: rate,
          days_of_cover: daysOfCover,
          stockout_date: stockoutDate,
          inbound_po_qty: inboundQty,
          inbound_po_date: inboundExpected,
          revenue_at_risk_rs: revenueAtRisk,
          donor_available: bestDonor,
          suppliers_available: skuSuppliers,
          store_messages: matchedMessages,
          notes: `Stockout expected before fastest supplier (${minSupplierLead}d) can deliver.`,
        },
      });
    }

    // b) SLOW MOVING / DEAD STOCK detector
    const cashTiedUp = Number((inv.stock * unitPrice).toFixed(0));
    if (daysOfCover > config.slow_moving_days_threshold && cashTiedUp >= config.slow_moving_cash_threshold) {
      issues.push({
        type: 'SLOW_MOVING',
        severity: cashTiedUp > 100000 ? 'HIGH' : 'MEDIUM',
        sku: inv.sku,
        sku_name: prod.name,
        category: prod.category,
        machine_model: prod.machine_model,
        location: inv.location,
        title: `Slow-Moving Capital: ₹${cashTiedUp.toLocaleString('en-IN')} Tied Up`,
        description: `${inv.stock} units sitting at ${inv.location} with ${daysOfCover > 900 ? 'negligible' : daysOfCover + ' days of'} cover. Daily burn is only ${rate}/day.`,
        evidence: {
          stock: inv.stock,
          daily_demand_rate: rate,
          days_of_cover: daysOfCover,
          stockout_date: stockoutDate,
          cash_tied_up_rs: cashTiedUp,
          notes: `Exceeds ${config.slow_moving_days_threshold} days cover threshold.`,
          store_messages: matchedMessages,
        },
      });
    }

    // d) SUPPLIER MISMATCH detector
    if (cheapestSupplier && rate > 0) {
      const isMoqExcessive = cheapestSupplier.moq > Math.max(100, rate * 60);
      if (isMoqExcessive) {
        issues.push({
          type: 'SUPPLIER_MISMATCH',
          severity: 'MEDIUM',
          sku: inv.sku,
          sku_name: prod.name,
          category: prod.category,
          machine_model: prod.machine_model,
          location: inv.location,
          title: `Supplier Constraint Trap: MOQ ${cheapestSupplier.moq} vs Consumption ${rate}/day`,
          description: `Primary supplier ${cheapestSupplier.supplier} requires MOQ ${cheapestSupplier.moq} units, which represents ${Math.round(cheapestSupplier.moq / rate)} days of supply. Alternate supplier needed.`,
          evidence: {
            stock: inv.stock,
            daily_demand_rate: rate,
            days_of_cover: daysOfCover,
            stockout_date: stockoutDate,
            suppliers_available: skuSuppliers,
            revenue_at_risk_rs: revenueAtRisk,
            notes: `High MOQ forces excessive working capital lock-in.`,
          },
        });
      }
    }

    // e) DEMAND ANOMALY detector
    if (locDemand.anomaly === 'SPIKE') {
      issues.push({
        type: 'DEMAND_ANOMALY',
        severity: 'HIGH',
        sku: inv.sku,
        sku_name: prod.name,
        category: prod.category,
        machine_model: prod.machine_model,
        location: inv.location,
        title: `Demand Spike Detected: ${locDemand.spikeRatio}x Normal Rate`,
        description: `7-day run rate surged to ${locDemand.rate7}/day compared to 28-day baseline of ${locDemand.rate28}/day. Stock cover collapsed to ${daysOfCover} days.`,
        evidence: {
          stock: inv.stock,
          daily_demand_rate: rate,
          days_of_cover: daysOfCover,
          stockout_date: stockoutDate,
          spike_ratio: locDemand.spikeRatio,
          revenue_at_risk_rs: revenueAtRisk,
          store_messages: matchedMessages,
          notes: `Recent demand surge warrants buffer replenishment.`,
        },
      });
    } else if (locDemand.anomaly === 'DROP') {
      issues.push({
        type: 'DEMAND_ANOMALY',
        severity: 'LOW',
        sku: inv.sku,
        sku_name: prod.name,
        category: prod.category,
        machine_model: prod.machine_model,
        location: inv.location,
        title: `Demand Drop Detected: 7-day rate fell to ${locDemand.rate7}/day`,
        description: `Consumption dropped by ${Math.round((1 - locDemand.spikeRatio) * 100)}% below 28-day rate (${locDemand.rate28}/day). Halt incoming replenishments.`,
        evidence: {
          stock: inv.stock,
          daily_demand_rate: rate,
          days_of_cover: daysOfCover,
          stockout_date: stockoutDate,
          spike_ratio: locDemand.spikeRatio,
          notes: `Demand contraction observed.`,
        },
      });
    }

    // f) OVERSTOCK IMBALANCE detector
    if (inv.stock > rate * (config.target_cover_days + 10) && inv.stock > 40) {
      for (const [otherLoc, otherStock] of Object.entries(skuAllLocs)) {
        if (otherLoc === inv.location) continue;
        const otherRate = skuDemands[otherLoc]?.rate || 0;
        const otherCover = otherRate > 0 ? otherStock / otherRate : 999;
        if (otherRate > 0 && otherCover <= 4) {
          issues.push({
            type: 'OVERSTOCK_IMBALANCE',
            severity: 'MEDIUM',
            sku: inv.sku,
            sku_name: prod.name,
            category: prod.category,
            machine_model: prod.machine_model,
            location: inv.location,
            title: `Network Imbalance: Surplus at ${inv.location} while ${otherLoc} runs low`,
            description: `${inv.location} holds ${inv.stock} units (${daysOfCover} days cover), while ${otherLoc} has only ${otherStock} units (${otherCover.toFixed(1)} days cover). Intra-network transfer recommended.`,
            evidence: {
              stock: inv.stock,
              daily_demand_rate: rate,
              days_of_cover: daysOfCover,
              stockout_date: stockoutDate,
              donor_available: { location: inv.location, surplus: Math.floor(inv.stock - rate * config.target_cover_days) },
              notes: `Immediate rebalancing will prevent stockout at ${otherLoc}.`,
            },
          });
          break;
        }
      }
    }
  }

  // c) OVERDUE PO detector
  for (const po of purchaseOrders) {
    if (po.status !== 'open') continue;
    const expDate = typeof po.expected_date === 'string' ? new Date(po.expected_date) : po.expected_date;
    const overdueDays = Math.floor((asOfTime - expDate.getTime()) / msPerDay);

    if (overdueDays > 0) {
      const prod = productMap.get(po.sku);
      if (!prod) continue;

      const skuAllLocs = invBySku.get(po.sku) || {};
      const firstLoc = Object.keys(skuAllLocs)[0] || 'Hubli';
      const curStock = skuAllLocs[firstLoc] || 0;
      const rate = demandMap[po.sku]?.[firstLoc]?.rate || 1;
      const coverDays = rate > 0 ? Number((curStock / rate).toFixed(1)) : 999;
      const stockAtRisk = Number((po.qty * (suppliersBySku.get(po.sku)?.[0]?.price || 800)).toFixed(0));

      issues.push({
        type: 'OVERDUE_PO',
        severity: overdueDays >= 5 || coverDays <= 5 ? 'HIGH' : 'MEDIUM',
        sku: po.sku,
        sku_name: prod.name,
        category: prod.category,
        machine_model: prod.machine_model,
        location: firstLoc,
        title: `Overdue PO ${po.po}: ${overdueDays} Days Late from ${po.supplier}`,
        description: `PO ${po.po} for ${po.qty} units was expected on ${expDate.toISOString().slice(0, 10)}. Current site stock (${curStock}) will exhaust in ${coverDays} days!`,
        evidence: {
          stock: curStock,
          daily_demand_rate: rate,
          days_of_cover: coverDays,
          stockout_date: new Date(asOfTime + coverDays * msPerDay).toISOString(),
          overdue_po_id: po.po,
          overdue_days: overdueDays,
          revenue_at_risk_rs: stockAtRisk,
          notes: `Supplier delayed delivery. Expedited escalation required.`,
        },
      });
    }
  }

  return issues;
}
