import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const PALETTE = ['#0E6E5F', '#C08A2E', '#B34630', '#3E4A63', '#5EAA96', '#D6A548', '#CB6C51', '#96A1B8'];

function CustomTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-ink-100 rounded-lg shadow-popover px-3.5 py-2.5 text-xs">
      <div className="font-medium text-ink-700">{d.name}</div>
      <div className="figure text-ink-600 mt-0.5">
        {currency} {Number(d.value).toLocaleString()} ({d.payload.percent}%)
      </div>
    </div>
  );
}

export function CategoryPieChart({ data, currency = 'PKR' }) {
  if (!data?.length) {
    return <div className="h-[240px] flex items-center justify-center text-sm text-ink-400">No category data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, lineHeight: '20px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
