# Kaveri Desk — Hackathon Demo Script (3 to 5 Minutes)
**Cypher 2026, Challenge 01: "The Spare Parts Desk"**  
**Presenter Persona**: Ramesh Kulkarni, Head of Purchasing at Kaveri Spares & Hydraulics (North Karnataka)

---

## Elevator Pitch (30 seconds)
> "Every morning across North Karnataka, 6 stores and 2 warehouses receive hundreds of contractors needing urgent hydraulic spares for excavators like JCB 3DX and Tata Hitachi EX200. Previously, I had to open five spreadsheets—inventory, 90-day sales, supplier quotes, open POs, and store WhatsApp messages.
>
> Today, I open **Kaveri Desk**. Kaveri Desk is an autonomous agent that runs the complete loop: **Observe -> Reason -> Evaluate -> Decide -> Act -> Explain**. It doesn't just summarize; it mathematically costs every replenishment path, highlights the **Top 3 things that matter today**, and stages draft POs and transfers ready for my 1-click authorization."

---

## Step 1: Open "Today" Screen & Walk Through Top 3 Priorities (1 minute)
1. **Show Headline Banner**:
   - Point out the active status: *"X supply-chain issues need your attention today, ₹Y at risk across North Karnataka."*
   - Mention role switcher: *"Right now I'm logged in as Purchasing Head, but store managers can switch roles to see only their branch's tasks."*
2. **Review Top 3 Priority Cards**:
   - **Card #1**: Boom Cylinder Seal Kit **SK-45 at Hubli** — runs out in ~1.1 days.
   - **Card #2**: Hydraulic Return Filter **HF-210 at Gokak** (the Hero Case) — runs out in ~2.2 days.
   - **Card #3**: Overdue PO or Supplier Constraint Trap **CV-99 / PG-88**.
   - Note the semantic icons, severity badges, and key numbers: on-hand stock, daily burn rate, days of cover, and estimated revenue/working capital at risk.

---

## Step 2: Deep Dive into the Hero Case (Gokak HF-210) (1 minute)
1. On the **HF-210 card**, click **"Review Details"** to open `/issues/issue-hf-210-gokak-stockout-risk`.
2. **Walk through the 5-Stage Agent Trail**:
   - **Observed**: 8 units at Gokak, daily burn rate is 3.6 units/day.
   - **Reasoned**: Stock runs out in 2.2 days. Standard supplier Shree Hydro takes 7 days to deliver, creating a catastrophic 5-day stockout gap.
   - **Compared**: Options costed by the engine:
     - *Inter-store Transfer*: Infeasible because Belgaum holds negligible surplus (only 12 units against 14 days safety cover).
     - *Standard PO (Shree Hydro)*: Economy price ₹420, but 7-day lead time causes 17 units of lost sales (₹3,912 in lost gross margin) and machine downtime. Total cost = ₹21,972.
     - *Express PO (Rapid Parts)*: Deliver in 3 days at ₹470/unit. Gap is reduced to under 1 day. Total cost = ₹12,954.
     - *Wait*: Causes ₹9,634 in lost sales margin.
   - **Decided**: Rapid Parts wins because paying the ₹1,300 express premium saves over ₹3,500 in lost customer gross margin!
   - **Drafted**: Complete draft PO staged with supplier tariff and extra cost flag.
3. **Show the Visual Projection Chart**:
   - Point to the stock depletion trajectory crossing zero at Day 2.2, contrasting Rapid Parts arriving at Day 3 versus Shree Hydro arriving at Day 7.

---

## Step 3: Approve the PO & Demonstrate Simulated State Change (45 seconds)
1. On the HF-210 detail page, click **"Approve & Issue Action"**.
2. Show the toast notification and immediate redirection to **Approval Queue**.
3. Point out:
   - The PO is recorded in the simulated database with status `approved` and inbound arrival date.
   - Navigate to **Audit Log** (`/audit-log`) to show the immutable governance entry:
     - Actor: `Ramesh Kulkarni (Purchasing Head)`
     - Action: `ACTION_APPROVED`
     - Exact timestamp, action payload, and simulation result.
4. Demonstrate the **"Undo Last Action"** button to prove reversible human oversight!

---

## Step 4: Scenario Lab — Live Market Shock Simulation (45 seconds)
1. Navigate to **Scenario Lab** (`/scenario-lab`).
2. Show the **Preset Buttons**:
   - Click **"Simulate Gokak Crisis"** (drops stock to 3 units, inflates supplier delay to 10 days) or **"Simulate Dharwad Transfer"**.
   - Watch the live indicator apply the mutation.
3. Click **"Re-Run Agent Live"**:
   - Watch the 6-stage animated progress modal (`Observe -> Reason -> Evaluate -> Decide -> Act -> Explain`).
   - Notice how priority scores and recommended action cards dynamically recalculate based on the new constraints!
4. Show the **"Reset Demo Baseline"** button to restore standard data with one click.

---

## Step 5: Ask the Agent Chat a What-If Question (45 seconds)
1. Navigate to **Agent Chat** (`/chat`).
2. Click the suggested prompt: **"What if Shree Hydro takes 10 days instead of 7?"** or type it in.
3. Show the response:
   - The agent calls `simulate_whatif({ sku: "HF-210", location: "Gokak", simulatedLeadTimeDays: 10 })`.
   - The tool execution card appears, showing the real engine data returned.
   - The assistant answers in plain, pragmatic terms:
     > *"If Shree Hydro takes 10 days, the stockout window expands to 8 full days, causing 32 units in lost sales (₹7,235 lost gross margin). Under this delay, relying on Shree Hydro is catastrophic—placing the express PO with Rapid Parts is strictly essential."*
4. Highlight that the agent **never hallucinates numbers**—every answer cites grounded engine data.

---

## Closing Summary (15 seconds)
> "Kaveri Desk demonstrates true agentic AI: pure deterministic mathematics under the hood for safety and reliability, governed by human-in-the-loop approvals, with an intuitive generative layer for natural interaction. Thank you!"
