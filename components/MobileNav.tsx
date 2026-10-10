'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, CheckSquare, MessageSquare, FlaskConical, Database, History } from 'lucide-react';
import { useApp } from './AppContext';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: Flame },
  { href: '/approvals', label: 'Approve', icon: CheckSquare },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/scenario-lab', label: 'Lab', icon: FlaskConical },
  { href: '/data-explorer', label: 'Data', icon: Database },
  { href: '/audit-log', label: 'Audit', icon: History },
];

export function MobileNav() {
  const pathname = usePathname();
  const { agentResult } = useApp();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-200 px-1 py-1 shadow-lg"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-6 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-medium transition-all min-h-[48px] relative ${
                isActive ? 'text-brand-600 font-bold bg-brand-50/60' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-brand-600 stroke-[2.5]' : 'text-slate-500'}`} />
              <span className="truncate max-w-full text-center leading-tight">{item.label}</span>

              {item.href === '/approvals' && agentResult && agentResult.draftedActions.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-brand-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
