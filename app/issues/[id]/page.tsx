'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/components/AppContext';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  Truck,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { StockVsTimeProjection, DemandSparkline } from '@/components/Charts';
import { RejectModal } from '@/components/RejectModal';
import { EngineIssue, EvaluatedOption } from '@/lib/engine/types';

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { agentResult, runAgent, showToast, setLastDecidedActionId } = useApp();

  const [issue, setIssue] = useState<EngineIssue | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (agentResult && id) {
      const decodedId = decodeURIComponent(id).toLowerCase();
      const found = agentResult.allIssues.find(
        (i) => i.id.toLowerCase() === decodedId || i.sku.toLowerCase() === decodedId
      );
      if (found) setIssue(found);
    }
  }, [agentResult, id]);

  if (!issue) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-surface-200 text-slate-500 flex items-center justify-center mx-auto">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Issue not found or still loading</h3>
        <p className="text-xs text-slate-500">Checking agent evaluation records for ID: {id}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </Link>
      </div>
    );
  }

  const handleApprove = async () => {
    const action = issue.drafted_actions[0];
    setIsApproving(true);
    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action?.id,
          sku: issue.sku,
          location: issue.location,
          type: action?.type || 'PO_DRAFT',
          decision: 'approve',
          reason: `Approved recommendation: ${issue.chosen_option.name}`,
          payload: action?.payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');

      showToast(`Action approved! ${data.simulationResult?.message || ''}`, 'success');
      setLastDecidedActionId(data.action?.id || null);
      await runAgent();
      router.push('/approvals');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    const action = issue.drafted_actions[0];
    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action?.id,
          sku: issue.sku,
          location: issue.location,
          type: action?.type || 'PO_DRAFT',
          decision: 'reject',
          reason,
          payload: action?.payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');

      showToast(`Action rejected. Reason logged: "${reason}". Runner-up option ready.`, 'info');
      setLastDecidedActionId(data.action?.id || null);
      await runAgent();
      router.push('/');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Fast & standard suppliers from evidence
  const suppliers = issue.evidence.suppliers_available || [];
  const fastSup = [...suppliers].sort((a, b) => a.lead_time_days - b.lead_time_days)[0];
  const stdSup = [...suppliers].sort((a, b) => a.price - b.price)[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-surface-200 px-3 py-2 rounded-xl min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Reference:</span>
          <span className="text-xs font-mono bg-surface-100 px-2 py-1 rounded text-slate-700 font-semibold">
            {issue.id}
          </span>
        </div>
      </div>

      {/* Header Summary */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                {issue.location} Store
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600">Model: {issue.machine_model}</span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600">Category: {issue.category}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>{issue.sku}:</span>
              <span>{issue.sku_name}</span>
            </h2>
            <p className="text-sm font-medium text-slate-600">{issue.description}</p>
          </div>

          <div className="text-right shrink-0 bg-surface-50 p-3 rounded-xl border border-surface-200/80">
            <span className="text-xs text-slate-500 font-medium block">Total Value at Risk</span>
            <span className="text-xl font-extrabold text-slate-900">
              ₹{(issue.evidence.revenue_at_risk_rs || issue.evidence.cash_tied_up_rs || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Grounded Explanation Callout */}
        <div className="bg-brand-50/60 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-brand-900 uppercase tracking-wider">
              Agent Natural Language Rationale
            </span>
            <p className="text-xs text-brand-950 font-medium leading-relaxed">
              {issue.cached_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* 1. AGENT REASONING STEP TRAIL */}
      <section aria-labelledby="steptrail-heading" className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
        <h3 id="steptrail-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>Agent Autonomous Decision Trail</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            5 Stages Completed
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              step: '1. Observed',
              desc: `Stock: ${issue.evidence.stock}u at ${issue.location}. Sales rate: ${issue.evidence.daily_demand_rate}/day.`,
            },
            {
              step: '2. Reasoned',
              desc: `Cover: ${issue.evidence.days_of_cover} days. Stockout expected before standard supplier can deliver.`,
            },
            {
              step: '3. Compared',
              desc: `Simulated ${issue.options.length} options: Transfer vs Express PO vs Economy PO vs Combo vs Wait.`,
            },
            {
              step: '4. Decided',
              desc: `Selected ${issue.chosen_option.name} (Lowest total cost: ₹${issue.chosen_option.total_expected_cost.toLocaleString('en-IN')}).`,
            },
            {
              step: '5. Drafted',
              desc: `${issue.drafted_actions.length} action ready for approval in queue with filled payload.`,
            },
          ].map((s, idx) => (
            <div key={idx} className="bg-surface-50 border border-surface-200 rounded-xl p-3 space-y-1 relative">
              <span className="text-xs font-extrabold text-slate-800 block">{s.step}</span>
              <p className="text-[11px] text-slate-600 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. EVIDENCE PANEL & PROJECTION CHART */}
      <section aria-labelledby="evidence-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
          <h3 id="evidence-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Stockout Horizon & Supplier Arrival
          </h3>
          <StockVsTimeProjection
            stock={issue.evidence.stock}
            rate={issue.evidence.daily_demand_rate}
            daysOfCover={issue.evidence.days_of_cover}
            fastestLeadDays={fastSup?.lead_time_days || 3}
            standardLeadDays={stdSup?.lead_time_days || 7}
            fastestSupplierName={fastSup?.supplier || 'Express Supplier'}
            standardSupplierName={stdSup?.supplier || 'Standard Supplier'}
          />
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Telemetry & Field Evidence
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-surface-100">
                <span className="text-slate-500 font-medium">Daily Consumption Rate</span>
                <span className="font-bold text-slate-900">{issue.evidence.daily_demand_rate} units/day</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-100">
                <span className="text-slate-500 font-medium">Days of On-Hand Cover</span>
                <span className="font-bold text-rose-600">{issue.evidence.days_of_cover} days</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-100">
                <span className="text-slate-500 font-medium">Projected Stockout Date</span>
                <span className="font-bold text-slate-900">
                  {new Date(issue.evidence.stockout_date).toLocaleDateString()}
                </span>
              </div>

              {issue.evidence.store_messages && issue.evidence.store_messages.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-500 font-medium block mb-1">Store Dispatch Message:</span>
                  <div className="bg-amber-50 text-amber-900 p-2.5 rounded-lg border border-amber-200/80 text-[11px] italic">
                    "{issue.evidence.store_messages[0]}"
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-surface-200">
            <Link
              href={`/chat?q=Why+${encodeURIComponent(issue.chosen_option.supplier || issue.chosen_option.name)}+for+${encodeURIComponent(issue.sku)}%3F`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask AI Chat about this issue</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. OPTIONS COMPARISON TABLE */}
      <section aria-labelledby="options-heading" className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 id="options-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Operational Options Evaluated by Engine
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates feasibility, gap days, lost gross margin, and total expected cost
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {issue.options.length} Paths Costed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                <th className="p-3 font-semibold">Option Strategy</th>
                <th className="p-3 font-semibold">Gap Days</th>
                <th className="p-3 font-semibold">Lost Sales / Margin</th>
                <th className="p-3 font-semibold">Purchase / Transfer</th>
                <th className="p-3 font-semibold">Total Cost</th>
                <th className="p-3 font-semibold">Feasibility</th>
                <th className="p-3 font-semibold">Decision Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {issue.options.map((opt) => {
                const isChosen = opt.id === issue.chosen_option.id;
                const isRunnerUp = opt.id === issue.runner_up_option?.id;

                return (
                  <tr
                    key={opt.id}
                    className={`transition-colors ${
                      isChosen
                        ? 'bg-emerald-50/70 font-semibold text-emerald-950'
                        : isRunnerUp
                        ? 'bg-amber-50/40 text-slate-800'
                        : 'hover:bg-surface-50 text-slate-700'
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-xs">{opt.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{opt.description}</div>
                    </td>
                    <td className="p-3">
                      <span className={opt.gap_days > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {opt.gap_days} days
                      </span>
                    </td>
                    <td className="p-3">
                      <div>{opt.lost_sales_units} units</div>
                      <div className="text-[10px] text-slate-500">₹{opt.lost_margin_rs.toLocaleString('en-IN')}</div>
                    </td>
                    <td className="p-3">
                      <div>₹{(opt.purchase_cost + opt.transfer_cost).toLocaleString('en-IN')}</div>
                      {opt.premium_vs_cheapest > 0 && (
                        <div className="text-[10px] text-amber-700 font-semibold">
                          +₹{opt.premium_vs_cheapest} premium
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-bold">
                      ₹{opt.total_expected_cost.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      {opt.feasible ? (
                        <span className="text-emerald-700 font-bold">Feasible</span>
                      ) : (
                        <span className="text-slate-400 font-medium">Infeasible</span>
                      )}
                    </td>
                    <td className="p-3">
                      {isChosen ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-sm inline-block">
                          Recommended
                        </span>
                      ) : isRunnerUp ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold inline-block mb-1">
                            Runner-Up
                          </span>
                          <p className="text-[10px] text-amber-800 italic">{issue.runner_up_reason}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Rejected (Cost/Gap)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. DRAFTED ACTION PREVIEW & APPROVE/REJECT BUTTONS */}
      {issue.drafted_actions.length > 0 && (
        <section aria-labelledby="action-preview-heading" className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-400" />
                <h3 id="action-preview-heading" className="text-base font-extrabold tracking-tight">
                  Execution-Ready Draft Action
                </h3>
              </div>
              <p className="text-xs text-slate-400">Ready for Ramesh Kulkarni’s human approval sign-off</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-amber-300 border border-amber-400/30">
              Pending Authorization
            </span>
          </div>

          {/* Action Details Card */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Action Type & Title
                </span>
                <h4 className="text-sm font-bold text-white">{issue.drafted_actions[0].title}</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Estimated Outlay
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  ₹{issue.chosen_option.total_expected_cost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">Rationale: </span>
              {issue.drafted_actions[0].reason}
            </div>

            {/* Payload Breakdown */}
            <div className="bg-slate-950/70 rounded-lg p-3 font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
              <div>{JSON.stringify(issue.drafted_actions[0].payload, null, 2)}</div>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Link
              href={`/chat?q=What+if+Shree+Hydro+takes+10+days%3F`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask Agent What-If</span>
            </Link>

            <button
              onClick={() => setIsRejectModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-surface-800 hover:bg-rose-950/80 hover:text-rose-200 text-slate-300 text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 border border-slate-700"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject (Specify Reason)</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all min-h-[44px] flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproving ? 'Authorizing...' : 'Approve & Issue Action'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirmReject={handleRejectConfirm}
        runnerUpOption={issue.runner_up_option}
        sku={issue.sku}
      />
    </div>
  );
}
