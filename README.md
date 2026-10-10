# Kaveri Desk — Agentic AI Supply-Chain Assistant
**Cypher 2026 Hackathon • Challenge 01: "The Spare Parts Desk"**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fprajwal473%2Fkaveri-desk)
[![GitHub](https://img.shields.io/badge/GitHub-prajwal473%2Fkaveri--desk-blue?logo=github)](https://github.com/prajwal473/kaveri-desk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> An autonomous supply-chain decision agent built for **Kaveri Spares & Hydraulics** across North Karnataka (Belgaum, Gokak, Hubli, Dharwad, Bagalkot, Vijayapura, Hubli Central WH, and Belgaum WH).

---

## 1. Problem Statement & Business Context
Every morning, **Ramesh Kulkarni**, Head of Purchasing at Kaveri Spares & Hydraulics, faces five disparate spreadsheets:
1. **On-hand store and warehouse inventory** (across 6 retail branches and 2 regional distribution hubs)
2. **90-day granular sales transaction history** (burn rates for heavy equipment spares: JCB 3DX, Tata Hitachi EX200, Komatsu PC200)
3. **Supplier pricing matrices, lead times, and MOQs**
4. **Open and overdue Purchase Orders**
5. **Real-time field signals from store WhatsApp messages** (local canal projects, delayed highway work, broken-down client machinery)

Instead of manually cross-referencing thousands of rows, Ramesh needs an agent that answers one fundamental question:
**"What supply-chain problems need my attention today, and what should I do about them?"**

**Kaveri Desk is not an ERP.** It is an autonomous decision intelligence agent that evaluates every stock risk, costs every replenishment alternative, highlights the **Top 3 things that matter today**, and stages drafted POs or stock transfers for 1-click human sign-off.

---

## 2. What "Agentic" Means (The 6-Stage Loop)
A chatbot that merely summarizes spreadsheets will fail in high-stakes spare parts supply chains. Kaveri Desk implements the complete autonomous agent loop:

```mermaid
flowchart TD
    subgraph Data Feeds
        A1[(Store Inventory)]
        A2[(90d Sales Logs)]
        A3[(Supplier Tariffs)]
        A4[(Open & Overdue POs)]
        A5[(Store WhatsApp Feed)]
    end

    subgraph Deterministic Engine
        B[1. OBSERVE<br/>Ingest 5 Feeds] --> C[2. REASON<br/>Demand Blending 7d/28d<br/>Days of Cover & Anomaly Detection]
        C --> D[3. EVALUATE<br/>Financial Trade-Offs:<br/>Transfer vs Express PO vs Economy PO vs Combo vs Wait]
        D --> E[4. DECIDE<br/>Optimize Lowest Expected Cost<br/>Rank Priorities & Flag Top 3]
        E --> F[5. ACT<br/>Draft Execution-Ready POs & Transfers]
        F --> G[6. EXPLAIN<br/>Plain-English Grounded Rationale]
    end

    subgraph LLM Layer [Google Gemini]
        H[Gemini 1.5 Pro/Flash] -.->|Tool Calling| C
        H -.->|Tool Calling| D
        H -.->|Natural Language Explanations| G
    end

    subgraph Human Authorization & Simulation
        F --> I{Human Decision<br/>Ramesh Kulkarni}
        I -->|Approve| J[Simulated State Update<br/>PO Inbound / Transfer In-Transit]
        I -->|Reject with Reason| K[Offer Engine Runner-Up Option]
        I -->|Undo| L[Revert State to Pending]
        J --> M[(Immutable Audit Log)]
        K --> M
        L --> M
    end

    Data Feeds --> B
```

1. **Observe**: Continuously ingests 5 operational feeds without human prompting.
2. **Reason**: Calculates 7d/28d blended demand burn rates, checks inbound PO timing, and detects 6 distinct issue categories.
3. **Evaluate**: Simulates every candidate path (`TRANSFER`, `PO_STANDARD`, `PO_FAST`, `COMBO`, `WAIT`) computing unit coverage, stockout gap days, lost sales gross margin, purchase cost, transport freight, and MOQ excess holding cost.
4. **Decide**: Mathematically selects the lowest total expected cost option, identifies the runner-up with an explicit rationale for why it lost, and prioritizes the **Top 3 critical actions**.
5. **Act**: Generates complete draft actions with filled payloads ready for authorization.
6. **Explain**: Formulates plain-English explanations citing exact inventory counts, run rates, lead times, and rupee amounts.

---

## 3. Planted Supply-Chain Scenarios
The database is pre-seeded with 60 SKUs (~52 noise SKUs + 8 planted needles):
1. **The Hero Case (Gokak HF-210)**: Hydraulic filter HF-210 at Gokak down to 8 units, burning ~4/day. Runs out in 2 days. Economy supplier *Shree Hydro* takes 7 days (₹420), causing a 5-day stockout (₹3,912 lost margin). Express supplier *Rapid Parts* delivers in 3 days (₹470). Transfer from Belgaum is infeasible due to low surplus. **Agent selects Rapid Parts, saving over ₹3,500 in lost customer gross profit.**
2. **Transfer Works (Hubli SK-45)**: Seal kit SK-45 at Hubli down to 2 units (1 day cover). Dharwad (20km away) holds 60 units selling slowly. **Agent selects inter-store transfer as fastest and cheapest.**
3. **Overdue PO (Hubli PG-88)**: PO expected 6 days ago is still open; receiving store will run out in 4 days. **Agent flags supplier escalation enquiry.**
4. **Slow-Moving / Dead Stock (Belgaum AF-300)**: Belgaum holds 300 units of heavy air/oil filters with < 0.2 sales/day (>200 days cover), locking up ₹1.2 Lakh. **Agent recommends reorder freeze and regional redistribution.**
5. **Demand Spike (Bagalkot OR-12)**: Sales surged 3.5x over last 5 days due to Upper Krishna canal excavation. **Agent alerts buffer deficit.**
6. **Supplier MOQ Trap (Bagalkot CV-99)**: Control valve CV-99 has a supplier with MOQ 500 (representing 2,500 days of supply!). **Agent routes order to alternative supplier.**
7. **Hidden Trap (Belgaum HS-105)**: Stock is only 4 units, but an open PO arrives in 2 days. **Agent correctly classifies as non-critical, preventing panic purchasing.**

---

## 4. Tech Stack & Architecture
- **Framework**: Next.js 14 App Router, TypeScript, React 18
- **Styling**: Tailwind CSS, Lucide React icons, Inter typography
- **ORM & Database**: Prisma ORM with SQLite for instant local dev / PostgreSQL for production
- **Reasoning Engine**: Pure deterministic TypeScript (`lib/engine/*`), 100% unit-tested with Vitest
- **LLM Layer**: Google Gemini API (`gemini-1.5-flash`) with function/tool calling and automatic fallback
- **Visuals**: Zero-dependency responsive SVG sparklines and stock-vs-time depletion charts
- **Deployment**: Docker multi-stage container, docker-compose (App + Postgres), GitHub Actions CI

---

## 5. Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### Local Quickstart (SQLite)
```bash
# 1. Clone repository
git clone https://github.com/kaveri-spares/kaveri-desk.git
cd kaveri-desk

# 2. Install dependencies
npm install

# 3. Initialize SQLite database & seed 60 SKUs
npx prisma db push
npm run db:seed

# 4. Run unit tests
npm test

# 5. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
# Database connection (SQLite for local, PostgreSQL for Neon/Supabase/RDS)
DATABASE_URL="file:./dev.db"

# Optional: Google Gemini API Key for conversational AI
# If omitted, Kaveri Desk uses its intelligent deterministic template engine
GEMINI_API_KEY=""

NODE_ENV="development"
PORT=3000
```

---

## 7. Running Unit Tests
Unit tests cover all 7 critical supply chain scenarios:
```bash
npm test
```
**Test Coverage Includes**:
- Hero Case (Gokak HF-210 run-out in ~2 days, Rapid Parts selection, cost premium flagged)
- Transfer Case (Hubli SK-45, Dharwad surplus donor)
- Supplier MOQ Trap (CV-99 excessive MOQ detection)
- Hidden Trap (Inbound PO arriving before stockout, zero false alarms)
- Demand Spike Detection (OR-12 3.5x surge)
- Overdue PO Escalation (PG-88 6 days late)
- Calm Empty State (Balanced network generates 0 false positives)

---

## 8. Production Deployment

### Option A: Docker & Docker Compose
```bash
# Launch PostgreSQL and Next.js app container
docker-compose up --build -d
```
The application will be live at `http://localhost:3000` with automated health check at `GET /api/health`.

### Option B: Vercel + Neon PostgreSQL
1. Create a serverless PostgreSQL database on [Neon.tech](https://neon.tech).
2. Set `DATABASE_URL` in your Vercel project environment settings.
3. In Prisma schema, change `provider = "postgresql"`.
4. Deploy on Vercel with automatic HTTPS. Build command: `npm run build`.

---

## 9. API Endpoints
- `GET /api/health` — Verifies server uptime, Node version, and database connectivity.
- `GET /api/agent/run` — Executes the 6-stage agent loop across North Karnataka.
- `GET /api/agent/issues` — Returns filtered list of detected supply chain issues.
- `POST /api/agent/actions` — Handles `approve`, `reject` (with reason and runner-up suggestion), and `undo`.
- `POST /api/chat` — Gemini function-calling assistant with read-only tools.
- `POST /api/scenario/update` — Injects live supply chain shocks, supplier delays, or judge presets.
- `POST /api/scenario/reset` — Resets demo database back to clean baseline.
- `POST /api/data/import` — Validates and imports custom CSV stock and sales feeds.

---

## 10. Responsive Viewport Verification
Kaveri Desk is built mobile-first and tested with Playwright on:
- **Mobile (360px × 740px)**: Bottom navigation, stacked cards, >= 44px tap targets, 0 horizontal overflow.
- **Tablet (768px × 1024px)**: Responsive two-column layout, compact charts.
- **Desktop (1280px × 800px)**: Collapsible sidebar, full options comparison tables, side-by-side evidence panels.

---

## License
MIT License. Built for Cypher 2026.
