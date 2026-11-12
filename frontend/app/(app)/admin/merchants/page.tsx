'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Empty, PageHeader, Spinner, inr } from '@/components/ui';

type Merchant = {
  id: number;
  username: string;
  email: string;
  business_name: string;
  display_name: string;
  is_merchant_active: boolean;
  is_staff: boolean;
  order_count: number;
  paid_count: number;
  total_paid: string;
  date_joined: string;
};

type MerchantList = { items: Merchant[]; total: number; page: number; per_page: number };

export default function AdminMerchantsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MerchantList | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<MerchantList>(`/admin/merchants?q=${encodeURIComponent(q)}&page=${page}`);
      setData(res);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Could not load merchants.');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const toggle = async (id: number) => {
    setTogglingId(id);
    try {
      await api(`/admin/merchants/${id}/toggle`, { method: 'POST' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Toggle failed.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div>
      <PageHeader title="Merchants" subtitle="Every merchant account on this gateway." />

      <div className="mb-4 max-w-sm">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search by name, username or emailâ€¦"
          className="input w-full"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/20">{error}</div>
      )}

      <div className="card overflow-hidden p-0">
        {loading && !data ? (
          <div className="grid place-items-center py-16"><Spinner /></div>
        ) : !data || data.items.length === 0 ? (
          <Empty title="No merchants found" hint="Try a different search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Total collected</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {data.items.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{m.display_name}</div>
                      <div className="text-xs text-slate-500">@{m.username} Â· {m.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {m.is_merchant_active ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">Active</span>
                      ) : (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-red-400/20">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">{m.order_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">{m.paid_count}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-white">{inr(m.total_paid)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(m.date_joined).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(m.id)}
                        disabled={togglingId === m.id}
                        className={`btn text-xs ${m.is_merchant_active
                          ? 'btn-ghost text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10'
                          : 'bg-emerald-500 font-semibold text-emerald-950 hover:bg-emerald-400'} disabled:opacity-50`}
                      >
                        {togglingId === m.id ? <Spinner /> : m.is_merchant_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > data.per_page && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <button className="btn btn-ghost text-xs disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>â† Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost text-xs disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next â†’</button>
        </div>
      )}
    </div>
  );
}
