'use client';

import React from 'react';
import { useApp } from './AppContext';
import { Check, Eye, Brain, Scale, Award, Send, FileText, Loader2 } from 'lucide-react';

const STEPS = [
  { name: 'Observe', desc: 'Ingesting 5 inventory feeds & store signals', icon: Eye },
  { name: 'Reason', desc: 'Blending 7d/28d burn rates & identifying risks', icon: Brain },
  { name: 'Evaluate', desc: 'Simulating options & financial cost trade-offs', icon: Scale },
  { name: 'Decide', desc: 'Optimizing lowest expected cost & Top 3 ranking', icon: Award },
  { name: 'Act', desc: 'Drafting execution-ready POs & transfer orders', icon: Send },
  { name: 'Explain', desc: 'Formulating human rationale for Ramesh Kulkarni', icon: FileText },
];

export function AgentRunModal() {
  const { isRunningAgent, activeStepIndex } = useApp();

  if (!isRunningAgent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-surface-900">Agentic Loop in Progress</h3>
            <p className="text-xs text-slate-500">Autonomous reasoning across North Karnataka network</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;

            return (
              <div
                key={step.name}
                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-brand-50/80 border border-brand-200 text-brand-900 shadow-sm'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-brand-600 text-white animate-pulse'
                      : 'bg-surface-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">{step.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-200/80 text-brand-800 font-semibold animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
