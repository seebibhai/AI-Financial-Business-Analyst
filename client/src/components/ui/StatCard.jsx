import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * @param {string} label
 * @param {string} value already-formatted currency/number string
 * @param {number|null} growth percent change vs previous period (null = not meaningful)
 * @param {'positive'|'negative'|'neutral'} growthSense whether up is good or bad for this metric
 */
export function StatCard({ label, value, growth, growthSense = 'positive', hint }) {
  const isUp = typeof growth === 'number' && growth > 0;
  const isDown = typeof growth === 'number' && growth < 0;
  const goodDirection = growthSense === 'positive' ? isUp : isDown;
  const badDirection = growthSense === 'positive' ? isDown : isUp;

  return (
    <div className="card p-5">
      <div className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">{label}</div>
      <div className="figure text-2xl md:text-[1.7rem] font-medium text-ink-900 leading-none">{value}</div>
      <div className="ledger-rule mt-3 pt-2.5 flex items-center gap-1.5 min-h-[20px]">
        {typeof growth === 'number' && (
          <>
            {goodDirection && <ArrowUpRight size={14} className="text-ledger-500" />}
            {badDirection && <ArrowDownRight size={14} className="text-brick-500" />}
            <span
              className={`figure text-xs font-medium ${
                goodDirection ? 'text-ledger-600' : badDirection ? 'text-brick-600' : 'text-ink-400'
              }`}
            >
              {growth > 0 ? '+' : ''}
              {growth}%
            </span>
            <span className="text-xs text-ink-400">vs previous period</span>
          </>
        )}
        {typeof growth !== 'number' && hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>
    </div>
  );
}
