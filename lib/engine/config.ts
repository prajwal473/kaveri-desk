export interface EngineConfig {
  transfer_cost_per_unit: number; // in INR
  transfer_days: number;          // default 1 day
  target_cover_days: number;      // default 14 days
  safety_days: number;            // default 2 days
  holding_cost_pct_per_month: number; // default 2.0%
  gross_margin_pct: Record<string, number>;
  slow_moving_days_threshold: number; // 120 days
  slow_moving_cash_threshold: number; // Rs 50,000
  spike_threshold: number;        // 1.8x
  drop_threshold: number;         // 0.5x
  min_spike_volume_28d: number;   // minimum 28d volume to consider anomaly (guard against tiny numbers like 0.1 -> 0.2)
}

export const DEFAULT_CONFIG: EngineConfig = {
  transfer_cost_per_unit: 15,
  transfer_days: 1,
  target_cover_days: 14,
  safety_days: 2,
  holding_cost_pct_per_month: 2.0,
  slow_moving_days_threshold: 120,
  slow_moving_cash_threshold: 50000,
  spike_threshold: 1.8,
  drop_threshold: 0.5,
  min_spike_volume_28d: 10,
  gross_margin_pct: {
    'Filters': 35,
    'Seals': 45,
    'O-Rings': 50,
    'Hoses': 40,
    'Pumps': 30,
    'Valves': 32,
    'Couplings': 38,
    'Cylinders': 28,
  },
};

export const LOCATIONS = [
  'Belgaum',
  'Gokak',
  'Hubli',
  'Dharwad',
  'Bagalkot',
  'Vijayapura',
  'Hubli Central WH',
  'Belgaum WH',
] as const;

export type LocationName = typeof LOCATIONS[number];
