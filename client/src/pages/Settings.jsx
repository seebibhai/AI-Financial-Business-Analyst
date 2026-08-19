import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'];

export default function Settings() {
  const { user, setUser } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    // Currency/company name are display preferences only in this MVP;
    // wiring PATCH /api/auth/me is a natural next step.
    localStorage.setItem('afba_user', JSON.stringify(user));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader title="Profile" subtitle="Your account details" />
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={user?.name || ''} onChange={(e) => setUser({ ...user, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                value={user?.companyName || ''}
                onChange={(e) => setUser({ ...user, companyName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input bg-ink-50" value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                className="input"
                value={user?.currency || 'PKR'}
                onChange={(e) => setUser({ ...user, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">{saved ? 'Saved ✓' : 'Save changes'}</button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Data & Privacy" />
          <ul className="text-sm text-ink-500 space-y-2 list-disc pl-4">
            <li>Your uploaded files and transactions are only visible to your account.</li>
            <li>Only the minimal analytical evidence needed to answer a question is sent to the AI provider — never raw file dumps or other users' data.</li>
            <li>Deleting a data source also deletes every transaction it produced.</li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
