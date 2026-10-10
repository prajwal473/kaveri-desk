'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/AppContext';
import {
  FlaskConical,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Sliders,
  TrendingUp,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function ScenarioLabPage() {
  const { runAgent, showToast, isRunningAgent } = useApp();

  // Preset loading state
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Manual tweak forms
  const [stockSku, setStockSku] = useState('HF-210');
  const [stockLocation, setStockLocation] = useState('Gokak');
  const [stockQty, setStockQty] = useState('5');

  const [spikeSku, setSpikeSku] = useState('OR-12');
  const [spikeLocation, setSpikeLocation] = useState('Bagalkot');
  const [spikeMultiplier, setSpikeMultiplier] = useState('3.5');

  const [supSupplier, setSupSupplier] = useState('Shree Hydro Systems');
  const [supSku, setSupSku] = useState('HF-210');
  const [supLeadDays, setSupLeadDays] = useState('10');
  const [supPrice, setSupPrice] = useState('420');

  const [poId, setPoId] = useState('PO-2026-0881');
  const [delayDays, setDelayDays] = useState('8');

  // Apply Presets
  const handleApplyPreset = async (presetId: string, title: string) => {
    setActivePreset(presetId);
    try {
      const res = await fetch('/api/scenario/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLY_PRESET',
          params: { presetId },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Applied preset: ${title}. Re-running agent...`, 'success');
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActivePreset(null);
    }
  };

  // Reset Demo Data
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/scenario/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Demo data completely reset to standard seed baseline!', 'success');
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Manual update helpers
  const handleUpdateStock = async () => {
    try {
      const res = await fetch('/api/scenario/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_STOCK',
          params: { sku: stockSku, location: stockLocation, stock: stockQty },
        }),
      });
      if (!res.ok) throw new Error('Failed to update stock');
      showToast(`Updated stock for ${stockSku} at ${stockLocation} to ${stockQty}`, 'success');
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddSpike = async () => {
    try {
      const res = await fetch('/api/scenario/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_SALES_SPIKE',
          params: { sku: spikeSku, location: spikeLocation, multiplier: spikeMultiplier },
        }),
      });
      if (!res.ok) throw new Error('Failed to add sales spike');
      showToast(`Injected ${spikeMultiplier}x demand spike for ${spikeSku} at ${spikeLocation}`, 'success');
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateSupplier = async () => {
    try {
      const res = await fetch('/api/scenario/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SUPPLIER',
          params: { supplier: supSupplier, sku: supSku, lead_time_days: supLeadDays, price: supPrice },
        }),
      });
      if (!res.ok) throw new Error('Failed to update supplier');
      showToast(`Updated ${supSupplier} lead time to ${supLeadDays} days, price ₹${supPrice}`, 'success');
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkPoLate = async () => {
    try {
      const res = await fetch('/api/scenario/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_PO_LATE',
          params: { po: poId, delayDays },
        }),
      });
      if (!res.ok) throw new Error('Failed to delay PO');
      showToast(`Marked ${poId} delayed by ${delayDays} days`, 'success');
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900">Scenario Simulation Lab</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-xl">
            Stress-test the agent with real-time supply chain shocks, supplier price hikes, and logistics disruptions.
            Watch recommendations and priority rankings update dynamically.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold border border-surface-200 transition-all flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Baseline</span>
          </button>

          <button
            onClick={runAgent}
            disabled={isRunningAgent}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningAgent ? 'animate-spin' : ''}`} />
            <span>Re-Run Agent Live</span>
          </button>
        </div>
      </div>

      {/* 3 ONE-CLICK PRESET SCENARIOS */}
      <section aria-labelledby="presets-heading" className="space-y-3">
        <h3 id="presets-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span>One-Click Hackathon Judge Presets</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preset 1 */}
          <div className="bg-white rounded-2xl border-2 border-surface-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-brand-500 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Preset 1: Supplier Lead Spike
              </span>
              <h4 className="text-sm font-bold text-slate-900">Gokak HF-210 Crisis</h4>
              <p className="text-xs text-slate-600">
                Gokak stock drops to 3 units while standard supplier Shree Hydro suffers a delay to 10 days lead time.
              </p>
            </div>
            <button
              onClick={() => handleApplyPreset('preset-gokak-crisis', 'Gokak Crisis')}
              disabled={activePreset === 'preset-gokak-crisis'}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold transition-all min-h-[44px]"
            >
              {activePreset === 'preset-gokak-crisis' ? 'Injecting...' : 'Simulate Gokak Crisis'}
            </button>
          </div>

          {/* Preset 2 */}
          <div className="bg-white rounded-2xl border-2 border-surface-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-brand-500 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Preset 2: Regional Rebalance
              </span>
              <h4 className="text-sm font-bold text-slate-900">Dharwad Surplus Surge</h4>
              <p className="text-xs text-slate-600">
                Depletes Hubli seal kits to 1 unit and loads Dharwad with 90 surplus units to verify inter-store transfer.
              </p>
            </div>
            <button
              onClick={() => handleApplyPreset('preset-dharwad-surplus', 'Dharwad Surplus')}
              disabled={activePreset === 'preset-dharwad-surplus'}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold transition-all min-h-[44px]"
            >
              {activePreset === 'preset-dharwad-surplus' ? 'Injecting...' : 'Simulate Dharwad Transfer'}
            </button>
          </div>

          {/* Preset 3 */}
          <div className="bg-white rounded-2xl border-2 border-surface-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-brand-500 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Preset 3: Local Infra Project
              </span>
              <h4 className="text-sm font-bold text-slate-900">Bagalkot Canal Demand Surge</h4>
              <p className="text-xs text-slate-600">
                Upper Krishna canal project deploys 30 excavators. O-ring consumption spikes 3.5x over 5 days.
              </p>
            </div>
            <button
              onClick={() => handleApplyPreset('preset-bagalkot-canal', 'Bagalkot Canal Spike')}
              disabled={activePreset === 'preset-bagalkot-canal'}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold transition-all min-h-[44px]"
            >
              {activePreset === 'preset-bagalkot-canal' ? 'Injecting...' : 'Simulate Bagalkot Spike'}
            </button>
          </div>
        </div>
      </section>

      {/* MANUAL WHAT-IF INJECTION CONTROLS */}
      <section aria-labelledby="manual-heading" className="space-y-4 pt-4 border-t border-surface-200">
        <h3 id="manual-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-600" />
          <span>Interactive Variable Overrides</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Edit Stock */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <Package className="w-4 h-4 text-brand-600" />
              <span>Override Branch Inventory Count</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={stockSku}
                onChange={(e) => setStockSku(e.target.value)}
                placeholder="SKU"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
              <select
                value={stockLocation}
                onChange={(e) => setStockLocation(e.target.value)}
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              >
                {['Belgaum', 'Gokak', 'Hubli', 'Dharwad', 'Bagalkot', 'Vijayapura', 'Hubli Central WH', 'Belgaum WH'].map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="New Stock"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <button
              onClick={handleUpdateStock}
              className="w-full py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold transition-all min-h-[44px]"
            >
              Update Stock & Re-Evaluate
            </button>
          </div>

          {/* 2. Add Demand Surge */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Inject Real-Time Demand Shock</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={spikeSku}
                onChange={(e) => setSpikeSku(e.target.value)}
                placeholder="SKU"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
              <select
                value={spikeLocation}
                onChange={(e) => setSpikeLocation(e.target.value)}
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              >
                {['Belgaum', 'Gokak', 'Hubli', 'Dharwad', 'Bagalkot', 'Vijayapura'].map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.5"
                value={spikeMultiplier}
                onChange={(e) => setSpikeMultiplier(e.target.value)}
                placeholder="Multiplier (e.g. 3.5x)"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <button
              onClick={handleAddSpike}
              className="w-full py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold transition-all min-h-[44px]"
            >
              Inject Demand Surge & Re-Evaluate
            </button>
          </div>

          {/* 3. Modify Supplier Contract */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Adjust Supplier Lead Time & Price</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={supSupplier}
                onChange={(e) => setSupSupplier(e.target.value)}
                placeholder="Supplier Name"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
              <input
                type="text"
                value={supSku}
                onChange={(e) => setSupSku(e.target.value)}
                placeholder="SKU"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
              <input
                type="number"
                value={supLeadDays}
                onChange={(e) => setSupLeadDays(e.target.value)}
                placeholder="Lead Days"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
              <input
                type="number"
                value={supPrice}
                onChange={(e) => setSupPrice(e.target.value)}
                placeholder="Price (Rs)"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <button
              onClick={handleUpdateSupplier}
              className="w-full py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold transition-all min-h-[44px]"
            >
              Update Supplier Tariff
            </button>
          </div>

          {/* 4. Mark PO Late */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Simulate Vendor PO Delay</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                placeholder="PO Number"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
              <input
                type="number"
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
                placeholder="Delay (Days)"
                className="bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
            <button
              onClick={handleMarkPoLate}
              className="w-full py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold transition-all min-h-[44px]"
            >
              Mark PO Overdue & Trigger Escalation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
