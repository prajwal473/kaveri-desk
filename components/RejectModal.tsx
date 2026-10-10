'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { EvaluatedOption } from '@/lib/engine/types';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (reason: string) => Promise<void>;
  runnerUpOption?: EvaluatedOption | null;
  sku: string;
}

const COMMON_REASONS = [
  'Supplier pricing premium too high',
  'Prefer waiting for incoming transfer or open PO',
  'Customer cancelled machine maintenance schedule',
  'Internal budget lock for this month',
  'Alternate local unlisted supplier identified',
];

export function RejectModal({
  isOpen,
  onClose,
  onConfirmReject,
  runnerUpOption,
  sku,
}: RejectModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    try {
      await onConfirmReject(finalReason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <AlertTriangle className="w-5 h-5" />
            <span>Reject Recommended Action ({sku})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Reason for Rejection:
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-brand-500 min-h-[44px]"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="Custom">Other (type below)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Additional Notes / Custom Reason:
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g. Discussed with store manager; will hold off till next Tuesday..."
              className="w-full bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 resize-none h-20"
            />
          </div>

          {runnerUpOption && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                Next Best Alternative (Runner-Up)
              </span>
              <p className="text-xs font-semibold text-amber-900">{runnerUpOption.name}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{runnerUpOption.description}</p>
              <p className="text-[11px] text-amber-800 font-bold mt-1">
                Total Financial Cost: ₹{runnerUpOption.total_expected_cost.toLocaleString('en-IN')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-surface-100 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
