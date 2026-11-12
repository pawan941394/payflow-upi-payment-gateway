'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StatusBadge, StatCard, Spinner, Empty, PageHeader, inr } from '@/components/ui';

type ChartDay = { date: string; label: string; amount: string | number; count: number };
type RecentOrder = {
  order_no: string;
  customer_name: string;
  amount: string | number;
  status: string;
  created_at: string;
};
type Stats = {
  today_amount: string | number;
  today_count: number;
  total_amount: string | number;
  paid_count: number;
  pending_count: number;
  review_count: number;
  success_rate: number | null;
  chart: ChartDay[];
  recent_orders: RecentOrder[];
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function DashboardPage() {
  const { user } = useAuth();
  const [env, setEnv] = useState<'live' | 'sandbox'>('live');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Stats>(`/dashboard/stats?environment=${env}`, { auth: true })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [env]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.display_name || '').split(' ')[0];

  const maxAmount = Math.max(1, ...(stats?.chart || []).map((d) => Number(d.amount)));

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle="Here is what is happening with your payments today."
        actions={
          <>
            <Link href="/orders" className="btn btn-ghost">
              View orders
            </Link>
            <Link href="/orders/new" className="btn btn-primary">
              + Payment link
            </Link>
          </>
        }
      />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="inline-flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-1 text-sm font-medium">
          <button
            onClick={() => setEnv('live')}
            className={`rounded-md px-4 py-2 transition ${
              env === 'live' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setEnv('sandbox')}
            className={`rounded-md px-4 py-2 transition ${
              env === 'sandbox' ? 'bg-amber-400/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sandbox · TEST
          </button>
        </div>
        {env === 'sandbox' && (
          <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs font-bold tracking-wide text-amber-300">
            SIMULATED DATA
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : !stats ? (
        <Empty title="Could not load stats" hint="Check that the API server is running." />
      ) : (
        <>
          {stats.review_count > 0 && (
            <Link
              href="/orders?status=review"
              className="mb-6 flex items-center gap-4 rounded-xl border border-sky-400/30 bg-sky-400/10 px-5 py-4 transition hover:bg-sky-400/15"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-500 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sky-200">
                  {stats.review_count} payment{stats.review_count === 1 ? '' : 's'} waiting for your review
                </div>
                <div className="text-sm text-sky-300/70">
                  Customers submitted UTRs. Match them with your bank/UPI app to approve.
                </div>
              </div>
              <span className="text-sky-300">→</span>
            </Link>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={env === 'sandbox' ? 'Simulated today' : 'Collected today'}
              value={inr(Number(stats.today_amount))}
              hint={`${stats.today_count} payment${stats.today_count === 1 ? '' : 's'}`}
            />
            <StatCard
              label={env === 'sandbox' ? 'Total simulated' : 'Total collected'}
              value={inr(Number(stats.total_amount))}
              hint={`${stats.paid_count} successful payment${stats.paid_count === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Pending orders"
              value={String(stats.pending_count)}
              hint="Waiting for customer payment"
            />
            <StatCard
              label="Success rate"
              value={stats.success_rate === null ? '—' : `${stats.success_rate}%`}
              hint="Paid vs expired orders"
            />
          </div>

          <div className="card mb-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-400">
                  {env === 'sandbox' ? 'Simulated payments' : 'Collections'} · last 7 days
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {inr(stats.chart.reduce((sum, d) => sum + Number(d.amount), 0))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-8">
              <div className="flex h-48 items-end gap-3">
                {stats.chart.map((day, i) => {
                  const amount = Number(day.amount);
                  const isLast = i === stats.chart.length - 1;
                  const heightPct = amount > 0 ? Math.max(4, (amount / maxAmount) * 100) : 0;
                  return (
                    <div key={day.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                      <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-800 border border-white/10 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                        {day.label} · {inr(amount)} · {day.count} paid
                      </div>
                      <div
                        className={`w-full max-w-12 rounded-t-md transition-all ${
                          isLast ? 'bg-emerald-400' : 'bg-emerald-500/30 group-hover:bg-emerald-500/60'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <div className="h-px w-full max-w-12 bg-white/[0.08]" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-3">
                {stats.chart.map((day, i) => {
                  const isLast = i === stats.chart.length - 1;
                  return (
                    <div
                      key={day.date}
                      className={`flex-1 text-center text-xs ${
                        isLast ? 'font-semibold text-white' : 'text-slate-500'
                      }`}
                    >
                      {isLast ? 'Today' : day.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="text-sm font-semibold text-white">Recent orders</div>
              <Link
                href="/orders"
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                View all →
              </Link>
            </div>
            {stats.recent_orders.length === 0 ? (
              <Empty title="No orders yet" hint="Create a payment link to start collecting." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3 font-medium">Order</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {stats.recent_orders.map((order) => (
                      <tr key={order.order_no} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/orders/${order.order_no}`}
                            className="font-mono text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            {order.order_no}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">{order.customer_name || '—'}</td>
                        <td className="px-5 py-3.5 font-medium tabular-nums text-white">
                          {inr(Number(order.amount))}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">{fmtDateTime(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
