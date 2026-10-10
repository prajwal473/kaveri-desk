'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Flame,
  CheckSquare,
  MessageSquare,
  FlaskConical,
  Database,
  History,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from './AppContext';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: Flame, badgeKey: 'top3' },
  { href: '/approvals', label: 'Approval Queue', icon: CheckSquare, badgeKey: 'pending' },
  { href: '/chat', label: 'Agent Chat', icon: MessageSquare },
  { href: '/scenario-lab', label: 'Scenario Lab', icon: FlaskConical },
  { href: '/data-explorer', label: 'Data Explorer', icon: Database },
  { href: '/audit-log', label: 'Audit Log', icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { agentResult } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 p-4 shrink-0 justify-between">
      <div className="space-y-6">
        {/* Hub Status Summary */}
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
            <span>NETWORK HEALTH</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>6 Stores • 2 Hubs</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {agentResult ? `${agentResult.totalIssues} issues active` : 'Evaluating network...'}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badgeKey === 'top3' && agentResult && agentResult.top3Issues.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                    {agentResult.top3Issues.length} Top
                  </span>
                )}

                {item.badgeKey === 'pending' && agentResult && agentResult.draftedActions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-200">
                    {agentResult.draftedActions.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">Cypher 2026 Hackathon</p>
        <p>Challenge 01: The Spare Parts Desk</p>
        <p className="text-[10px] text-slate-500">Autonomous Decision Agent</p>
      </div>
    </aside>
  );
}
