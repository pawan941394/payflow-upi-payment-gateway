'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader, Spinner, StatusBadge, inr } from '@/components/ui';
import { fmtDate } from '@/app/pay/checkout-ui';

type WebhookLogRow = {
  id?: number;
  event: string;
  url: string;
  attempts: number;
  response_status: number | null;
  success: boolean;
  created_at: string;
};

function pickOrder(res: any): any {
  return res && typeof res === 'object' && res.order ? res.order : res;
}

function pickLogs(res: any): WebhookLogRow[] {
  if (!res || typeof res !== 'object') return [];
  return res.webhook_logs || res.logs || [];
}

function TimelineCard({ timeline }: { timeline: any }) {
  let rows: Array<{ label: string; at: string | null }> = [];
  if (Array.isArray(timeline)) {
    rows = timeline.map((t: any) => ({
      label: t.label || t.event || t.stage || String(t.key ?? ''),
      at: t.at || t.timestamp || t.time || null,
    }));
  } else if (timeline && typeof timeline === 'object') {
    rows = Object.entries(timeline).map(([k, v]) => ({
      label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      at: typeof v === 'string' ? v : null,
    }));
  }
  if (rows.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="mb-4 text-sm font-semibold text-white">Timeline</div>
      <ol className="space-y-0">
        {rows.map((r, i) => (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {i < rows.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-white/10" />}
            <span className={`mt-1 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-white/10 ${r.at ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-200">{r.label}</div>
              <div className="text-xs text-slate-500">{r.at ? fmtDate(r.at) : 'Not yet'}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNo: string }>();
  const orderNo = params.orderNo;

  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<WebhookLogRow[]>([]);
  const [debug, setDebug] = useState<any>(null);
  const [error, setError] = useState('');
  const [overrideUtr, setOverrideUtr] = useState('');
  const [overriding, setOverriding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<any>(`/admin/orders/${orderNo}`);
      setOrder(pickOrder(res));
      setLogs(pickLogs(res));
      setError('');
    } catch (err: any) {
      setError(err?.status === 404 ? 'Order not found.' : err?.message || 'Could not load order.');
      return;
    }
    try {
      const dbg = await api<any>(`/admin/transaction-debugger/${orderNo}`);
      setDebug(dbg);
    } catch {}
  }, [orderNo]);

  useEffect(() => {
    load();
  }, [load]);

  const manualOverride = async () => {
    if (!window.confirm(`Force-mark ${orderNo} as PAID? This fires the merchant webhook and is audit-logged.`)) return;
    setOverriding(true);
    try {
      await api(`/admin/orders/${orderNo}/manual-payment-override`, {
        method: 'POST',
        body: overrideUtr.trim() ? { utr: overrideUtr.trim() } : {},
      });
      setOverrideUtr('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Override failed.');
    } finally {
      setOverriding(false);
    }
  };

  if (error && !order) {
    return (
      <div>
        <PageHeader title="Order" subtitle={error} />
        <Link href="/admin/orders" className="btn btn-ghost text-sm">← Back to all orders</Link>
      </div>
    );
  }

  if (!order) {
    return <div className="grid place-items-center py-24"><Spinner /></div>;
  }

  const allLogs: WebhookLogRow[] = logs.length ? logs : pickLogs(debug);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/orders" className="text-sm text-slate-400 hover:text-white">← All orders</Link>
      </div>
      <PageHeader
        title={order.order_no}
        subtitle={`${order.merchant || order.username || debug?.merchant?.display_name || ''}`}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Order card */}
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Amount</div>
                <div className="mt-1 text-3xl font-bold tracking-tight text-white tabular-nums">{inr(order.amount)}</div>
                {order.note && <div className="mt-1 text-sm text-slate-400">{order.note}</div>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                {order.environment === 'sandbox' && (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/20">TEST</span>
                )}
              </div>
            </div>
            <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ['Customer', order.customer_name || '—'],
                ['Customer email', order.customer_email || '—'],
                ['UTR', order.utr || '—'],
                ['Customer UTR', order.customer_utr || '—'],
                ['Created', fmtDate(order.created_at)],
                ['Expires', fmtDate(order.expires_at)],
                ['UTR submitted', fmtDate(order.utr_submitted_at)],
                ['Paid at', fmtDate(order.paid_at)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className={`truncate text-right ${label === 'UTR' || label === 'Customer UTR' ? 'font-mono text-xs' : ''} text-slate-200`}>{value as string}</dd>
                </div>
              ))}
            </dl>
            {order.payment_account && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm ring-1 ring-white/10">
                <span className="text-slate-400">Payment account</span>
                <span className="font-mono text-xs text-slate-200">
                  {order.payment_account.label} · {order.payment_account.upi_id}
                </span>
              </div>
            )}
          </div>

          {/* Webhook logs */}
          <div className="card overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-4 text-sm font-semibold text-white">Webhook deliveries</div>
            {allLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">No webhook deliveries for this order.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2.5">Event</th>
                      <th className="px-4 py-2.5">URL</th>
                      <th className="px-4 py-2.5 text-right">Attempts</th>
                      <th className="px-4 py-2.5 text-right">HTTP</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5">At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {allLogs.map((l, i) => (
                      <tr key={l.id ?? i}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{l.event}</td>
                        <td className="max-w-48 truncate px-4 py-2.5 font-mono text-xs text-slate-400" title={l.url}>{l.url}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{l.attempts}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{l.response_status ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {l.success ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">Delivered</span>
                          ) : (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/20">Failed</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{fmtDate(l.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {debug?.timeline && <TimelineCard timeline={debug.timeline} />}

          {/* Manual override */}
          {order.status !== 'paid' && (
            <div className="card border border-red-400/20 p-5">
              <div className="text-sm font-semibold text-red-300">Manual payment override</div>
              <p className="mt-1 text-xs text-slate-400">
                Force-mark this order as paid. Fires the merchant&apos;s webhook and writes an admin audit log. Use only after
                verifying the payment with the bank.
              </p>
              <input
                value={overrideUtr}
                onChange={(e) => setOverrideUtr(e.target.value)}
                placeholder="UTR (optional)"
                className="input mt-3 w-full font-mono text-sm"
                maxLength={22}
              />
              <button
                type="button"
                onClick={manualOverride}
                disabled={overriding}
                className="btn mt-3 w-full bg-red-500/90 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {overriding ? <Spinner /> : 'Force mark as paid'}
              </button>
              {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
            </div>
          )}

          {debug?.merchant && (
            <div className="card p-5 text-sm">
              <div className="mb-3 font-semibold text-white">Merchant</div>
              <div className="text-slate-200">{debug.merchant.display_name || debug.merchant.business_name || debug.merchant.username}</div>
              <div className="text-xs text-slate-500">@{debug.merchant.username} · {debug.merchant.email}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
