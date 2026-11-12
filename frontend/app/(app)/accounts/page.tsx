'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Empty, PageHeader, Spinner, inr } from '@/components/ui';

type Account = {
  id: number;
  label: string;
  upi_id: string;
  provider: string;
  daily_limit: string;
  received_today: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

const PROVIDERS: Record<string, string> = {
  manual: 'Manual',
  paytm_business: 'Paytm Business',
  paytm_pg: 'Paytm PG',
  phonepe_pg: 'PhonePe PG',
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [upiId, setUpiId] = useState('');
  const [provider, setProvider] = useState('manual');
  const [dailyLimit, setDailyLimit] = useState('0');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setAccounts(await api<Account[]>('/accounts', { auth: true }));
      setError('');
    } catch {
      setError('Failed to load accounts.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/accounts', {
        method: 'POST',
        auth: true,
        body: { label, upi_id: upiId, provider, daily_limit: Number(dailyLimit) || 0 },
      });
      setLabel('');
      setUpiId('');
      setProvider('manual');
      setDailyLimit('0');
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the account.');
    } finally {
      setSaving(false);
    }
  }

  async function mutate(id: number, path: string, method: 'POST' | 'DELETE' = 'POST') {
    setBusyId(id);
    setError('');
    try {
      await api(`/accounts/${id}${path}`, { method, auth: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="UPI Accounts"
        subtitle="The accounts your payments are collected into."
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Close' : '+ Add account'}
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={create} className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Label</label>
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main account" className="input w-full" />
          </div>
          <div className="lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">UPI ID</label>
            <input required value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="shop@okaxis" className="input w-full" />
          </div>
          <div className="lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input w-full">
              {Object.entries(PROVIDERS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Daily limit (₹, 0 = unlimited)</label>
            <input type="number" min="0" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="input w-full" />
          </div>
          <div className="flex items-end lg:col-span-1">
            <button className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Adding…' : 'Add account'}
            </button>
          </div>
        </form>
      )}

      {!accounts ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-0">
          <Empty title="No UPI accounts yet" hint="Add an account to start collecting payments." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className={`card p-5 ${!a.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold text-slate-100">{a.label}</div>
                    {a.is_default && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-slate-400">{a.upi_id}</div>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-white/[0.08]">
                  {PROVIDERS[a.provider] ?? a.provider}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className={a.is_active ? 'text-emerald-300' : 'text-slate-500'}>
                  {a.is_active ? '● Active' : '○ Inactive'}
                </span>
                <span className="text-slate-500">
                  Limit: {Number(a.daily_limit) > 0 ? inr(a.daily_limit) : 'Unlimited'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                {!a.is_default && (
                  <button className="btn btn-ghost text-xs" disabled={busyId === a.id} onClick={() => mutate(a.id, '/default')}>
                    Make default
                  </button>
                )}
                <button className="btn btn-ghost text-xs" disabled={busyId === a.id} onClick={() => mutate(a.id, '/toggle')}>
                  {a.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="btn btn-ghost text-xs text-red-300 hover:bg-red-500/10"
                  disabled={busyId === a.id}
                  onClick={() => {
                    if (confirm(`Delete "${a.label}"? This cannot be undone.`)) mutate(a.id, '', 'DELETE');
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
