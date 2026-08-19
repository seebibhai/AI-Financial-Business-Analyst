import React, { useEffect, useState } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Badge, EmptyState } from '../components/ui/Badge';
import { transactionService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';

const TYPE_TONE = { revenue: 'positive', expense: 'negative', refund: 'warning', transfer: 'neutral', other: 'neutral' };

function currency(n, cur = 'PKR') {
  return `${cur} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Transactions() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      transactionService
        .list({ search, type: type || undefined, page, limit: 20, sortBy, sortDir })
        .then((res) => {
          setRows(res.transactions);
          setPagination(res.pagination);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search, type, page, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const cur = user?.currency || 'PKR';

  return (
    <DashboardLayout title="Transaction Explorer">
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Search description, vendor, customer, category…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input w-auto"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
            <option value="refund">Refund</option>
            <option value="transfer">Transfer</option>
            <option value="other">Other</option>
          </select>
          <a
            href={transactionService.exportCsvUrl({ preset: 'all' })}
            className="btn-secondary"
            onClick={(e) => {
              // export requires auth header; fall back to fetch+blob
              e.preventDefault();
              fetch(transactionService.exportCsvUrl({ preset: 'all' }), {
                headers: { Authorization: `Bearer ${localStorage.getItem('afba_token')}` },
              })
                .then((r) => r.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'transactions-export.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
          >
            <Download size={15} /> Export CSV
          </a>
        </div>

        {loading ? (
          <p className="text-sm text-ink-400 py-8 text-center">Loading transactions…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" description="Try adjusting your search or filters, or upload data first." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs text-ink-400 uppercase tracking-wide">
                    <th className="px-6 py-3 cursor-pointer" onClick={() => toggleSort('date')}>Date</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3 cursor-pointer" onClick={() => toggleSort('category')}>Category</th>
                    <th className="px-3 py-3">Vendor / Customer</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-6 py-3 text-right cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t._id} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="px-6 py-3 figure text-ink-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-ink-700 max-w-[240px] truncate">{t.description || '—'}</td>
                      <td className="px-3 py-3 text-ink-500">{t.category}</td>
                      <td className="px-3 py-3 text-ink-500">{t.vendor || t.customer || '—'}</td>
                      <td className="px-3 py-3">
                        <Badge tone={TYPE_TONE[t.type] || 'neutral'}>{t.type}</Badge>
                      </td>
                      <td
                        className={`px-6 py-3 text-right figure font-medium whitespace-nowrap ${
                          t.type === 'expense' ? 'text-brick-600' : 'text-ink-900'
                        }`}
                      >
                        {t.type === 'expense' ? '-' : ''}
                        {currency(t.amount, cur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink-100">
              <span className="text-xs text-ink-400">
                {pagination.total} transaction(s) · Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary px-2.5 py-1.5"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary px-2.5 py-1.5"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
