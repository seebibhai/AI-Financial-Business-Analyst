import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { X } from 'lucide-react';

export function DashboardLayout({ title, range, onRangeChange, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-60 bg-white">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 p-1 text-ink-400">
              <X size={18} />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <Topbar title={title} range={range} onRangeChange={onRangeChange} onMenuClick={() => setMobileOpen(true)} />
        <main className="px-5 lg:px-8 py-6 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
