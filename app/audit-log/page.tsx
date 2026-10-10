'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Undo2,
  Play,
  RotateCcw,
  Upload,
  User,
  Clock,
  Filter,
} from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterType === 'ALL' ? '/api/audit-log' : `/api/audit-log?type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'ACTION_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Action Approved</span>
          </span>
        );
      case 'ACTION_REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Action Rejected</span>
          </span>
        );
      case 'ACTION_UNDONE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Undo2 className="w-3 h-3 text-amber-600" />
            <span>Action Undone</span>
          </span>
        );
      case 'AGENT_RUN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-800">
            <Play className="w-3 h-3 text-brand-600" />
            <span>Agent Run</span>
          </span>
        );
      case 'SCENARIO_RESET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            <RotateCcw className="w-3 h-3 text-slate-600" />
            <span>Scenario Reset</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-100 text-slate-700">
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900">Governance & Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Immutable log of every autonomous agent run, human approval decision, rejection reason, and state simulation.
          </p>
        </div>

        {/* Filter select */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-surface-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 min-h-[44px]"
          >
            <option value="ALL">All Event Types</option>
            <option value="ACTION_APPROVED">Approvals Only</option>
            <option value="ACTION_REJECTED">Rejections Only</option>
            <option value="ACTION_UNDONE">Undone Actions</option>
            <option value="AGENT_RUN">Agent Runs</option>
            <option value="DATA_IMPORT">Data Imports</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading audit timeline...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No audit events found.</div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-200">
            {logs.map((log) => {
              let details: any = {};
              try {
                details = JSON.parse(log.details);
              } catch {}

              return (
                <div key={log.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-brand-500 group-hover:scale-125 transition-transform" />

                  <div className="bg-surface-50 hover:bg-white rounded-xl border border-surface-200 p-4 transition-all shadow-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action_type)}
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.actor}</span>
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </span>
                    </div>

                    {/* Formatted Detail Output */}
                    <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-surface-200/80 font-mono text-[11px] leading-relaxed">
                      {details.message ? (
                        <p className="font-sans font-medium text-slate-800">{details.message}</p>
                      ) : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
