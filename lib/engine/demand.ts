import { DEFAULT_CONFIG, EngineConfig } from './config';
import { DemandRate } from './types';

export interface SalesRecord {
  date: Date | string;
  sku: string;
  location: string;
  qty_sold: number;
}

/**
 * Calculates blended demand rate, spike ratio, and anomaly detection.
 * Blend: 0.6 * 7-day avg + 0.4 * 28-day avg
 * Spike: >= 1.8x
 * Drop: <= 0.5x
 * Guarded against small volume noise (< min_spike_volume_28d).
 */
export function calculateDemandRate(
  sku: string,
  location: string,
  salesHistory: SalesRecord[],
  asOf: Date = new Date(),
  config: EngineConfig = DEFAULT_CONFIG
): DemandRate {
  const asOfTime = asOf.getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  // Filter sales for this sku and location within the last 28 days before asOf
  let totalSold7 = 0;
  let totalSold28 = 0;

  for (const s of salesHistory) {
    if (s.sku !== sku || s.location !== location) continue;
    const saleDate = typeof s.date === 'string' ? new Date(s.date) : s.date;
    const saleTime = saleDate.getTime();
    const daysAgo = (asOfTime - saleTime) / msPerDay;

    if (daysAgo >= 0 && daysAgo <= 28) {
      totalSold28 += s.qty_sold;
      if (daysAgo <= 7) {
        totalSold7 += s.qty_sold;
      }
    }
  }

  const rate7 = totalSold7 / 7;
  const rate28 = totalSold28 / 28;
  const blendedRate = Number((0.6 * rate7 + 0.4 * rate28).toFixed(3));

  let spikeRatio = 1.0;
  if (rate28 > 0) {
    spikeRatio = Number((rate7 / rate28).toFixed(2));
  } else if (rate7 > 0) {
    spikeRatio = 2.0; // infinite ratio if 28d was 0 but recent 7d has sales
  }

  let anomaly: 'SPIKE' | 'DROP' | 'NORMAL' = 'NORMAL';
  if (totalSold28 >= config.min_spike_volume_28d) {
    if (spikeRatio >= config.spike_threshold) {
      anomaly = 'SPIKE';
    } else if (spikeRatio <= config.drop_threshold) {
      anomaly = 'DROP';
    }
  }

  return {
    sku,
    location,
    rate7: Number(rate7.toFixed(2)),
    rate28: Number(rate28.toFixed(2)),
    blendedRate: Math.max(blendedRate, 0),
    spikeRatio,
    anomaly,
    totalSold7,
    totalSold28,
  };
}
