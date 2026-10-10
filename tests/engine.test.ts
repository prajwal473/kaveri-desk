import { describe, it, expect } from 'vitest';
import { runAgentLoop } from '../lib/engine';
import { calculateDemandRate } from '../lib/engine/demand';
import { calculateCoverAndStockout } from '../lib/engine/network';
import { DEFAULT_CONFIG } from '../lib/engine/config';

describe('Kaveri Desk Deterministic Reasoning Engine', () => {
  const asOf = new Date('2026-10-10T00:00:00.000Z');

  // Helper to generate 90 days of sales history
  const generateSales = (
    sku: string,
    location: string,
    dailyQty: number,
    days: number = 28,
    spikeRecentDays: number = 0,
    spikeMultiplier: number = 1
  ) => {
    const list = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    for (let i = 1; i <= days; i++) {
      const date = new Date(asOf.getTime() - i * msPerDay);
      const isSpike = i <= spikeRecentDays;
      const qty = isSpike ? Math.round(dailyQty * spikeMultiplier) : dailyQty;
      list.push({
        date: date.toISOString(),
        sku,
        location,
        qty_sold: qty,
      });
    }
    return list;
  };

  it('1. Hero Case: Gokak HF-210 runs out in ~2 days, picks Rapid Parts (Express PO) with extra cost flagged', () => {
    // Gokak has 8 units, selling 4/day. Runs out in 2 days.
    // Shree Hydro: 7 days lead, Rs 420.
    // Rapid Parts: 3 days lead, Rs 470.
    // Belgaum store holds HF-210 but with NO surplus (12 units, sells 1/day -> target cover 14 units).
    const products = [
      { sku: 'HF-210', name: 'Hydraulic Filter HF-210', machine_model: 'JCB 3DX', category: 'Filters' },
    ];
    const inventory = [
      { sku: 'HF-210', location: 'Gokak', stock: 8 },
      { sku: 'HF-210', location: 'Belgaum', stock: 12 },
    ];
    const sales = [
      ...generateSales('HF-210', 'Gokak', 4, 28),
      ...generateSales('HF-210', 'Belgaum', 1, 28),
    ];
    const suppliers = [
      { supplier: 'Shree Hydro', sku: 'HF-210', price: 420, lead_time_days: 7, moq: 20 },
      { supplier: 'Rapid Parts', sku: 'HF-210', price: 470, lead_time_days: 3, moq: 20 },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders: [],
      storeMessages: [{ location: 'Gokak', message: 'Customer asking for HF-210 again, only 3 left', date: asOf }],
      asOf,
    });

    const gokakIssue = result.allIssues.find((i) => i.sku === 'HF-210' && i.location === 'Gokak');
    expect(gokakIssue).toBeDefined();
    expect(gokakIssue?.type).toBe('STOCKOUT_RISK');
    expect(gokakIssue?.evidence.days_of_cover).toBeCloseTo(2.0, 1);

    // Chosen option must be Rapid Parts (PO_FAST)
    expect(gokakIssue?.chosen_option.type).toBe('PO_FAST');
    expect(gokakIssue?.chosen_option.supplier).toBe('Rapid Parts');
    expect(gokakIssue?.chosen_option.extra_cost_flag).toContain('+₹');

    // Runner up should be identified with clear reason
    expect(gokakIssue?.runner_up_option).toBeDefined();
    expect(gokakIssue?.runner_up_reason).toBeTruthy();
  });

  it('2. Transfer Case: Hubli SK-45 nearly out, Dharwad has large surplus selling slowly -> Transfer chosen', () => {
    const products = [
      { sku: 'SK-45', name: 'Seal Kit SK-45', machine_model: 'Tata Hitachi EX200', category: 'Seals' },
    ];
    // Hubli has 2 units, sells 2/day -> 1 day cover.
    // Dharwad has 60 units, sells 0.5/day -> target cover is 7 units, surplus is 53 units!
    const inventory = [
      { sku: 'SK-45', location: 'Hubli', stock: 2 },
      { sku: 'SK-45', location: 'Dharwad', stock: 60 },
    ];
    const sales = [
      ...generateSales('SK-45', 'Hubli', 2, 28),
      ...generateSales('SK-45', 'Dharwad', 0.5, 28),
    ];
    const suppliers = [
      { supplier: 'Kirloskar Fluidics', sku: 'SK-45', price: 650, lead_time_days: 6, moq: 25 },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders: [],
      storeMessages: [{ location: 'Dharwad', message: 'Lots of seal kits sitting unsold', date: asOf }],
      asOf,
    });

    const hubliIssue = result.allIssues.find((i) => i.sku === 'SK-45' && i.location === 'Hubli');
    expect(hubliIssue).toBeDefined();
    expect(hubliIssue?.chosen_option.type).toBe('TRANSFER');
    expect(hubliIssue?.chosen_option.donor_location).toBe('Dharwad');
    expect(hubliIssue?.chosen_option.transfer_cost).toBeGreaterThan(0);
  });

  it('3. MOQ Trap / Bad Supplier Choice: Detects MOQ mismatch for slow item', () => {
    const products = [
      { sku: 'CV-99', name: 'Control Valve Spool', machine_model: 'Komatsu PC200', category: 'Valves' },
    ];
    // Sells 0.2/day. Stock 2 units.
    // Supplier has MOQ of 500 units (representing 2500 days of supply!)
    const inventory = [{ sku: 'CV-99', location: 'Bagalkot', stock: 2 }];
    const sales = generateSales('CV-99', 'Bagalkot', 0.2, 28);
    const suppliers = [
      { supplier: 'Mega Forge Ltd', sku: 'CV-99', price: 1200, lead_time_days: 10, moq: 500 },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders: [],
      storeMessages: [],
      asOf,
    });

    const issue = result.allIssues.find((i) => i.sku === 'CV-99');
    expect(issue).toBeDefined();
    expect(['SUPPLIER_MISMATCH', 'STOCKOUT_RISK']).toContain(issue?.type);
  });

  it('4. Hidden-Trap Case: Low stock but open PO arriving in 2 days -> No false stockout panic', () => {
    // Stock is 4, sells 2/day -> unassisted cover is 2 days.
    // BUT an open PO for 50 units arrives in 1 day (before stockout).
    const check = calculateCoverAndStockout(
      4,
      2,
      [
        {
          po: 'PO-TEST-1',
          supplier: 'Reliable Valves',
          qty: 50,
          expected_date: new Date(asOf.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'open',
        },
      ],
      asOf
    );

    expect(check.inboundPoBeforeStockout).toBe(true);
    expect(check.effectiveStock).toBe(54);
    expect(check.assistedStockoutDays).toBe(27);

    // Run engine with this product: should NOT flag critical stockout
    const products = [
      { sku: 'TRAP-01', name: 'Trap Filter', machine_model: 'JCB 3DX', category: 'Filters' },
    ];
    const inventory = [{ sku: 'TRAP-01', location: 'Belgaum', stock: 4 }];
    const sales = generateSales('TRAP-01', 'Belgaum', 2, 28);
    const suppliers = [
      { supplier: 'Standard Filter Co', sku: 'TRAP-01', price: 300, lead_time_days: 5, moq: 10 },
    ];
    const purchaseOrders = [
      {
        po: 'PO-SAFE-10',
        supplier: 'Standard Filter Co',
        sku: 'TRAP-01',
        qty: 50,
        expected_date: new Date(asOf.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'open',
      },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders,
      storeMessages: [],
      asOf,
    });

    const panicStockout = result.allIssues.find(
      (i) => i.sku === 'TRAP-01' && i.type === 'STOCKOUT_RISK'
    );
    expect(panicStockout).toBeUndefined();
  });

  it('5. Demand Spike Detection: 3x sales surge in last 5 days flagged with spike ratio', () => {
    // Baseline 2/day. In last 5 days sales jumped ~3.5x to 7/day.
    const sales = generateSales('OR-12', 'Bagalkot', 2, 28, 5, 3.5);
    const demand = calculateDemandRate('OR-12', 'Bagalkot', sales, asOf, DEFAULT_CONFIG);

    expect(demand.anomaly).toBe('SPIKE');
    expect(demand.spikeRatio).toBeGreaterThanOrEqual(1.8);

    const products = [
      { sku: 'OR-12', name: 'O-ring set OR-12', machine_model: 'Tata Hitachi EX200', category: 'O-Rings' },
    ];
    const inventory = [{ sku: 'OR-12', location: 'Bagalkot', stock: 25 }];
    const suppliers = [
      { supplier: 'National Seals', sku: 'OR-12', price: 150, lead_time_days: 4, moq: 50 },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders: [],
      storeMessages: [{ location: 'Bagalkot', message: 'New canal project nearby', date: asOf }],
      asOf,
    });

    const spikeIssue = result.allIssues.find((i) => i.sku === 'OR-12' && i.type === 'DEMAND_ANOMALY');
    expect(spikeIssue).toBeDefined();
    expect(spikeIssue?.evidence.spike_ratio).toBeGreaterThanOrEqual(1.8);
  });

  it('6. Overdue PO: Expected 6 days ago still open with receiving store low -> Flagged', () => {
    const products = [
      { sku: 'PG-88', name: 'Pump Gear PG-88', machine_model: 'Komatsu PC200', category: 'Pumps' },
    ];
    const inventory = [{ sku: 'PG-88', location: 'Hubli', stock: 4 }];
    const sales = generateSales('PG-88', 'Hubli', 1, 28);
    const suppliers = [
      { supplier: 'Precision Hydraulics', sku: 'PG-88', price: 2400, lead_time_days: 5, moq: 5 },
    ];
    const purchaseOrders = [
      {
        po: 'PO-LATE-88',
        supplier: 'Precision Hydraulics',
        sku: 'PG-88',
        qty: 15,
        expected_date: new Date(asOf.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago!
        status: 'open',
      },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders,
      storeMessages: [],
      asOf,
    });

    const overdueIssue = result.allIssues.find((i) => i.sku === 'PG-88' && i.type === 'OVERDUE_PO');
    expect(overdueIssue).toBeDefined();
    expect(overdueIssue?.evidence.overdue_days).toBe(6);
  });

  it('7. Calm Empty State: Well-stocked, balanced inventory generates calm state, not false alarms', () => {
    const products = [
      { sku: 'OK-01', name: 'Standard Hose Clamp', machine_model: 'JCB 3DX', category: 'Hoses' },
      { sku: 'OK-02', name: 'Grease Nipple Pack', machine_model: 'Komatsu PC200', category: 'Valves' },
    ];
    // Both items have 14 days of stock (healthy cover), stable demand, normal lead times
    const inventory = [
      { sku: 'OK-01', location: 'Belgaum', stock: 28 }, // sells 2/day -> 14 days
      { sku: 'OK-02', location: 'Hubli', stock: 14 },    // sells 1/day -> 14 days
    ];
    const sales = [
      ...generateSales('OK-01', 'Belgaum', 2, 28),
      ...generateSales('OK-02', 'Hubli', 1, 28),
    ];
    const suppliers = [
      { supplier: 'General Spares Hub', sku: 'OK-01', price: 80, lead_time_days: 3, moq: 10 },
      { supplier: 'General Spares Hub', sku: 'OK-02', price: 40, lead_time_days: 2, moq: 10 },
    ];

    const result = runAgentLoop({
      products,
      inventory,
      sales,
      suppliers,
      purchaseOrders: [],
      storeMessages: [],
      asOf,
    });

    expect(result.allIssues.length).toBe(0);
    expect(result.top3Issues.length).toBe(0);
  });
});
