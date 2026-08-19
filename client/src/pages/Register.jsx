import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenText, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-ledger-500 flex items-center justify-center">
            <BookOpenText size={16} className="text-white" />
          </div>
          <span className="font-display font-semibold text-ink-900">AI Financial Business Analyst</span>
        </div>

        <div className="card p-7">
          <h1 className="font-display text-xl text-ink-900 mb-1">Create your account</h1>
          <p className="text-sm text-ink-400 mb-6">Start turning your numbers into insight.</p>

          {error && (
            <div className="flex items-start gap-2 bg-brick-50 text-brick-700 text-sm rounded-lg px-3.5 py-2.5 mb-4">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="label">Company (optional)</label>
              <input
                className="input"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Sample Trading Co."
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-ink-400 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-ledger-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
