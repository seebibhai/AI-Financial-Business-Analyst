import React from 'react';
import { Inbox } from 'lucide-react';

const BADGE_TONES = {
  neutral: 'bg-ink-100 text-ink-600',
  positive: 'bg-ledger-50 text-ledger-700',
  negative: 'bg-brick-50 text-brick-700',
  warning: 'bg-gold-50 text-gold-600',
  info: 'bg-ink-100 text-ink-600',
};

export function Badge({ tone = 'neutral', children, dot = false }) {
  return (
    <span className={`badge ${BADGE_TONES[tone] || BADGE_TONES.neutral}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const base = variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost';
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mb-4">
        <Icon size={20} className="text-ink-400" />
      </div>
      <h4 className="font-display text-base text-ink-800 mb-1">{title}</h4>
      {description && <p className="text-sm text-ink-400 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}
