'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/components/AppContext';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Undo2,
  FileText,
  Truck,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { RejectModal } from '@/components/RejectModal';

export default function ApprovalsPage() {
  const { agentResult, runAgent, showToast, lastDecidedActionId, setLastDecidedActionId, undoLastAction } = useApp();
  const [actions, setActions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [rejectingAction, setRejectingAction] = useState<any | null>(null);

  // Fetch pending actions
  const fetchActions = async () => {
    try {
      const res = await fetch('/api/agent/actions?status=pending');
      const data = await res.json();
      if (Array.isArray(data)) {
        setActions(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchActions();
  }, [agentResult]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === actions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(actions.map((a) => a.id)));
    }
  };

  const handleSingleApprove = async (action: any) => {
    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          decision: 'approve',
          reason: 'Approved via Approval Queue',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Action approved: ${action.title}`, 'success');
      setLastDecidedActionId(action.id);
      await fetchActions();
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    let count = 0;
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch('/api/agent/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: id,
            decision: 'approve',
            reason: 'Bulk approved by Purchasing Head',
          }),
        });
        count++;
      }
      showToast(`Successfully authorized ${count} actions in bulk!`, 'success');
      setSelectedIds(new Set());
      await fetchActions();
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingAction) return;
    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: rejectingAction.id,
          decision: 'reject',
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Action rejected: ${rejectingAction.title}`, 'info');
      setLastDecidedActionId(rejectingAction.id);
      await fetchActions();
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900">Purchasing Authorization Queue</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Every operational action requires human approval before execution in simulated ERP.
          </p>
        </div>

        {/* Undo and Bulk Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {lastDecidedActionId && (
            <button
              onClick={undoLastAction}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo Last Action</span>
            </button>
          )}

          {actions.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0 || isLoading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bulk Approve Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Table or Empty State */}
      {actions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All actions up to date!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are no pending actions requiring authorization. Run the agent or check the Scenario Lab to evaluate alternate market shocks.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === actions.length && actions.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">
                Select All ({actions.length} Pending Actions)
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Authorizing updates simulated state & records to Audit Log
            </span>
          </div>

          {/* Action Items List */}
          <div className="divide-y divide-surface-200">
            {actions.map((act) => {
              let parsedPayload: any = {};
              try {
                parsedPayload = JSON.parse(act.payload);
              } catch {}

              const isSelected = selectedIds.has(act.id);

              return (
                <div
                  key={act.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected ? 'bg-brand-50/40' : 'hover:bg-surface-50'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(act.id)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer shrink-0"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-100 text-slate-700 border border-surface-200">
                          {act.type}
                        </span>
                        <span className="text-xs font-extrabold text-brand-700">{act.sku}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-bold text-slate-800">{act.location}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900">{act.title}</h4>
                      <p className="text-[11px] text-slate-600 leading-snug">{act.reason}</p>

                      {/* Payload specifics */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                        {parsedPayload.supplier && (
                          <span>
                            Supplier: <strong className="text-slate-800">{parsedPayload.supplier}</strong>
                          </span>
                        )}
                        {parsedPayload.from_location && (
                          <span>
                            From: <strong className="text-slate-800">{parsedPayload.from_location}</strong>
                          </span>
                        )}
                        {parsedPayload.qty && (
                          <span>
                            Quantity: <strong className="text-slate-800">{parsedPayload.qty} units</strong>
                          </span>
                        )}
                        {parsedPayload.total_cost && (
                          <span>
                            Total: <strong className="text-slate-900">₹{parsedPayload.total_cost.toLocaleString('en-IN')}</strong>
                          </span>
                        )}
                        {parsedPayload.extra_cost_flag && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {parsedPayload.extra_cost_flag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approve / Reject buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setRejectingAction(act)}
                      className="px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold border border-surface-200 transition-all min-h-[44px] flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleSingleApprove(act)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={!!rejectingAction}
        onClose={() => setRejectingAction(null)}
        onConfirmReject={handleConfirmReject}
        sku={rejectingAction?.sku || ''}
      />
    </div>
  );
}
