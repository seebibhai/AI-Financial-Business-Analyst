import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="font-display text-lg text-ink-900">{title}</h3>
        {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-ink-100 rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-16" />
    </Card>
  );
}
