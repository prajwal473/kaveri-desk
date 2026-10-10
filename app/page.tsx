'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppContext';
import {
  AlertTriangle,
  Flame,
  ArrowRight,
  CheckCircle,
  XCircle,
  Truck,
  TrendingDown,
  TrendingUp,
  Clock,
  Layers,
  Filter,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { DemandSparkline } from '@/components/Charts';
import { RejectModal } from '@/components/RejectModal';
import { EngineIssue, EvaluatedOption } from '@/lib/engine/types';

export default function TodayScreen() {
  const { agentResult, isRunningAgent, runAgent, showToast, setLastDecidedActionId } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [rejectingIssue, setRejectingIssue] = useState<EngineIssue | null>(null);

  const issues = agentResult?.allIssues || [];
  const top3 = agentResult?.top3Issues || [];
  const otherIssues = issues.filter((i) => !i.is_top_3);

  // Filter chips logic
  const filteredOtherIssues = otherIssues.filter((i) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'STOCKOUT') return i.type === 'STOCKOUT_RISK';
    if (selectedFilter === 'SLOW_STOCK') return i.type === 'SLOW_MOVING';
    if (selectedFilter === 'OVERDUE_PO') return i.type === 'OVERDUE_PO';
    if (selectedFilter === 'SUPPLIER') return i.type === 'SUPPLIER_MISMATCH';
    if (selectedFilter === 'DEMAND') return i.type === 'DEMAND_ANOMALY';
    if (selectedFilter === 'IMBALANCE') return i.type === 'OVERSTOCK_IMBALANCE';
    return true;
  });

  const handleQuickApprove = async (issue: EngineIssue) => {
    const actionToApprove = issue.drafted_actions[0];
    if (!actionToApprove) return;

    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: actionToApprove.id,
          decision: 'approve',
          reason: `Approved recommendation: ${issue.chosen_option.name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve action');

      showToast(`Action approved! ${data.simulationResult?.message || ''}`, 'success');
      setLastDecidedActionId(data.action?.id || null);
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingIssue) return;
    const actionToReject = rejectingIssue.drafted_actions[0];
    if (!actionToReject) return;

    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: actionToReject.id,
          decision: 'reject',
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject action');

      showToast(`Action rejected. Reason recorded: "${reason}". Runner-up option ready.`, 'info');
      setLastDecidedActionId(data.action?.id || null);
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>High Severity</span>
        </span>
      );
    }
    if (severity === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Medium Severity</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <Layers className="w-3 h-3 text-slate-500" />
        <span>Low Severity</span>
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'STOCKOUT_RISK':
        return <Flame className="w-4 h-4 text-rose-600" />;
      case 'SLOW_MOVING':
        return <TrendingDown className="w-4 h-4 text-amber-600" />;
      case 'OVERDUE_PO':
        return <Clock className="w-4 h-4 text-rose-600" />;
      case 'DEMAND_ANOMALY':
        return <TrendingUp className="w-4 h-4 text-sky-600" />;
      case 'OVERSTOCK_IMBALANCE':
        return <Layers className="w-4 h-4 text-indigo-600" />;
      default:
        return <Truck className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Headline Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 rounded-2xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Sparkles className="w-64 h-64 text-brand-400" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Daily Briefing • Ramesh Kulkarni</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {issues.length} supply-chain issues need your attention today
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            <span className="font-bold text-emerald-400">
              ₹{(agentResult?.totalAtRiskRs || 0).toLocaleString('en-IN')}
            </span>{' '}
            in equipment downtime and working capital is at stake across North Karnataka. 
            The agent has analyzed all 5 operational feeds and costed optimal replenishment paths.
          </p>
        </div>
      </div>

      {/* 2. TOP 3 Issues (Hero Cards) */}
      <section aria-labelledby="top3-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 rounded bg-amber-500" />
            <h3 id="top3-heading" className="text-lg font-bold text-slate-900 tracking-tight">
              Top 3 Critical Priorities for Today
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Ranked by revenue risk & stockout velocity</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {top3.map((issue, idx) => (
            <div
              key={issue.id}
              className="bg-white rounded-2xl border-2 border-slate-200 hover:border-brand-500 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              {/* Badge Rank Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                    {getTypeIcon(issue.type)}
                    <span>{issue.location}</span>
                  </div>
                </div>
                {getSeverityBadge(issue.severity)}
              </div>

              {/* SKU & Problem */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-base font-extrabold text-brand-700">{issue.sku}</h4>
                  <span className="text-xs text-slate-500 font-medium truncate">{issue.sku_name}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                  {issue.title}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Model: {issue.machine_model} • Cat: {issue.category}
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-4 gap-1.5 bg-surface-50 border border-surface-200/80 rounded-xl p-2.5 mb-4 text-center">
                <div>
                  <span className="block text-[10px] text-slate-500 font-medium">Stock</span>
                  <span className="text-xs font-bold text-slate-900">{issue.evidence.stock}u</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-medium">Burn/Day</span>
                  <span className="text-xs font-bold text-slate-900">{issue.evidence.daily_demand_rate}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-medium">Cover</span>
                  <span
                    className={`text-xs font-extrabold ${
                      issue.evidence.days_of_cover <= 3 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {issue.evidence.days_of_cover > 900 ? '>120d' : `${issue.evidence.days_of_cover}d`}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-medium">At Risk</span>
                  <span className="text-xs font-bold text-slate-900">
                    ₹{((issue.evidence.revenue_at_risk_rs || issue.evidence.cash_tied_up_rs || 0) / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              {/* Agent Recommendation */}
              <div className="bg-brand-50/70 border border-brand-200/80 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-800 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  <span>Agent Recommendation:</span>
                </div>
                <p className="text-xs text-brand-950 font-semibold">{issue.chosen_option.name}</p>
                {issue.chosen_option.extra_cost_flag && (
                  <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                    {issue.chosen_option.extra_cost_flag}
                  </span>
                )}
              </div>

              {/* Action Buttons: Review / Approve / Reject */}
              <div className="pt-2 border-t border-surface-200 flex items-center justify-between gap-2">
                <Link
                  href={`/issues/${encodeURIComponent(issue.id)}`}
                  className="flex-1 text-center py-2 px-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1"
                >
                  <span>Review Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => handleQuickApprove(issue)}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                  title="Approve recommended action"
                  aria-label={`Approve action for ${issue.sku}`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setRejectingIssue(issue)}
                  className="p-2.5 rounded-xl bg-surface-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-surface-200"
                  title="Reject recommendation"
                  aria-label={`Reject action for ${issue.sku}`}
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Filter Chips & Other Issues */}
      <section aria-labelledby="other-issues-heading" className="space-y-4 pt-4 border-t border-surface-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 id="other-issues-heading" className="text-base font-bold text-slate-900">
              Other Monitored Issues ({filteredOtherIssues.length})
            </h3>
            <p className="text-xs text-slate-500">Filtered secondary risks and inventory imbalances</p>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Issue Filter Chips">
            {[
              { id: 'ALL', label: 'All Issues' },
              { id: 'STOCKOUT', label: 'Stock-out' },
              { id: 'SLOW_STOCK', label: 'Slow Stock' },
              { id: 'OVERDUE_PO', label: 'Overdue PO' },
              { id: 'SUPPLIER', label: 'Supplier' },
              { id: 'DEMAND', label: 'Demand Change' },
              { id: 'IMBALANCE', label: 'Imbalance' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedFilter(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  selectedFilter === chip.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-surface-200 hover:bg-surface-100'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Other Issues List */}
        {filteredOtherIssues.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-8 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No issues found in this category</h4>
            <p className="text-xs text-slate-500">Inventory positions and demand rates are stable.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOtherIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-white rounded-xl border border-surface-200 p-4 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1 md:max-w-md">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(issue.type)}
                    <span className="text-xs font-bold text-slate-900">{issue.location}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-extrabold text-brand-700">{issue.sku}</span>
                    {getSeverityBadge(issue.severity)}
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">{issue.title}</h4>
                  <p className="text-[11px] text-slate-500">{issue.description}</p>
                </div>

                {/* Numbers */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Stock / Cover</span>
                    <span>
                      {issue.evidence.stock}u (
                      {issue.evidence.days_of_cover > 900 ? '>120d' : `${issue.evidence.days_of_cover}d`})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Proposed Action</span>
                    <span className="text-brand-800 font-bold truncate max-w-[160px] inline-block">
                      {issue.chosen_option.name}
                    </span>
                  </div>
                </div>

                {/* Review link */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/issues/${encodeURIComponent(issue.id)}`}
                    className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-slate-800 text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleQuickApprove(issue)}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                    title="Approve"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reject Modal */}
      <RejectModal
        isOpen={!!rejectingIssue}
        onClose={() => setRejectingIssue(null)}
        onConfirmReject={handleConfirmReject}
        runnerUpOption={rejectingIssue?.runner_up_option}
        sku={rejectingIssue?.sku || ''}
      />
    </div>
  );
}
