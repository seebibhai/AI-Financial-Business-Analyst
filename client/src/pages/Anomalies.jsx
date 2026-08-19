import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Repeat } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge, EmptyState } from '../components/ui/Badge';
import { anomalyService } from '../services/forecastService';
import { useAuth } from '../context/AuthContext';

const SEVERITY_TONE = { high: 'negative', medium: 'warning', low: 'neutral' };

function currency(n, cur = 'PKR') {
  return `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Anomalies() {
  const { user } = useAuth();
  const [anomalies, setAnomalies] = useState([]);
  const [counts, setCounts] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const cur = user?.currency || 'PKR';

  const load = () => {
    setLoading(true);
    Promise.all([anomalyService.list(), anomalyService.recurring()])
      .then(([a, r]) => {
        setAnomalies(a.anomalies);
        setCounts(a.counts);
        setRecurring(r.recurring);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id, status) => {
    setAnomalies((prev) => prev.map((a) => (a._id === id ? { ...a, status } : a)));
    await anomalyService.update(id, status);
  };

  return (
    <DashboardLayout title="Anomaly Detection">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs text-ink-400 uppercase tracking-wide mb-1.5">Total Anomalies</div>
          <div className="figure text-2xl font-medium text-ink-900">{counts.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 uppercase tracking-wide mb-1.5">High Priority</div>
          <div className="figure text-2xl font-medium text-brick-600">{counts.high || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 uppercase tracking-wide mb-1.5">Medium Priority</div>
          <div className="figure text-2xl font-medium text-gold-500">{counts.medium || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 uppercase tracking-wide mb-1.5">Low Priority</div>
          <div className="figure text-2xl font-medium text-ink-500">{counts.low || 0}</div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Flagged Transactions"
          subtitle="Detected using z-score statistical variation within each category — not AI guesswork"
        />
        {loading ? (
          <p className="text-sm text-ink-400">Detecting anomalies…</p>
        ) : anomalies.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No anomalies detected" description="Nothing unusual was found based on statistical variation within your categories." />
        ) : (
          <div className="divide-y divide-ink-100">
            {anomalies.map((a) => (
              <div key={a._id} className="py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle
                    size={16}
                    className={`shrink-0 mt-0.5 ${a.severity === 'high' ? 'text-brick-500' : 'text-gold-500'}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                      <span className="text-xs text-ink-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-ink-700">{a.reason}</p>
                    <p className="text-xs text-ink-400 mt-1">
                      Actual: <span className="figure">{currency(a.actualAmount, cur)}</span> · Expected range:{' '}
                      <span className="figure">
                        {currency(a.expectedRange?.low, cur)} – {currency(a.expectedRange?.high, cur)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.status === 'open' && (
                    <>
                      <button
                        onClick={() => updateStatus(a._id, 'investigated')}
                        className="btn-ghost text-xs px-2.5 py-1.5"
                        title="Mark as investigated"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => updateStatus(a._id, 'dismissed')}
                        className="btn-ghost text-xs px-2.5 py-1.5"
                        title="Dismiss"
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}
                  {a.status !== 'open' && <Badge tone="neutral">{a.status}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Recurring Expenses" subtitle="Detected from consistent monthly patterns per vendor or category" />
        {recurring.length === 0 ? (
          <EmptyState icon={Repeat} title="No recurring expenses detected yet" description="This usually needs at least 3 months of data for the same vendor or category." />
        ) : (
          <div className="space-y-2">
            {recurring.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-ink-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <Repeat size={14} className="text-ledger-500" />
                  <span className="text-sm text-ink-700">{r.label}</span>
                </div>
                <span className="text-xs text-ink-400 figure">
                  {r.monthsSeen} months · avg {currency(r.averageAmount, cur)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
