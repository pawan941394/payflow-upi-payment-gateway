'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Empty, PageHeader, Spinner, StatusBadge, inr } from '@/components/ui';

type AdminOrder = {
  order_no: string;
  amount: string;
  note: string;
  customer_name: string;
  status: string;
  environment: string;
  merchant?: string;
  username?: string;
  created_at: string;
  paid_at: string | null;
};

type OrderList = { items: AdminOrder[]; total: number; page: number; per_page: number };

const STATUSES = ['', 'pending', 'review', 'paid', 'expired', 'failed'];
const ENVS = ['', 'live', 'sandbox'];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [environment, setEnvironment] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrderList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<OrderList>(
        `/admin/orders?status=${status}&environment=${environment}&q=${encodeURIComponent(q)}&page=${page}`,
      );
      setData(res);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [status, environment, q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div>
      <PageHeader title="All orders" subtitle="Orders across every merchant, live and sandbox." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search order no, customerâ€¦"
          className="input w-64"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-36">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === '' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }} className="input w-36">
          {ENVS.map((e2) => (
            <option key={e2} value={e2}>{e2 === '' ? 'All environments' : e2[0].toUpperCase() + e2.slice(1)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/20">{error}</div>
      )}

      <div className="card overflow-hidden p-0">
        {loading && !data ? (
          <div className="grid place-items-center py-16"><Spinner /></div>
        ) : !data || data.items.length === 0 ? (
          <Empty title="No orders found" hint="Try different filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Env</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {data.items.map((o) => (
                  <tr
                    key={o.order_no}
                    onClick={() => router.push(`/admin/orders/${o.order_no}`)}
                    className="cursor-pointer hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-300">{o.order_no}</span>
                      {o.note && <div className="max-w-44 truncate text-xs text-slate-500">{o.note}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{o.merchant || o.username || 'â€”'}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-white">{inr(o.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      {o.environment === 'sandbox' ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300 ring-1 ring-amber-400/20">TEST</span>
                      ) : (
                        <span className="text-xs text-slate-500">Live</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{o.customer_name || 'â€”'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
