import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function formatCompact(n) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n;
}

export function TrendLineChart({ data, dataKey, color = '#0E6E5F', currency = 'PKR' }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E3E7EE" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#616F8C' }} axisLine={{ stroke: '#E3E7EE' }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#616F8C' }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(v) => [`${currency} ${Number(v).toLocaleString()}`, dataKey]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
