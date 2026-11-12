'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHeader, Spinner, StatusBadge, inr } from '@/components/ui';

type Order = {
  order_no: string;
  amount: string;
  note: string;
  customer_name: string;
  customer_email: string;
  status: string;
  environment: string;
  utr: string;
  customer_utr: string;
  utr_submitted_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  payment_account: { label: string; upi_id: string; provider: string } | null;
};

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState('');
  const [message, setMessage] = useState('');
  const [markUtr, setMarkUtr] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await api<Order>(`/orders/${orderNo}`, { auth: true }));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'Order not found.' : 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [orderNo]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(name: string, path: string, body?: Record<string, unknown>) {
    setActing(name);
    setMessage('');
    try {
      const res = await api<Record<string, unknown>>(`/orders/${orderNo}/${path}`, {
        method: 'POST',
        auth: true,
        body,
      });
      if (res && typeof res.message === 'string') setMessage(res.message);
      await load();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Action failed.');
    } finally {
      setActing('');
    }
  }

  function copyOrderNo() {
    navigator.clipboard.writeText(orderNo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );

  if (error || !order)
    return <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</div>;

  return (
    <div>
      <PageHeader title={`Order ${order.order_no}`} subtitle="Full payment details and actions." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Amount</div>
              <div className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-slate-50">
                {inr(order.amount)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  order.environment === 'sandbox'
                    ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
                    : 'bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.08]'
                }`}
              >
                {order.environment}
              </span>
            </div>
          </div>

          <dl className="mt-6 divide-y divide-white/[0.06]">
            <Row label="Order no">
              <span className="font-mono text-xs">{order.order_no}</span>
              <button
                onClick={copyOrderNo}
                className="ml-2 rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-white/[0.08] hover:bg-white/[0.1]"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </Row>
            <Row label="Customer">
              {order.customer_name || '—'}
              {order.customer_email && <span className="block text-xs text-slate-500">{order.customer_email}</span>}
            </Row>
            <Row label="UPI account">
              {order.payment_account ? (
                <>
                  {order.payment_account.label}
                  <span className="block font-mono text-xs text-slate-500">{order.payment_account.upi_id}</span>
                </>
              ) : (
                '—'
              )}
            </Row>
            {order.note && <Row label="Note">{order.note}</Row>}
            <Row label="Created">{fmt(order.created_at)}</Row>
            <Row label="Expires">{fmt(order.expires_at)}</Row>
            <Row label="Paid at">{fmt(order.paid_at)}</Row>
            {order.utr && (
              <Row label="UTR">
                <span className="font-mono text-xs">{order.utr}</span>
              </Row>
            )}
          </dl>
        </div>

        <div className="card h-fit p-6">
          <div className="mb-4 text-sm font-semibold text-slate-200">Actions</div>

          {message && (
            <div className="mb-4 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs text-slate-300 ring-1 ring-white/[0.08]">
              {message}
            </div>
          )}

          <div className="space-y-3">
            {order.status === 'review' && (
              <>
                <div className="rounded-xl bg-sky-500/10 px-4 py-3 ring-1 ring-sky-500/30">
                  <div className="text-xs text-sky-300/80">Customer submitted UTR</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-sky-200">{order.customer_utr}</div>
                  {order.utr_submitted_at && (
                    <div className="mt-1 text-[11px] text-sky-300/60">{fmt(order.utr_submitted_at)}</div>
                  )}
                </div>
                <button
                  className="btn w-full bg-emerald-500 font-semibold text-emerald-950 hover:bg-emerald-400"
                  disabled={!!acting}
                  onClick={() => act('approve', 'approve-utr')}
                >
                  {acting === 'approve' ? 'Approving…' : 'Approve UTR'}
                </button>
                <button
                  className="btn btn-ghost w-full text-red-300 hover:bg-red-500/10"
                  disabled={!!acting}
                  onClick={() => act('reject', 'reject-utr')}
                >
                  {acting === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
              </>
            )}

            {order.status === 'pending' && (
              <>
                <div>
                  <input
                    value={markUtr}
                    onChange={(e) => setMarkUtr(e.target.value)}
                    placeholder="UTR (optional)"
                    className="input mb-2 w-full"
                  />
                  <button
                    className="btn btn-primary w-full"
                    disabled={!!acting}
                    onClick={() => act('mark-paid', 'mark-paid', markUtr ? { utr: markUtr } : {})}
                  >
                    {acting === 'mark-paid' ? 'Marking…' : 'Mark as paid'}
                  </button>
                </div>
                <button
                  className="btn btn-ghost w-full"
                  disabled={!!acting}
                  onClick={() => act('recheck', 'recheck')}
                >
                  {acting === 'recheck' ? 'Checking…' : 'Recheck status'}
                </button>
              </>
            )}

            <a href={`/pay/${order.order_no}`} target="_blank" rel="noreferrer" className="btn btn-ghost w-full">
              Open checkout page ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
