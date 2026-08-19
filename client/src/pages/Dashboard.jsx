import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, UploadCloud, Send, ArrowRight } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader, SkeletonCard, Skeleton } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Badge';
import { RevenueExpenseChart } from '../components/charts/RevenueExpenseChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';

function currency(n, cur = 'PKR') {
  const sign = n < 0 ? '-' : '';
  return `${sign}${cur} ${Math.abs(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState('this_month');
  const [data, setData] = useState(null);
  const [expenseCats, setExpenseCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      analyticsService.overview({ preset: range }),
      analyticsService.categories({ preset: range }),
    ])
      .then(([overview, cats]) => {
        if (cancelled) return;
        setData(overview);
        setExpenseCats(cats.expenseCategories);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const cur = user?.currency || 'PKR';
  const hasData = data && data.current.transactionCount > 0;

  const handleAsk = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    navigate('/ai-analyst', { state: { initialQuestion: question } });
  };

  return (
    <DashboardLayout title="Dashboard" range={range} onRangeChange={setRange}>
      {error && (
        <div className="mb-5 bg-brick-50 text-brick-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !hasData ? (
        <Card>
          <EmptyState
            icon={UploadCloud}
            title="No data for this period yet"
            description="Upload a CSV or Excel file to start seeing revenue, expenses, and AI-generated insights."
            action={
              <button onClick={() => navigate('/upload')} className="btn-primary">
                Upload Data <ArrowRight size={15} />
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenue" value={currency(data.current.revenue, cur)} growth={data.growth.revenueGrowth} growthSense="positive" />
            <StatCard label="Expenses" value={currency(data.current.expenses, cur)} growth={data.growth.expenseGrowth} growthSense="negative" />
            <StatCard label="Profit" value={currency(data.current.profit, cur)} growth={data.growth.profitGrowth} growthSense="positive" />
            <StatCard label="Margin" value={`${data.current.margin}%`} hint={`${data.current.transactionCount} transactions`} />
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Revenue vs Expenses" subtitle="Monthly, based on uploaded data" />
              {data.monthlySeries.length ? (
                <RevenueExpenseChart data={data.monthlySeries} currency={cur} />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-ink-400">
                  Not enough monthly data yet
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Expense Categories" subtitle="Selected period" />
              <CategoryPieChart data={expenseCats} currency={cur} />
            </Card>
          </div>

          <Card>
            <CardHeader
              title="AI Business Insights"
              subtitle="Generated from calculated metrics, not guesses"
              action={<Badge tone="info" dot>Evidence-based</Badge>}
            />
            <div className="space-y-3">
              {data.insights.map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-3.5 rounded-lg bg-ink-50/60 border border-ink-100">
                  <Sparkles size={15} className="text-gold-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-ink-700 leading-relaxed">{insight.text}</p>
                    <span className="text-[11px] text-ink-400 uppercase tracking-wide mt-1 inline-block">
                      {insight.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card className="mt-6">
        <CardHeader title="Ask Your Data" subtitle="Get an evidence-based answer from your own numbers" />
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. Why were expenses higher in July?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4">
            <Send size={16} />
          </button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
