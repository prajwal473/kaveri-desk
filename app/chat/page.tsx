'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Wrench,
  Table,
  CheckCircle,
  HelpCircle,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ToolExecution {
  name: string;
  args: any;
  result: any;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  source?: 'gemini' | 'engine_fallback';
  toolCalls?: ToolExecution[];
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  'What supply-chain problems need my attention today?',
  'Why Rapid Parts for HF-210 at Gokak?',
  'What if Shree Hydro takes 10 days instead of 7?',
  'What slow inventory is tying up cash across stores?',
  'Compare options for Seal Kit SK-45 at Hubli',
];

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Namaskara Ramesh! I am your Kaveri Desk decision agent. I continuously evaluate inventory, supplier tariffs, open POs, and store telemetry across our 6 North Karnataka stores and 2 warehouses. How can I assist your purchasing decisions today?',
      source: 'gemini',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Handle URL query parameter if opened from issue review
  useEffect(() => {
    if (initialQuery) {
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    const userMsg: MessageItem = {
      id: Math.random().toString(36).slice(2),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          messages: messages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch agent answer');

      const agentMsg: MessageItem = {
        id: Math.random().toString(36).slice(2),
        sender: 'agent',
        text: data.message,
        source: data.source,
        toolCalls: data.toolCallsExecuted,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: Math.random().toString(36).slice(2),
        sender: 'agent',
        text: `Error connecting to assistant: ${err.message}. Local engine remains active.`,
        source: 'engine_fallback',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const renderToolResultCard = (tool: ToolExecution, idx: number) => {
    return (
      <div key={idx} className="bg-slate-900 text-white rounded-xl p-3 border border-slate-800 text-xs my-2 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-brand-400 font-mono font-bold">
            <Wrench className="w-3.5 h-3.5" />
            <span>tool://{tool.name}()</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Grounded telemetry</span>
          </span>
        </div>

        <div className="overflow-x-auto text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg max-h-48">
          <pre>{JSON.stringify(tool.result, null, 2)}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-130px)] flex flex-col bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-surface-200 bg-surface-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Kaveri Desk Agent</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Gemini Tool-Calling Active
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">Autonomous function access to inventory, demand, and suppliers</p>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Grounded on pure numbers
        </span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'agent' && (
              <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-surface-50 border border-surface-200 text-slate-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="mt-3 pt-2 border-t border-surface-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Executed Function Tools ({m.toolCalls.length}):
                  </span>
                  {m.toolCalls.map((tc, idx) => renderToolResultCard(tc, idx))}
                </div>
              )}

              <div
                className={`flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] font-medium ${
                  m.sender === 'user' ? 'text-brand-100' : 'text-slate-500'
                }`}
              >
                <span>{m.timestamp}</span>
                {m.source && (
                  <span className="capitalize">
                    {m.source === 'gemini' ? 'Gemini 1.5' : 'Deterministic Engine'}
                  </span>
                )}
              </div>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-surface-100 rounded-2xl p-3.5 text-xs text-slate-600 flex items-center gap-2">
              <span className="animate-pulse font-medium">Agent is querying tool telemetry & evaluating options...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-surface-200 bg-surface-50/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          <span>Ask:</span>
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(prompt)}
            className="px-2.5 py-1 rounded-lg bg-white border border-surface-200 hover:border-brand-500 hover:text-brand-700 text-slate-700 text-[11px] font-medium whitespace-nowrap shadow-xs transition-all shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="p-3 bg-white border-t border-surface-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Ramesh's assistant: 'What if Shree Hydro takes 10 days?', 'Why Rapid Parts?'..."
          className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
        />

        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-1.5"
          aria-label="Send Message"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Kaveri Assistant...</div>}>
      <ChatContent />
    </Suspense>
  );
}
