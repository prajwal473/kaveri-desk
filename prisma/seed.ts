import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function createPrng(seed: number = 42) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export async function seedDatabase(asOfDate: Date = new Date()) {
  const prng = createPrng(1234567);
  const msPerDay = 24 * 60 * 60 * 1000;
  const asOfTime = asOfDate.getTime();

  console.log(`[Seed] Seeding Kaveri Desk database relative to ${asOfDate.toISOString().slice(0, 10)}...`);

  // Clear existing records
  await prisma.auditLog.deleteMany();
  await prisma.action.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.sales.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.storeMessage.deleteMany();
  await prisma.systemConfig.deleteMany();

  // Stores & Warehouses
  const stores = ['Belgaum', 'Gokak', 'Hubli', 'Dharwad', 'Bagalkot', 'Vijayapura'];
  const warehouses = ['Hubli Central WH', 'Belgaum WH'];
  const allLocations = [...stores, ...warehouses];

  // System Configurations
  await prisma.systemConfig.createMany({
    data: [
      { key: 'transfer_cost_per_unit', value: '15' },
      { key: 'transfer_days', value: '1' },
      { key: 'target_cover_days', value: '14' },
      { key: 'safety_days', value: '2' },
      { key: 'holding_cost_pct_per_month', value: '2.0' },
      {
        key: 'gross_margin_pct',
        value: JSON.stringify({
          Filters: 35,
          Seals: 45,
          'O-Rings': 50,
          Hoses: 40,
          Pumps: 30,
          Valves: 32,
          Couplings: 38,
          Cylinders: 28,
        }),
      },
    ],
  });

  // 1. Planted Scenarios SKUs
  const plantedProducts = [
    // Scenario 1: Hero case (HF-210)
    {
      sku: 'HF-210',
      name: 'Hydraulic Return Filter HF-210',
      machine_model: 'JCB 3DX',
      category: 'Filters',
    },
    // Scenario 2: Transfer works (SK-45)
    {
      sku: 'SK-45',
      name: 'Boom Cylinder Seal Kit SK-45',
      machine_model: 'Tata Hitachi EX200',
      category: 'Seals',
    },
    // Scenario 3: Overdue PO (PG-88)
    {
      sku: 'PG-88',
      name: 'Hydraulic Pump Drive Gear PG-88',
      machine_model: 'Komatsu PC200',
      category: 'Pumps',
    },
    // Scenario 4: Dead Stock (AF-300)
    {
      sku: 'AF-300',
      name: 'Heavy Air/Oil Separator Filter AF-300',
      machine_model: 'CAT 320D',
      category: 'Filters',
    },
    // Scenario 5: Demand Spike (OR-12) & Drop (CV-50)
    {
      sku: 'OR-12',
      name: 'High-Pressure Nitrile O-Ring Set OR-12',
      machine_model: 'JCB 3DX',
      category: 'O-Rings',
    },
    {
      sku: 'CV-50',
      name: 'Directional Control Valve Spool CV-50',
      machine_model: 'Kobelco SK210',
      category: 'Valves',
    },
    // Scenario 6: Bad Supplier Choice / MOQ Trap (CV-99)
    {
      sku: 'CV-99',
      name: 'Pilot Relief Valve Assembly CV-99',
      machine_model: 'Komatsu PC200',
      category: 'Valves',
    },
    // Scenario 7: Hidden-Trap Case (HS-105)
    {
      sku: 'HS-105',
      name: '4-Wire Spiral Hydraulic Hose 3/4" HS-105',
      machine_model: 'Tata Hitachi EX200',
      category: 'Hoses',
    },
  ];

  // Generate ~52 Noise SKUs (total 60)
  const categories = ['Filters', 'Seals', 'O-Rings', 'Hoses', 'Pumps', 'Valves', 'Couplings', 'Cylinders'];
  const machineModels = ['JCB 3DX', 'Tata Hitachi EX200', 'Komatsu PC200', 'CAT 320D', 'Kobelco SK210', 'Hyundai R210'];
  const noiseProducts = [];

  for (let i = 1; i <= 52; i++) {
    const cat = categories[i % categories.length];
    const machine = machineModels[i % machineModels.length];
    const prefix = cat.slice(0, 2).toUpperCase();
    const sku = `${prefix}-${100 + i}`;
    noiseProducts.push({
      sku,
      name: `${machine} OEM ${cat.slice(0, -1)} ${sku}`,
      machine_model: machine,
      category: cat,
    });
  }

  const allProducts = [...plantedProducts, ...noiseProducts];
  await prisma.product.createMany({ data: allProducts });
  console.log(`[Seed] Created ${allProducts.length} products.`);

  // 2. Suppliers Setup
  const suppliersData = [
    // Hero case suppliers
    { supplier: 'Shree Hydro Systems', sku: 'HF-210', price: 420, lead_time_days: 7, moq: 20 },
    { supplier: 'Rapid Parts Hubli', sku: 'HF-210', price: 470, lead_time_days: 3, moq: 20 },

    // Transfer case supplier
    { supplier: 'Kirloskar Fluidics', sku: 'SK-45', price: 650, lead_time_days: 8, moq: 25 },
    { supplier: 'Apex Seals Pune', sku: 'SK-45', price: 720, lead_time_days: 4, moq: 25 },

    // Overdue PO supplier
    { supplier: 'Precision Hydraulics Belgaum', sku: 'PG-88', price: 2400, lead_time_days: 5, moq: 5 },

    // Dead stock supplier
    { supplier: 'Global Filtration Tech', sku: 'AF-300', price: 400, lead_time_days: 10, moq: 50 },

    // Demand spike / drop suppliers
    { supplier: 'National Seals Bangalore', sku: 'OR-12', price: 150, lead_time_days: 5, moq: 40 },
    { supplier: 'Deccan Hydraulics', sku: 'CV-50', price: 1850, lead_time_days: 6, moq: 10 },

    // Bad supplier MOQ trap
    { supplier: 'Mega Forge Industrial', sku: 'CV-99', price: 1100, lead_time_days: 12, moq: 500 },
    { supplier: 'Sahyadri Precision Parts', sku: 'CV-99', price: 1250, lead_time_days: 4, moq: 20 },

    // Hidden trap supplier
    { supplier: 'Gates Fluid Power', sku: 'HS-105', price: 850, lead_time_days: 6, moq: 15 },
  ];

  // Supplier tariffs for noise SKUs
  const supplierNames = ['Canara Hydraulics', 'Belgaum Valve Works', 'Deccan O-Rings', 'Shree Hydro Systems', 'Western Spares Hub'];
  for (const p of noiseProducts) {
    const s1 = supplierNames[Math.floor(prng() * supplierNames.length)];
    const s2 = supplierNames[(Math.floor(prng() * supplierNames.length) + 1) % supplierNames.length];
    const basePrice = Math.round(200 + prng() * 1800);
    suppliersData.push({
      supplier: s1,
      sku: p.sku,
      price: basePrice,
      lead_time_days: Math.round(3 + prng() * 4),
      moq: Math.round(5 + prng() * 20),
    });
    if (s1 !== s2) {
      suppliersData.push({
        supplier: s2,
        sku: p.sku,
        price: Math.round(basePrice * 1.1),
        lead_time_days: Math.max(2, Math.round(2 + prng() * 2)),
        moq: Math.round(5 + prng() * 15),
      });
    }
  }

  await prisma.supplier.createMany({ data: suppliersData });
  console.log(`[Seed] Created ${suppliersData.length} supplier pricing contracts.`);

  // 3. Purchase Orders
  const purchaseOrdersData = [
    // Scenario 3: Overdue PO (6 days overdue)
    {
      po: 'PO-2026-0881',
      supplier: 'Precision Hydraulics Belgaum',
      sku: 'PG-88',
      qty: 15,
      expected_date: new Date(asOfTime - 6 * msPerDay),
      status: 'open',
    },
    // Scenario 7: Hidden-Trap PO arriving in 2 days (status open)
    {
      po: 'PO-2026-1052',
      supplier: 'Gates Fluid Power',
      sku: 'HS-105',
      qty: 40,
      expected_date: new Date(asOfTime + 2 * msPerDay),
      status: 'open',
    },
    // Historical POs
    {
      po: 'PO-2026-0710',
      supplier: 'Shree Hydro Systems',
      sku: 'HF-210',
      qty: 50,
      expected_date: new Date(asOfTime - 25 * msPerDay),
      status: 'received',
    },
    {
      po: 'PO-2026-0745',
      supplier: 'Apex Seals Pune',
      sku: 'SK-45',
      qty: 30,
      expected_date: new Date(asOfTime - 18 * msPerDay),
      status: 'received',
    },
  ];

  await prisma.purchaseOrder.createMany({ data: purchaseOrdersData });
  console.log(`[Seed] Created ${purchaseOrdersData.length} purchase orders.`);

  // 4. Inventory Setup
  const inventoryData: Array<{ sku: string; location: string; stock: number }> = [];

  // Scenario 1: Gokak HF-210 stock 8 (sells 4/day -> 2 days cover). Belgaum has 12 units (sells 1/day -> target 14 -> surplus <= 0).
  // Other stores have 1 unit (no surplus)
  for (const loc of allLocations) {
    if (loc === 'Gokak') inventoryData.push({ sku: 'HF-210', location: loc, stock: 8 });
    else if (loc === 'Belgaum') inventoryData.push({ sku: 'HF-210', location: loc, stock: 12 });
    else inventoryData.push({ sku: 'HF-210', location: loc, stock: 1 });
  }

  // Scenario 2: Hubli SK-45 stock 2 (sells 2/day -> 1 day cover). Dharwad has 60 units (sells 0.5/day -> massive surplus).
  for (const loc of allLocations) {
    if (loc === 'Hubli') inventoryData.push({ sku: 'SK-45', location: loc, stock: 2 });
    else if (loc === 'Dharwad') inventoryData.push({ sku: 'SK-45', location: loc, stock: 60 });
    else inventoryData.push({ sku: 'SK-45', location: loc, stock: 15 });
  }

  // Scenario 3: Hubli PG-88 stock 4 (sells 1/day -> runs out in 4 days).
  for (const loc of allLocations) {
    if (loc === 'Hubli') inventoryData.push({ sku: 'PG-88', location: loc, stock: 4 });
    else inventoryData.push({ sku: 'PG-88', location: loc, stock: 25 });
  }

  // Scenario 4: Belgaum AF-300 stock 300 (sells < 0.2/day -> 200+ days cover, ~1.2 Lakh tied up).
  for (const loc of allLocations) {
    if (loc === 'Belgaum') inventoryData.push({ sku: 'AF-300', location: loc, stock: 300 });
    else inventoryData.push({ sku: 'AF-300', location: loc, stock: 8 });
  }

  // Scenario 5: Bagalkot OR-12 stock 22 (demand spike, runs out fast). Vijayapura CV-50 stock 35 (demand drop).
  for (const loc of allLocations) {
    if (loc === 'Bagalkot') inventoryData.push({ sku: 'OR-12', location: loc, stock: 22 });
    else inventoryData.push({ sku: 'OR-12', location: loc, stock: 30 });
    if (loc === 'Vijayapura') inventoryData.push({ sku: 'CV-50', location: loc, stock: 35 });
    else inventoryData.push({ sku: 'CV-50', location: loc, stock: 25 });
  }

  // Scenario 6: Bagalkot CV-99 stock 3 (sells 0.3/day -> runs out in 10 days, MOQ 500!).
  for (const loc of allLocations) {
    if (loc === 'Bagalkot') inventoryData.push({ sku: 'CV-99', location: loc, stock: 3 });
    else inventoryData.push({ sku: 'CV-99', location: loc, stock: 25 });
  }

  // Scenario 7: Belgaum HS-105 stock 4 (sells 2/day -> looks low, but PO-2026-1052 arrives in 2 days).
  for (const loc of allLocations) {
    if (loc === 'Belgaum') inventoryData.push({ sku: 'HS-105', location: loc, stock: 4 });
    else inventoryData.push({ sku: 'HS-105', location: loc, stock: 25 });
  }

  // Fill in balanced stock for remaining noise SKUs
  for (const p of noiseProducts) {
    for (const loc of allLocations) {
      inventoryData.push({
        sku: p.sku,
        location: loc,
        stock: Math.round(28 + prng() * 20),
      });
    }
  }

  await prisma.inventory.createMany({ data: inventoryData });
  console.log(`[Seed] Created ${inventoryData.length} inventory records across 8 locations.`);

  // 5. Sales History Setup (90 days)
  console.log('[Seed] Generating 90-day sales history...');
  const salesData: Array<{
    date: Date;
    sku: string;
    location: string;
    qty_sold: number;
  }> = [];

  for (const p of allProducts) {
    for (const loc of allLocations) {
      let baseRate = 1.0 + Math.round(prng() * 2);

      if (p.sku === 'HF-210' && loc === 'Gokak') {
        baseRate = 4.0; // Hero case: sells 4/day
      } else if (p.sku === 'HF-210' && loc === 'Belgaum') {
        baseRate = 1.0;
      } else if (p.sku === 'HF-210') {
        baseRate = 0.1; // almost no sales at other branches
      } else if (p.sku === 'SK-45' && loc === 'Hubli') {
        baseRate = 2.0;
      } else if (p.sku === 'SK-45' && loc === 'Dharwad') {
        baseRate = 0.5;
      } else if (p.sku === 'PG-88' && loc === 'Hubli') {
        baseRate = 1.0;
      } else if (p.sku === 'AF-300' && loc === 'Belgaum') {
        baseRate = 0.15; // Dead stock: < 0.2/day
      } else if (p.sku === 'OR-12' && loc === 'Bagalkot') {
        baseRate = 2.0;
      } else if (p.sku === 'CV-50' && loc === 'Vijayapura') {
        baseRate = 2.0;
      } else if (p.sku === 'CV-99' && loc === 'Bagalkot') {
        baseRate = 0.3;
      } else if (p.sku === 'HS-105' && loc === 'Belgaum') {
        baseRate = 2.0;
      }

      // Generate 90 days of sales
      for (let day = 1; day <= 90; day++) {
        const saleDate = new Date(asOfTime - day * msPerDay);
        let dailyQty = Math.max(0, Math.round(baseRate + (prng() - 0.5) * 1.5));

        // Plant Spike: OR-12 at Bagalkot in last 5 days jumped 3.5x
        if (p.sku === 'OR-12' && loc === 'Bagalkot' && day <= 5) {
          dailyQty = Math.round(baseRate * 3.5 + prng());
        }

        // Plant Drop: CV-50 at Vijayapura in last 5 days dropped to 0
        if (p.sku === 'CV-50' && loc === 'Vijayapura' && day <= 5) {
          dailyQty = 0;
        }

        if (dailyQty > 0) {
          salesData.push({
            date: saleDate,
            sku: p.sku,
            location: loc,
            qty_sold: dailyQty,
          });
        }
      }
    }
  }

  // Batch insert sales
  const chunkSize = 2000;
  for (let i = 0; i < salesData.length; i += chunkSize) {
    const chunk = salesData.slice(i, i + chunkSize);
    await prisma.sales.createMany({ data: chunk });
  }
  console.log(`[Seed] Created ${salesData.length} historical sales entries.`);

  // 6. Store Messages
  const storeMessagesData = [
    {
      location: 'Gokak',
      message: 'Customer asking for HF-210 again, only 3 left on the shelf. JCB contractor waiting.',
      date: new Date(asOfTime - 1 * msPerDay),
    },
    {
      location: 'Dharwad',
      message: 'Lots of seal kits sitting unsold on back racks, warehouse space getting tight.',
      date: new Date(asOfTime - 2 * msPerDay),
    },
    {
      location: 'Bagalkot',
      message: 'Upper Krishna Project canal excavation started. High influx of JCB 3DX & Hitachi backhoes.',
      date: new Date(asOfTime - 3 * msPerDay),
    },
    {
      location: 'Vijayapura',
      message: 'Highway bypass work stalled due to monsoon permits. Spares demand quiet this week.',
      date: new Date(asOfTime - 4 * msPerDay),
    },
    {
      location: 'Belgaum',
      message: 'Warehouse manager reports AF-300 heavy filters haven’t moved in over 4 months.',
      date: new Date(asOfTime - 5 * msPerDay),
    },
  ];

  await prisma.storeMessage.createMany({ data: storeMessagesData });
  console.log(`[Seed] Created ${storeMessagesData.length} store messages.`);

  // 7. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      action_type: 'SYSTEM_INITIALIZATION',
      actor: 'System Admin',
      details: JSON.stringify({
        message: 'Kaveri Desk database seeded successfully with 60 SKUs and 7 planted supply-chain scenarios.',
        asOfDate: asOfDate.toISOString(),
      }),
    },
  });

  console.log('[Seed] Database initialization complete.');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
