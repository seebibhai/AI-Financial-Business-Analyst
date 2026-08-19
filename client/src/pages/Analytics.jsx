import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { RevenueExpenseChart } from '../components/charts/RevenueExpenseChart';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';

function currency(n, cur = 'PKR') {
  return `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'profit', label: 'Profit' },
];

export default function Analytics() {
  const { user } = useAuth();
  const [tab, setTab] = useState('revenue');
  const [range, setRange] = useState('quarter');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cur = user?.currency || 'PKR';

  useEffect(() => {
    setLoading(true);
    const fetcher = tab === 'revenue' ? analyticsService.revenue : tab === 'expenses' ? analyticsService.expenses : analyticsService.profit;
    fetcher({ preset: range })
      .then(setData)
      .finally(() => setLoading(false));
  }, [tab, range]);

  return (
    <DashboardLayout title="Analytics" range={range} onRangeChange={setRange}>
      <div className="flex gap-1 mb-6 bg-ink-100 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : tab === 'revenue' ? (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Revenue Over Time" subtitle={`Total: ${currency(data.total, cur)}`} />
            <TrendLineChart data={data.monthlySeries} dataKey="revenue" color="#0E6E5F" currency={cur} />
          </Card>
          <Card>
            <CardHeader title="Revenue by Category" />
            <CategoryPieChart data={data.byCategory} currency={cur} />
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title="Top Customers" />
            <TopEntityTable entities={data.topCustomers} currency={cur} label="Customer" />
          </Card>
        </div>
      ) : tab === 'expenses' ? (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Expenses Over Time" subtitle={`Total: ${currency(data.total, cur)}`} />
            <TrendLineChart data={data.monthlySeries} dataKey="expenses" color="#B34630" currency={cur} />
          </Card>
          <Card>
            <CardHeader title="Expense Categories" />
            <CategoryPieChart data={data.byCategory} currency={cur} />
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title="Top Vendors" />
            <TopEntityTable entities={data.topVendors} currency={cur} label="Vendor" />
          </Card>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue', value: data.revenue },
              { label: 'Expenses', value: data.expenses },
              { label: 'Profit', value: data.profit, accent: true },
              { label: 'Margin', value: `${data.margin}%`, isPercent: true },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <div className="text-xs text-ink-400 uppercase tracking-wide mb-1.5">{s.label}</div>
                <div className={`figure text-xl font-medium ${s.accent ? 'text-ledger-600' : 'text-ink-900'}`}>
                  {s.isPercent ? s.value : currency(s.value, cur)}
                </div>
              </Card>
            ))}
          </div>
          <Card className="lg:col-span-3">
            <CardHeader title="Revenue vs Expenses vs Profit" />
            <RevenueExpenseChart data={data.monthlySeries} currency={cur} />
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

function TopEntityTable({ entities, currency: cur, label }) {
  if (!entities?.length) return <p className="text-sm text-ink-400">No data for the selected period.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-400 uppercase tracking-wide border-b border-ink-100">
          <th className="py-2">{label}</th>
          <th className="py-2 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {entities.map((e) => (
          <tr key={e.name} className="border-b border-ink-50">
            <td className="py-2.5 text-ink-700">{e.name}</td>
            <td className="py-2.5 text-right figure font-medium text-ink-900">
              {cur} {e.amount.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
