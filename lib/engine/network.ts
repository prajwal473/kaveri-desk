import { EngineConfig, DEFAULT_CONFIG } from './config';
import { NetworkSurplus } from './types';

export interface POArrivalCheck {
  effectiveStock: number;
  unassistedStockoutDays: number;
  assistedStockoutDays: number;
  inboundPoBeforeStockout: boolean;
  inboundPoQty: number;
  inboundPoArrivalDate?: string;
}

/**
 * Calculates stockout days and accounts for inbound open POs arriving before stockout.
 * Overdue POs are treated as unknown arrival date and NOT credited to immediate cover.
 */
export function calculateCoverAndStockout(
  stock: number,
  rate: number,
  openPOs: Array<{
    po: string;
    expected_date: Date | string;
    qty: number;
    status: string;
  }>,
  asOf: Date = new Date()
): POArrivalCheck {
  if (rate <= 0) {
    return {
      effectiveStock: stock,
      unassistedStockoutDays: 999,
      assistedStockoutDays: 999,
      inboundPoBeforeStockout: false,
      inboundPoQty: 0,
    };
  }

  const unassistedStockoutDays = Number((stock / rate).toFixed(1));
  const msPerDay = 24 * 60 * 60 * 1000;
  const asOfTime = asOf.getTime();

  let inboundPoQty = 0;
  let inboundPoArrivalDate: string | undefined = undefined;
  let inboundPoBeforeStockout = false;

  // Filter open non-overdue POs
  for (const po of openPOs) {
    const expDate = typeof po.expected_date === 'string' ? new Date(po.expected_date) : po.expected_date;
    const diffDays = (expDate.getTime() - asOfTime) / msPerDay;

    // If PO is expected in the future and arrives before current stock exhausts
    if (po.status === 'open' && diffDays >= 0 && diffDays <= unassistedStockoutDays) {
      inboundPoBeforeStockout = true;
      inboundPoQty += po.qty;
      inboundPoArrivalDate = expDate.toISOString();
    }
  }

  const effectiveStock = stock + inboundPoQty;
  const assistedStockoutDays = Number((effectiveStock / rate).toFixed(1));

  return {
    effectiveStock,
    unassistedStockoutDays,
    assistedStockoutDays,
    inboundPoBeforeStockout,
    inboundPoQty,
    inboundPoArrivalDate,
  };
}

/**
 * Calculates network surplus across all locations for a given SKU.
 * Surplus = stock - rate * target_cover_days.
 * A location can only donate if surplus > 0.
 * A location is never drained below its own safety cover (rate * safety_days).
 */
export function calculateNetworkSurplus(
  sku: string,
  inventoryByLocation: Record<string, number>,
  demandByLocation: Record<string, number>,
  config: EngineConfig = DEFAULT_CONFIG
): NetworkSurplus[] {
  const result: NetworkSurplus[] = [];

  for (const [location, stock] of Object.entries(inventoryByLocation)) {
    const blendedRate = demandByLocation[location] || 0;
    const targetStock = Number((blendedRate * config.target_cover_days).toFixed(1));
    const safetyStock = Number((blendedRate * config.safety_days).toFixed(1));
    const surplus = Number((stock - targetStock).toFixed(1));
    const maxDonation = Math.max(0, Number((stock - safetyStock).toFixed(1)));
    const canDonate = surplus > 0 && maxDonation > 0;

    result.push({
      location,
      stock,
      blendedRate,
      targetStock,
      safetyStock,
      surplus,
      maxDonation,
      canDonate,
    });
  }

  return result;
}
