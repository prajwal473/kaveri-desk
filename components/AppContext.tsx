'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AgentRunResult, EngineIssue } from '@/lib/engine/types';

export type UserRole = 'PURCHASING_HEAD' | 'STORE_MANAGER';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  role: UserRole;
  setRole: (r: UserRole) => void;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  asOfDate: string;
  setAsOfDate: (d: string) => void;
  agentResult: AgentRunResult | null;
  isRunningAgent: boolean;
  runAgent: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  lastDecidedActionId: string | null;
  setLastDecidedActionId: (id: string | null) => void;
  undoLastAction: () => Promise<void>;
  activeStepIndex: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('PURCHASING_HEAD');
  const [selectedStore, setSelectedStore] = useState<string>('Belgaum');
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastDecidedActionId, setLastDecidedActionId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const runAgent = async () => {
    setIsRunningAgent(true);
    setActiveStepIndex(0);

    // Simulate animated visual stepper progression
    const stepInterval = setInterval(() => {
      setActiveStepIndex((prev) => (prev < 5 ? prev + 1 : prev));
    }, 350);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asOf: asOfDate,
          role,
          userLocation: selectedStore,
        }),
      });

      clearInterval(stepInterval);
      setActiveStepIndex(5);

      if (!res.ok) throw new Error('Agent run failed');
      const data: AgentRunResult = await res.json();
      setAgentResult(data);
      showToast(`Agent completed run: ${data.totalIssues} issues evaluated, Top 3 prioritized.`, 'success');
    } catch (err: any) {
      clearInterval(stepInterval);
      showToast(err.message || 'Error running agent', 'error');
    } finally {
      setTimeout(() => {
        setIsRunningAgent(false);
      }, 600);
    }
  };

  const undoLastAction = async () => {
    try {
      const res = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'undo',
          actionId: lastDecidedActionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to undo action');

      showToast(`Action undone successfully! Reverted to pending.`, 'info');
      setLastDecidedActionId(null);
      // Re-run agent to refresh state
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Initial load
  useEffect(() => {
    runAgent();
  }, [role, selectedStore, asOfDate]);

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        selectedStore,
        setSelectedStore,
        asOfDate,
        setAsOfDate,
        agentResult,
        isRunningAgent,
        runAgent,
        toasts,
        showToast,
        lastDecidedActionId,
        setLastDecidedActionId,
        undoLastAction,
        activeStepIndex,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
