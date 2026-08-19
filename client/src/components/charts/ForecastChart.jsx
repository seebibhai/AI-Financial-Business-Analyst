import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function formatCompact(n) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n;
}

/**
 * Merges historical + forecast series into one chart timeline, with a
 * shaded confidence band on the forecast portion only — historical
 * actuals never get an uncertainty band, since they're real numbers.
 */
export function ForecastChart({ historical, predictions, currency = 'PKR' }) {
  const merged = [
    ...historical.map((h) => ({ period: h.period, actual: h.value })),
    ...predictions.map((p) => ({ period: p.period, forecast: p.value, band: [p.lowerBound, p.upperBound] })),
  ];

  // stitch the line visually by carrying the last actual into the first forecast point
  if (historical.length && merged.length > historical.length) {
    merged[historical.length] = { ...merged[historical.length], actual: historical[historical.length - 1].value };
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={merged} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#E3E7EE" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#616F8C' }} axisLine={{ stroke: '#E3E7EE' }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#616F8C' }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(v, name) => [`${currency} ${Number(v).toLocaleString()}`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E3E7EE' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Area dataKey="band" fill="#C08A2E" fillOpacity={0.12} stroke="none" legendType="none" />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="#0E6E5F" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke="#C08A2E"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 3 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
