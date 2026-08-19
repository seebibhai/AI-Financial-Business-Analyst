import React, { useState } from 'react';
import { ChevronDown, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' },
];

export function Topbar({ title, range, onRangeChange, onMenuClick }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-ink-100">
      <div className="flex items-center justify-between px-5 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-1.5 -ml-1.5 text-ink-500">
            <Menu size={20} />
          </button>
          <h1 className="font-display text-xl text-ink-900">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {onRangeChange && (
            <select
              value={range}
              onChange={(e) => onRangeChange(e.target.value)}
              className="text-sm border border-ink-200 rounded-lg px-3 py-2 bg-white text-ink-700 focus:border-ledger-500 focus:ring-1 focus:ring-ledger-500 outline-none"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-ink-200 bg-white hover:bg-ink-50"
            >
              <div className="w-7 h-7 rounded-full bg-ink-800 text-white flex items-center justify-center text-xs font-semibold">
                {user?.name?.[0]?.toUpperCase() || <UserIcon size={13} />}
              </div>
              <span className="text-sm text-ink-700 hidden sm:block max-w-[120px] truncate">{user?.name}</span>
              <ChevronDown size={14} className="text-ink-400" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-popover border border-ink-100 py-1 z-20">
                  <div className="px-3.5 py-2 border-b border-ink-100">
                    <div className="text-sm font-medium text-ink-800 truncate">{user?.name}</div>
                    <div className="text-xs text-ink-400 truncate">{user?.email}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-brick-600 hover:bg-brick-50"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
