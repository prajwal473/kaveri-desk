'use client';

import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function DemandSparkline({
  data = [3, 4, 3, 5, 4, 6, 4],
  color = '#1b64da',
  height = 40,
  width = 120,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data, 1);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 8) + 4;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${points} ${width - 4},${height} 4,${height}`;

  return (
    <div className="inline-block" aria-label={`Demand sparkline with values: ${data.join(', ')}`}>
      <svg width={width} height={height} className="overflow-visible">
        <polygon points={areaPoints} fill={color} fillOpacity="0.15" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((val, idx) => {
          const x = (idx / (data.length - 1)) * (width - 8) + 4;
          const y = height - 4 - ((val - min) / range) * (height - 8);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={idx === data.length - 1 ? 3 : 1.5}
              fill={idx === data.length - 1 ? color : '#ffffff'}
              stroke={color}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}

interface ProjectionProps {
  stock: number;
  rate: number;
  daysOfCover: number;
  fastestLeadDays?: number;
  standardLeadDays?: number;
  fastestSupplierName?: string;
  standardSupplierName?: string;
}

export function StockVsTimeProjection({
  stock,
  rate,
  daysOfCover,
  fastestLeadDays = 3,
  standardLeadDays = 7,
  fastestSupplierName = 'Express Supplier',
  standardSupplierName = 'Standard Supplier',
}: ProjectionProps) {
  const maxDays = Math.max(14, Math.ceil(standardLeadDays) + 2);
  const width = 480;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 35, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max stock for Y axis
  const maxY = Math.max(stock * 1.2, rate * maxDays * 0.8, 10);

  const getX = (day: number) => padding.left + (day / maxDays) * chartWidth;
  const getY = (qty: number) => padding.top + chartHeight - (Math.max(0, qty) / maxY) * chartHeight;

  // Depletion line points
  const stockoutDay = Math.min(daysOfCover, maxDays);
  const p0 = `${getX(0)},${getY(stock)}`;
  const pStockout = `${getX(stockoutDay)},${getY(0)}`;
  const pEnd = `${getX(maxDays)},${getY(0)}`;

  const depletionPath = `M ${p0} L ${pStockout} L ${pEnd}`;

  // Gap window between stockout and delivery
  const expressArrivalDay = Math.min(fastestLeadDays, maxDays);
  const standardArrivalDay = Math.min(standardLeadDays, maxDays);

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-inner">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Stock Depletion vs Supplier Replenishment Timeline
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
          Stockout in {daysOfCover}d
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[320px] font-sans text-[10px]"
          aria-label={`Stock depletion chart. Current stock ${stock} runs out in ${daysOfCover} days. ${fastestSupplierName} arrives day ${fastestLeadDays}, ${standardSupplierName} arrives day ${standardLeadDays}.`}
        >
          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={width - padding.right}
            y2={padding.top + chartHeight}
            stroke="#334155"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Depletion Area */}
          <path
            d={`M ${p0} L ${pStockout} L ${padding.left},${getY(0)} Z`}
            fill="#ef4444"
            fillOpacity="0.15"
          />

          {/* Depletion trajectory line */}
          <path
            d={depletionPath}
            fill="none"
            stroke="#f87171"
            strokeWidth="2.5"
            strokeDasharray={daysOfCover > maxDays ? 'none' : '4 2'}
          />

          {/* Stockout Point */}
          <circle cx={getX(stockoutDay)} cy={getY(0)} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <text
            x={getX(stockoutDay)}
            y={getY(0) + 16}
            fill="#f87171"
            textAnchor="middle"
            fontWeight="bold"
            fontSize="10"
          >
            Day {daysOfCover} (Stockout)
          </text>

          {/* Express Arrival Marker */}
          {expressArrivalDay <= maxDays && (
            <g>
              <line
                x1={getX(expressArrivalDay)}
                y1={padding.top}
                x2={getX(expressArrivalDay)}
                y2={padding.top + chartHeight}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle cx={getX(expressArrivalDay)} cy={padding.top + 8} r="3" fill="#38bdf8" />
              <text
                x={getX(expressArrivalDay)}
                y={padding.top - 5}
                fill="#38bdf8"
                textAnchor="middle"
                fontWeight="bold"
                fontSize="9"
              >
                {fastestSupplierName} (Day {fastestLeadDays})
              </text>
            </g>
          )}

          {/* Standard Supplier Arrival Marker */}
          {standardArrivalDay <= maxDays && (
            <g>
              <line
                x1={getX(standardArrivalDay)}
                y1={padding.top}
                x2={getX(standardArrivalDay)}
                y2={padding.top + chartHeight}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle cx={getX(standardArrivalDay)} cy={padding.top + 8} r="3" fill="#f59e0b" />
              <text
                x={getX(standardArrivalDay)}
                y={padding.top - 5}
                fill="#f59e0b"
                textAnchor="middle"
                fontWeight="bold"
                fontSize="9"
              >
                {standardSupplierName} (Day {standardLeadDays})
              </text>
            </g>
          )}

          {/* X Axis Labels */}
          <text x={getX(0)} y={height - 8} fill="#94a3b8" textAnchor="middle">
            Today
          </text>
          <text x={getX(7)} y={height - 8} fill="#94a3b8" textAnchor="middle">
            Day 7
          </text>
          <text x={getX(14)} y={height - 8} fill="#94a3b8" textAnchor="middle">
            Day 14
          </text>

          {/* Y Axis Labels */}
          <text x={padding.left - 6} y={getY(stock)} fill="#94a3b8" textAnchor="end">
            {stock}u
          </text>
          <text x={padding.left - 6} y={getY(0)} fill="#94a3b8" textAnchor="end">
            0
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
          <span>Burn Rate: {rate} units/day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
          <span>Express Delivery Lead</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          <span>Economy Supplier Lead</span>
        </div>
      </div>
    </div>
  );
}
