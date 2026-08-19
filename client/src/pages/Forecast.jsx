import React, { useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ForecastChart } from '../components/charts/ForecastChart';
import { forecastService } from '../services/forecastService';
import { useAuth } from '../context/AuthContext';

const METRICS = [
  { key: 'revenue', label: 'Revenue', color: '#0E6E5F' },
  { key: 'expenses', label: 'Expenses', color: '#B34630' },
  { key: 'profit', label: 'Profit', color: '#C08A2E' },
];

function currency(n, cur = 'PKR') {
  return `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Forecast() {
  const { user } = useAuth();
  const [metric, setMetric] = useState('revenue');
  const [horizon, setHorizon] = useState(1);
  const [method, setMethod] = useState('weighted_moving_average');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cur = user?.currency || 'PKR';

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const fn = metric === 'revenue' ? forecastService.revenue : metric === 'expenses' ? forecastService.expenses : forecastService.profit;
      const res = await fn({ horizon, method });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, horizon, method]);

  return (
    <DashboardLayout title="Forecast">
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Metric</label>
            <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium ${
                    metric === m.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Horizon (months)</label>
            <select className="input w-auto" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              {[1, 2, 3, 6].map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input w-auto" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="weighted_moving_average">Weighted Moving Average</option>
              <option value="linear_regression">Linear Regression</option>
            </select>
          </div>
        </div>
      </Card>

      {error && <div className="mb-5 bg-brick-50 text-brick-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-sm text-ink-400">Calculating forecast…</p>
      ) : result ? (
        <>
          {!result.reliable && result.predictions.length === 0 ? (
            <Card>
              <div className="flex items-start gap-3">
                <Info size={18} className="text-gold-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base text-ink-900 mb-1">Not enough historical data</h3>
                  <p className="text-sm text-ink-500">{result.notes}</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {result.predictions.map((p) => (
                  <Card key={p.period} className="p-4">
                    <div className="text-xs text-ink-400 uppercase tracking-wide mb-1.5">{p.period}</div>
                    <div className="figure text-xl font-medium text-ink-900">{currency(p.value, cur)}</div>
                    <div className="text-xs text-ink-400 mt-1">
                      Range: {currency(p.lowerBound, cur)} – {currency(p.upperBound, cur)}
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader
                  title={`${METRICS.find((m) => m.key === metric).label} Forecast`}
                  subtitle={`Method: ${method === 'linear_regression' ? 'Linear Regression' : 'Weighted Moving Average'} · ${result.dataPointsUsed} historical period(s) used`}
                  action={
                    <Badge tone={result.reliable ? 'positive' : 'warning'}>
                      <TrendingUp size={12} /> {result.reliable ? 'Reliable' : 'Rough estimate'}
                    </Badge>
                  }
                />
                <ForecastChart historical={result.historicalPeriods} predictions={result.predictions} currency={cur} />
                <p className="text-xs text-ink-400 mt-3 flex items-start gap-1.5">
                  <Info size={13} className="shrink-0 mt-0.5" /> {result.notes}
                </p>
              </Card>
            </>
          )}
        </>
      ) : null}
    </DashboardLayout>
  );
}
