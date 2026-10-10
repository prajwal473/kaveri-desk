'use client';

import React from 'react';
import { useApp } from './AppContext';
import { CheckCircle2, AlertCircle, Info, Undo2 } from 'lucide-react';

export function ToastContainer() {
  const { toasts, lastDecidedActionId, undoLastAction } = useApp();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border text-xs font-medium animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-brand-900 text-white border-brand-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
          )}

          <div className="flex-1">
            <p className="leading-snug">{toast.message}</p>
            {lastDecidedActionId && toast.type === 'success' && (
              <button
                onClick={undoLastAction}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline decoration-dotted"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo this action</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
