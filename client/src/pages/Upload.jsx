import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, Badge } from '../components/ui/Badge';
import { dataService } from '../services/dataService';

const CANONICAL_FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'amount', label: 'Amount', required: false },
  { key: 'type', label: 'Type (Revenue/Expense)', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'vendor', label: 'Vendor', required: false },
  { key: 'customer', label: 'Customer', required: false },
  { key: 'invoiceId', label: 'Invoice Number', required: false },
  { key: 'paymentMethod', label: 'Payment Method', required: false },
];

const STATUS_BADGE = {
  completed: { tone: 'positive', icon: CheckCircle2, label: 'Completed' },
  warning: { tone: 'warning', icon: AlertTriangle, label: 'Warning' },
  failed: { tone: 'negative', icon: XCircle, label: 'Failed' },
  processing: { tone: 'info', icon: Loader2, label: 'Processing' },
  uploading: { tone: 'info', icon: Loader2, label: 'Uploading' },
};

export default function Upload() {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState(null); // { dataSourceId, headers, mapping, ... }
  const [mapping, setMapping] = useState({});
  const [usesDebitCredit, setUsesDebitCredit] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);

  const loadSources = useCallback(() => {
    setLoadingSources(true);
    dataService
      .list()
      .then((res) => setSources(res.dataSources))
      .finally(() => setLoadingSources(false));
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploadError('');
    setResult(null);
    setUploading(true);
    try {
      const res = await dataService.upload(file);
      setPreview(res);
      setMapping(res.mapping);
      setUsesDebitCredit(res.usesDebitCredit);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleSheetChange = async (sheetName) => {
    const res = await dataService.selectSheet(preview.dataSourceId, sheetName);
    setPreview((p) => ({ ...p, ...res }));
    setMapping(res.mapping);
    setUsesDebitCredit(res.usesDebitCredit);
  };

  const handleConfirm = async () => {
    setCommitting(true);
    setUploadError('');
    try {
      const res = await dataService.confirmMapping(preview.dataSourceId, mapping, usesDebitCredit);
      setResult(res);
      setPreview(null);
      loadSources();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this data source and all its transactions?')) return;
    await dataService.remove(id);
    loadSources();
  };

  const missingRequired = CANONICAL_FIELDS.some((f) => f.required && !mapping[f.key]) && !(usesDebitCredit && (mapping.debit || mapping.credit));
  const missingAmount = !mapping.amount && !(usesDebitCredit && (mapping.debit || mapping.credit));

  return (
    <DashboardLayout title="Data Upload Center">
      {!preview && (
        <Card>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl2 border-2 border-dashed transition-colors ${
              dragOver ? 'border-ledger-500 bg-ledger-50/50' : 'border-ink-200'
            }`}
          >
            <label className="flex flex-col items-center justify-center py-16 cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="w-14 h-14 rounded-full bg-ledger-50 flex items-center justify-center mb-4">
                {uploading ? (
                  <Loader2 size={22} className="text-ledger-600 animate-spin" />
                ) : (
                  <UploadCloud size={22} className="text-ledger-600" />
                )}
              </div>
              <p className="font-display text-base text-ink-800 mb-1">
                {uploading ? 'Processing your file…' : 'Drag & drop your file here'}
              </p>
              <p className="text-sm text-ink-400">or click to browse — CSV, XLSX, XLS (max 15MB)</p>
            </label>
          </div>
          {uploadError && (
            <div className="mt-4 bg-brick-50 text-brick-700 text-sm rounded-lg px-4 py-3">{uploadError}</div>
          )}
        </Card>
      )}

      {result && (
        <Card className="mt-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-ledger-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-base text-ink-900 mb-1">Upload processed</h3>
              <p className="text-sm text-ink-500">
                {result.recordsInserted} transaction(s) added · {result.validCount} valid · {result.invalidCount} skipped
                {result.duplicateCount ? ` · ${result.duplicateCount} likely duplicate(s)` : ''}
              </p>
              {result.issues.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-ledger-600 cursor-pointer font-medium">
                    View {result.issues.length} validation note(s)
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-ink-500 max-h-40 overflow-y-auto">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={issue.severity === 'error' ? 'text-brick-500' : 'text-gold-500'}>
                          Row {issue.row}:
                        </span>
                        {issue.issue}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4 text-sm">
                View Dashboard <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader
            title="Confirm Column Mapping"
            subtitle={`${preview.fileName || 'Uploaded file'} — ${preview.totalRows} row(s) detected`}
          />

          {preview.sheetNames && preview.sheetNames.length > 1 && (
            <div className="mb-5">
              <label className="label">Worksheet</label>
              <select
                className="input max-w-xs"
                value={preview.activeSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
              >
                {preview.sheetNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 mb-5">
            <input
              type="checkbox"
              id="debitCredit"
              checked={usesDebitCredit}
              onChange={(e) => setUsesDebitCredit(e.target.checked)}
              className="rounded border-ink-300"
            />
            <label htmlFor="debitCredit" className="text-sm text-ink-600">
              This file uses separate Debit / Credit columns instead of a single Amount column
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {(usesDebitCredit
              ? [
                  { key: 'debit', label: 'Debit (Expense)', required: false },
                  { key: 'credit', label: 'Credit (Revenue)', required: false },
                  ...CANONICAL_FIELDS.filter((f) => f.key !== 'amount'),
                ]
              : CANONICAL_FIELDS
            ).map((field) => (
              <div key={field.key}>
                <label className="label">
                  {field.label} {field.required && <span className="text-brick-500">*</span>}
                </label>
                <select
                  className="input"
                  value={mapping[field.key] || ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || null }))}
                >
                  <option value="">— Not mapped —</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mb-6 overflow-x-auto">
            <p className="label mb-2">Preview (first {preview.preview.length} rows)</p>
            <table className="w-full text-xs border border-ink-100 rounded-lg overflow-hidden">
              <thead className="bg-ink-50">
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-t border-ink-100">
                    {preview.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-ink-600 figure">{String(row[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {missingRequired && (
            <div className="mb-4 bg-gold-50 text-gold-700 text-sm rounded-lg px-4 py-3">
              A date column {missingAmount ? 'and an amount (or debit/credit) column ' : ''}must be mapped before continuing.
            </div>
          )}
          {uploadError && <div className="mb-4 bg-brick-50 text-brick-700 text-sm rounded-lg px-4 py-3">{uploadError}</div>}

          <div className="flex gap-3">
            <button onClick={() => setPreview(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={missingRequired || committing}
              className="btn-primary"
            >
              {committing ? 'Processing…' : 'Confirm & Import'}
            </button>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Uploaded Files" />
        {loadingSources ? (
          <p className="text-sm text-ink-400">Loading…</p>
        ) : sources.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No files uploaded yet" description="Your uploaded files will appear here with their processing status." />
        ) : (
          <div className="divide-y divide-ink-100">
            {sources.map((s) => {
              const meta = STATUS_BADGE[s.status] || STATUS_BADGE.processing;
              const Icon = meta.icon;
              return (
                <div key={s._id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet size={18} className="text-ink-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate">{s.fileName}</p>
                      <p className="text-xs text-ink-400">
                        {s.validRecordCount} valid · {s.invalidRecordCount} invalid
                        {s.duplicateCount ? ` · ${s.duplicateCount} duplicates` : ''} ·{' '}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge tone={meta.tone}>
                      <Icon size={11} className={s.status === 'processing' ? 'animate-spin' : ''} />
                      {meta.label}
                    </Badge>
                    <button onClick={() => handleDelete(s._id)} className="text-ink-400 hover:text-brick-500 p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
