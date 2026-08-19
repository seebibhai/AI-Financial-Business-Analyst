import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenText,
  UploadCloud,
  Sparkles,
  MessageSquareText,
  LineChart,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: UploadCloud,
    title: 'Upload Your Data',
    desc: 'Upload Excel, CSV, invoices, and transaction files — drag, drop, done.',
  },
  {
    icon: Sparkles,
    title: 'Automatic Financial Analysis',
    desc: 'Raw business data becomes structured revenue, expense, and profit metrics — no formulas required.',
  },
  {
    icon: MessageSquareText,
    title: 'AI Business Analyst',
    desc: 'Ask questions about your business in plain language and get answers grounded in your real numbers.',
  },
  {
    icon: LineChart,
    title: 'Interactive Analytics',
    desc: 'Explore revenue, expenses, profit, trends, and categories through clean, responsive charts.',
  },
  {
    icon: TrendingUp,
    title: 'Forecasting',
    desc: 'Transparent, model-based estimates for future periods — clearly labeled as forecasts, never guarantees.',
  },
  {
    icon: AlertTriangle,
    title: 'Anomaly Detection',
    desc: 'Statistically unusual revenue, expenses, and transactions are flagged automatically for review.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ledger-500 flex items-center justify-center">
              <BookOpenText size={16} className="text-white" />
            </div>
            <span className="font-display font-semibold text-ink-900">AI Financial Business Analyst</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="badge bg-gold-50 text-gold-600 mb-5">Business Intelligence, Explained</span>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.08] text-ink-900 mb-5">
            Turn Business Data Into
            <br />
            Actionable Financial Intelligence.
          </h1>
          <p className="text-ink-500 text-lg leading-relaxed mb-8 max-w-lg">
            Upload your business data and instantly understand revenue, expenses, profit, trends, anomalies, and
            future forecasts — every number backed by evidence, not guesswork.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Link to="/register" className="btn-primary text-base px-5 py-3">
              Upload Data <ArrowRight size={16} />
            </Link>
            <Link to="/register" className="btn-secondary text-base px-5 py-3">
              Explore Dashboard
            </Link>
          </div>
          <div className="inline-flex items-center gap-2.5 bg-white border border-ink-100 rounded-full pl-1.5 pr-4 py-1.5 shadow-card">
            <span className="w-6 h-6 rounded-full bg-ledger-50 text-ledger-600 flex items-center justify-center">
              <MessageSquareText size={12} />
            </span>
            <span className="text-sm text-ink-600">"Why were expenses higher in July?"</span>
          </div>
        </div>

        {/* Ledger-styled hero visual */}
        <div className="relative">
          <div className="card p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs text-ink-400 uppercase tracking-wide">Financial Overview</div>
                <div className="font-display text-base text-ink-900">August 2026</div>
              </div>
              <span className="badge bg-ledger-50 text-ledger-700">+12.4% Revenue</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Revenue', value: '4.85M', tone: 'text-ink-900' },
                { label: 'Expenses', value: '2.93M', tone: 'text-ink-900' },
                { label: 'Profit', value: '1.92M', tone: 'text-ledger-600' },
              ].map((s) => (
                <div key={s.label} className="ledger-rule pb-2.5">
                  <div className="text-[11px] text-ink-400 uppercase tracking-wide mb-1">{s.label}</div>
                  <div className={`figure text-lg font-medium ${s.tone}`}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-2 h-24 mb-4">
              {[38, 52, 45, 61, 58, 70, 66, 82].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                  <div className="rounded-t bg-ledger-400/80" style={{ height: `${h}%` }} />
                  <div className="rounded-t bg-brick-400/50" style={{ height: `${h * 0.55}%` }} />
                </div>
              ))}
            </div>

            <div className="bg-ink-900 text-white rounded-lg p-3.5 flex items-start gap-2.5">
              <Sparkles size={15} className="text-gold-300 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-ink-100">
                Revenue increased faster than expenses this period, driven mainly by higher Product Sales — resulting
                in an improved estimated margin.
              </p>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gold-100/60 -z-10 blur-2xl" />
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-ink-100">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-display text-3xl text-ink-900 mb-3">Everything a financial analyst does, automated</h2>
          <p className="text-ink-500">From raw spreadsheets to evidence-based answers, in one pipeline.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-ledger-50 flex items-center justify-center mb-4">
                <Icon size={18} className="text-ledger-600" />
              </div>
              <h3 className="font-display text-base text-ink-900 mb-1.5">{title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="card bg-ink-900 border-none p-10 text-center">
          <h2 className="font-display text-2xl md:text-3xl text-white mb-3">Ask your business data anything.</h2>
          <p className="text-ink-300 mb-7 max-w-md mx-auto">
            Every answer is calculated from your real transactions first, then explained in plain language.
          </p>
          <Link to="/register" className="btn-primary bg-gold-400 hover:bg-gold-500 text-ink-900 text-base px-6 py-3 inline-flex">
            Start Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="max-w-6xl mx-auto px-6 text-xs text-ink-400 text-center">
          AI Financial Business Analyst — a business intelligence tool. Forecasts and AI interpretations are
          estimates, not guaranteed outcomes, and do not constitute financial, tax, or legal advice.
        </div>
      </footer>
    </div>
  );
}
