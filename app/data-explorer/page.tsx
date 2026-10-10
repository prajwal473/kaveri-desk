'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Building,
  Truck,
  ShoppingCart,
  MessageSquare,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useApp } from '@/components/AppContext';

const TABS = [
  { id: 'products', label: 'Products (60)', icon: Layers },
  { id: 'inventory', label: 'Inventory (480)', icon: Building },
  { id: 'suppliers', label: 'Suppliers (103)', icon: Truck },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'sales', label: 'Sales History', icon: FileSpreadsheet },
  { id: 'store-messages', label: 'Store Messages', icon: MessageSquare },
];

export default function DataExplorerPage() {
  const { showToast, runAgent } = useApp();
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<'inventory' | 'sales'>('inventory');
  const [csvText, setCsvText] = useState('');
  const [importReport, setImportReport] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data/${activeTab}?q=${encodeURIComponent(search)}&limit=100`);
      const result = await res.json();
      if (result.data) {
        setData(result.data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search]);

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setIsImporting(true);
    setImportReport(null);
    try {
      const res = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTable: importTarget,
          csvText,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setImportReport(result);
      showToast(`Imported ${result.importedCount} rows with ${result.errorCount} rejected errors.`, 'info');
      await fetchData();
      await runAgent();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-bold text-slate-900">Supply-Chain Data Explorer</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Explore live underlying databases powering the reasoning engine, or import batch CSV feeds.
          </p>
        </div>

        <button
          onClick={() => {
            setIsImportModalOpen(true);
            setImportReport(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all flex items-center gap-2 min-h-[44px]"
        >
          <Upload className="w-4 h-4" />
          <span>Import CSV Data</span>
        </button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-surface-100 p-1.5 rounded-2xl border border-surface-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] ${
                  isActive
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search in ${activeTab}...`}
            className="w-full bg-white border border-surface-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading catalog records...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No records found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. PRODUCTS TABLE */}
            {activeTab === 'products' && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                    <th className="p-3 font-semibold">SKU</th>
                    <th className="p-3 font-semibold">Product Description</th>
                    <th className="p-3 font-semibold">Machine Model</th>
                    <th className="p-3 font-semibold">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {data.map((p) => (
                    <tr key={p.sku} className="hover:bg-surface-50">
                      <td className="p-3 font-bold text-brand-700">{p.sku}</td>
                      <td className="p-3 font-medium text-slate-900">{p.name}</td>
                      <td className="p-3 text-slate-600">{p.machine_model}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-surface-100 text-slate-700 font-medium">
                          {p.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. INVENTORY TABLE */}
            {activeTab === 'inventory' && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                    <th className="p-3 font-semibold">SKU</th>
                    <th className="p-3 font-semibold">Location</th>
                    <th className="p-3 font-semibold">Stock On Hand</th>
                    <th className="p-3 font-semibold">Product Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {data.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-50">
                      <td className="p-3 font-bold text-brand-700">{inv.sku}</td>
                      <td className="p-3 font-semibold text-slate-900">{inv.location}</td>
                      <td className="p-3 font-bold text-slate-900">{inv.stock} units</td>
                      <td className="p-3 text-slate-600">{inv.product?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. SUPPLIERS TABLE */}
            {activeTab === 'suppliers' && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                    <th className="p-3 font-semibold">Supplier Name</th>
                    <th className="p-3 font-semibold">SKU</th>
                    <th className="p-3 font-semibold">Contract Price</th>
                    <th className="p-3 font-semibold">Lead Time (Days)</th>
                    <th className="p-3 font-semibold">MOQ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {data.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-50">
                      <td className="p-3 font-bold text-slate-900">{s.supplier}</td>
                      <td className="p-3 font-mono text-brand-700">{s.sku}</td>
                      <td className="p-3 font-bold text-slate-900">₹{s.price}</td>
                      <td className="p-3">{s.lead_time_days} days</td>
                      <td className="p-3">{s.moq} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. PURCHASE ORDERS TABLE */}
            {activeTab === 'purchase-orders' && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                    <th className="p-3 font-semibold">PO Number</th>
                    <th className="p-3 font-semibold">Supplier</th>
                    <th className="p-3 font-semibold">SKU</th>
                    <th className="p-3 font-semibold">Quantity</th>
                    <th className="p-3 font-semibold">Expected Date</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {data.map((po) => (
                    <tr key={po.po} className="hover:bg-surface-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{po.po}</td>
                      <td className="p-3 text-slate-800">{po.supplier}</td>
                      <td className="p-3 font-mono text-brand-700">{po.sku}</td>
                      <td className="p-3 font-bold">{po.qty} units</td>
                      <td className="p-3">{new Date(po.expected_date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            po.status === 'open'
                              ? 'bg-amber-100 text-amber-800'
                              : po.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. SALES TABLE */}
            {activeTab === 'sales' && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">SKU</th>
                    <th className="p-3 font-semibold">Branch Location</th>
                    <th className="p-3 font-semibold">Quantity Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {data.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-50">
                      <td className="p-3 text-slate-600">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-brand-700">{s.sku}</td>
                      <td className="p-3 text-slate-800">{s.location}</td>
                      <td className="p-3 font-bold text-slate-900">{s.qty_sold} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 6. STORE MESSAGES TABLE */}
            {activeTab === 'store-messages' && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-slate-500 bg-surface-50">
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Location</th>
                    <th className="p-3 font-semibold">Message Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {data.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-50">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(m.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{m.location}</td>
                      <td className="p-3 text-slate-700 italic">"{m.message}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900">Batch CSV Data Import</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadCsv} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Dataset:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="target"
                      value="inventory"
                      checked={importTarget === 'inventory'}
                      onChange={() => setImportTarget('inventory')}
                      className="text-brand-600"
                    />
                    <span>Inventory (sku, location, stock)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="target"
                      value="sales"
                      checked={importTarget === 'sales'}
                      onChange={() => setImportTarget('sales')}
                      className="text-brand-600"
                    />
                    <span>Sales History (date, sku, location, qty_sold)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Paste Raw CSV Data (Header + Data Rows):
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={
                    importTarget === 'inventory'
                      ? 'sku,location,stock\nHF-210,Gokak,15\nSK-45,Hubli,25'
                      : 'date,sku,location,qty_sold\n2026-10-09,HF-210,Gokak,5\n2026-10-09,SK-45,Hubli,3'
                  }
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-brand-500 h-36 resize-none"
                />
              </div>

              {/* Validation Error Report */}
              {importReport && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    importReport.errorCount > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {importReport.errorCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      Imported {importReport.importedCount} rows successfully. ({importReport.errorCount} rejected errors)
                    </span>
                  </div>

                  {importReport.errors && importReport.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      <span className="text-[10px] uppercase font-bold text-amber-800">Row Errors:</span>
                      {importReport.errors.map((err: any, idx: number) => (
                        <div key={idx} className="text-[11px] font-mono text-rose-700 bg-white/60 p-1.5 rounded">
                          Row {err.row}: {err.reason} ({err.line})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-surface-100 min-h-[44px]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvText.trim() || isImporting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 disabled:opacity-50 min-h-[44px]"
                >
                  {isImporting ? 'Validating...' : 'Validate & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
