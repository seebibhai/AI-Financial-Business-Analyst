import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  Receipt,
  LineChart,
  TrendingUp,
  AlertTriangle,
  MessageSquareText,
  Settings,
  BookOpenText,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Data', icon: UploadCloud },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp },
  { to: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: '/ai-analyst', label: 'AI Analyst', icon: MessageSquareText },
];

export function Sidebar({ mobile = false }) {
  return (
    <aside
      className={`${
        mobile ? 'flex' : 'hidden lg:flex'
      } flex-col w-60 shrink-0 border-r border-ink-100 bg-white h-screen ${mobile ? '' : 'sticky top-0'}`}
    >
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-ink-100">
        <div className="w-8 h-8 rounded-lg bg-ledger-500 flex items-center justify-center">
          <BookOpenText size={16} className="text-white" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold text-ink-900 leading-tight">AI Financial</div>
          <div className="font-display text-sm font-semibold text-ink-900 leading-tight">Business Analyst</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-ledger-50 text-ledger-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-ink-100">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-ledger-50 text-ledger-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
            }`
          }
        >
          <Settings size={17} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
