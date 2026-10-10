'use client';

import React from 'react';
import { useApp } from './AppContext';
import { Play, Sparkles, RefreshCw, UserCheck, Store, Calendar, ShieldCheck } from 'lucide-react';

const STORES = ['Belgaum', 'Gokak', 'Hubli', 'Dharwad', 'Bagalkot', 'Vijayapura'];

export function AppHeader() {
  const {
    role,
    setRole,
    selectedStore,
    setSelectedStore,
    asOfDate,
    setAsOfDate,
    isRunningAgent,
    runAgent,
  } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-surface-200 px-4 py-3 sm:px-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-surface-900">Kaveri Desk</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  Agentic AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Kaveri Spares & Hydraulics • North Karnataka
              </p>
            </div>
          </div>

          {/* Run button for mobile view */}
          <div className="lg:hidden">
            <button
              onClick={runAgent}
              disabled={isRunningAgent}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium shadow min-h-[44px] disabled:opacity-50"
              aria-label="Run AI Agent"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningAgent ? 'animate-spin' : ''}`} />
              <span>{isRunningAgent ? 'Running...' : 'Run Agent'}</span>
            </button>
          </div>
        </div>

        {/* Controls: Role, Location, As-Of Date, Run Agent */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          {/* Role Switcher */}
          <div className="flex items-center bg-surface-100 p-1 rounded-xl border border-surface-200">
            <button
              onClick={() => setRole('PURCHASING_HEAD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                role === 'PURCHASING_HEAD'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Purchasing Head (Ramesh)</span>
            </button>
            <button
              onClick={() => setRole('STORE_MANAGER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                role === 'STORE_MANAGER'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Store Manager</span>
            </button>
          </div>

          {/* Store Selection if Store Manager */}
          {role === 'STORE_MANAGER' && (
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="store-select" className="text-slate-500 font-medium hidden sm:inline">
                Store:
              </label>
              <select
                id="store-select"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-white border border-surface-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500 min-h-[40px]"
              >
                {STORES.map((s) => (
                  <option key={s} value={s}>
                    {s} Branch
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* As-Of Date Picker */}
          <div className="flex items-center gap-1.5 bg-surface-50 border border-surface-200 px-2.5 py-1 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium hidden sm:inline">As of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-semibold outline-none cursor-pointer"
            />
          </div>

          {/* Run Agent Desktop Button */}
          <button
            onClick={runAgent}
            disabled={isRunningAgent}
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all min-h-[44px] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningAgent ? 'animate-spin' : ''}`} />
            <span>{isRunningAgent ? 'Agent Running Loop...' : 'Run Agent'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
