import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = { revenue: '#0E6E5F', expenses: '#B34630', profit: '#C08A2E' };

function formatCompact(n) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n;
}

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-ink-100 rounded-lg shadow-popover px-3.5 py-2.5 text-xs">
      <div className="font-medium text-ink-700 mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 figure text-ink-600">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize w-16">{p.dataKey}</span>
          <span className="font-medium">
            {currency} {Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueExpenseChart({ data, currency = 'PKR' }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#E3E7EE" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#616F8C' }} axisLine={{ stroke: '#E3E7EE' }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#616F8C' }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Bar dataKey="revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" fill={COLORS.expenses} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line type="monotone" dataKey="profit" stroke={COLORS.profit} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
