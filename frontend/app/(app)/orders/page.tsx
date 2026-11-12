'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Empty, PageHeader, Spinner, StatusBadge, inr } from '@/components/ui';

type Order = {
  order_no: string;
  amount: string;
  note: string;
  customer_name: string;
  status: string;
  environment: string;
  created_at: string;
};

type OrderList = { items: Order[]; total: number; page: number; per_page: number };

const STATUSES = ['', 'pending', 'review', 'paid', 'expired', 'failed'];

function OrdersInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [environment, setEnvironment] = useState(params.get('environment') ?? 'live');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrderList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (status) qs.set('status', status);
      if (environment) qs.set('environment', environment);
      if (search) qs.set('q', search);
      setData(await api<OrderList>(`/orders?${qs.toString()}`, { auth: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, status, environment, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Every payment link you've created."
        actions={
          <Link href="/orders/new" className="btn btn-primary">
            + New payment link
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                status === s
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.08] hover:text-slate-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg bg-white/[0.04] p-1 ring-1 ring-white/[0.08]">
          {(['live', 'sandbox'] as const).map((env) => (
            <button
              key={env}
              onClick={() => {
                setEnvironment(env);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                environment === env
                  ? env === 'sandbox'
                    ? 'bg-amber-400/90 text-amber-950'
                    : 'bg-emerald-500/90 text-emerald-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {env === 'live' ? 'Live' : 'Sandbox'}
            </button>
          ))}
        </div>

        <form
          className="ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            setPage(1);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order no / customer…"
            className="input w-64"
          />
        </form>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : !data || data.items.length === 0 ? (
          <Empty title="No orders found" hint="Create a payment link to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5 font-medium">Order</th>
                <th className="px-5 py-3.5 font-medium">Customer</th>
                <th className="px-5 py-3.5 font-medium text-right">Amount</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Env</th>
                <th className="px-5 py-3.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.order_no} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/orders/${o.order_no}`}
                      className="font-mono text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{o.customer_name || '—'}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-100">{inr(o.amount)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        o.environment === 'sandbox'
                          ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
                          : 'bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.08]'
                      }`}
                    >
                      {o.environment}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <div>
            Page {data.page} of {totalPages} · {data.total} orders
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <OrdersInner />
    </Suspense>
  );
}
