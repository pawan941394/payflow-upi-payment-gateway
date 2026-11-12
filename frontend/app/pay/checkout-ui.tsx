'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, api } from '@/lib/api';
import { Spinner, inr } from '@/components/ui';

export type PublicOrder = {
  order_no: string;
  merchant: string;
  amount: string;
  note: string;
  status: string;
  environment: string;
  customer_name: string;
  upi_id: string;
  customer_utr: string;
  utr: string;
  utr_submitted_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  upi_intent: string;
};

const CIRC = 100.5;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

export function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function CountdownRing({ createdAt, expiresAt }: { createdAt: string; expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const total = Math.max(1, (new Date(expiresAt).getTime() - new Date(createdAt).getTime()) / 1000);
  const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const display = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const offset = (CIRC * (1 - left / total)).toFixed(2);
  const stroke = left < 60 ? '#f87171' : '#34d399';
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="16" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-mono text-xs font-medium text-white">{display}</div>
      </div>
      <div className="text-sm">
        <div className="font-medium text-white">Complete payment in time</div>
        <div className="text-xs text-slate-400">This QR code expires automatically.</div>
      </div>
    </div>
  );
}

function UpiChips() {
  const apps: Array<[string, string]> = [
    ['GPay', 'text-sky-300'],
    ['PhonePe', 'text-violet-300'],
    ['Paytm', 'text-cyan-300'],
    ['BHIM', 'text-orange-300'],
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {apps.map(([name, color]) => (
        <span key={name} className={`rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold ring-1 ring-white/10 ${color}`}>
          {name}
        </span>
      ))}
    </div>
  );
}

function UtrForm({ orderNo, onSubmitted }: { orderNo: string; onSubmitted: () => void }) {
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^[a-zA-Z0-9]{10,22}$/.test(utr.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/pay/${orderNo}/utr`, { method: 'POST', body: { utr: utr.trim() }, auth: false });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || 'Could not submit UTR. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 w-full">
      <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
        <div className="mb-2 text-xs font-medium text-slate-300">Already paid? Enter your UPI reference (UTR)</div>
        <div className="flex gap-2">
          <input
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="e.g. 325411223344"
            className="input flex-1 font-mono text-sm"
            maxLength={22}
          />
          <button type="submit" disabled={!valid || busy} className="btn btn-primary shrink-0 disabled:opacity-40">
            {busy ? <Spinner /> : 'Submit'}
          </button>
        </div>
        {utr && !valid && <div className="mt-1.5 text-xs text-amber-300">UTR must be 10–22 letters/numbers.</div>}
        {error && <div className="mt-1.5 text-xs text-red-400">{error}</div>}
      </div>
    </form>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="truncate font-mono text-sm font-medium text-white">{value}</div>
      </div>
      <button
        type="button"
        className="btn btn-ghost shrink-0 text-xs"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}

export function CheckoutShell({
  order,
  children,
  banner,
}: {
  order: PublicOrder;
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#060913] text-slate-200">
      <style>{`
        @keyframes pop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        .pop { animation: pop .5s cubic-bezier(.22,1,.36,1) both }
        @keyframes drawCheck { to { stroke-dashoffset: 0 } }
        .draw { stroke-dasharray: 30; stroke-dashoffset: 30; animation: drawCheck .45s .25s ease-out forwards }
        .glow-bg { background:
          radial-gradient(60rem 30rem at 15% -10%, rgba(16,185,129,.14), transparent 60%),
          radial-gradient(50rem 28rem at 110% 110%, rgba(56,189,248,.10), transparent 60%); }
      `}</style>
      {banner}
      <div className="glow-bg flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white/[0.04] shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-xl md:grid-cols-5">
          <div className="relative flex flex-col overflow-hidden bg-gradient-to-br from-emerald-950/70 via-[#071018] to-[#060913] p-6 sm:p-8 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-base font-bold text-emerald-950 ring-1 ring-white/20">
                {initials(order.merchant)}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400">Paying to</div>
                <div className="truncate font-semibold text-white">{order.merchant}</div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-xs uppercase tracking-wider text-slate-400">Amount</div>
              <div className="mt-1 text-4xl font-bold tracking-tight text-white tabular-nums">{inr(order.amount)}</div>
              {order.note && <div className="mt-2 text-sm text-slate-400">{order.note}</div>}
            </div>

            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="whitespace-nowrap text-slate-500">Order ID</dt>
                <dd className="truncate font-mono text-xs text-slate-300">{order.order_no}</dd>
              </div>
              {order.customer_name && (
                <div className="flex justify-between gap-4">
                  <dt className="whitespace-nowrap text-slate-500">Customer</dt>
                  <dd className="truncate text-slate-300">{order.customer_name}</dd>
                </div>
              )}
              {order.upi_id && (
                <div className="flex justify-between gap-4">
                  <dt className="whitespace-nowrap text-slate-500">UPI ID</dt>
                  <dd className="truncate font-mono text-xs text-slate-300">{order.upi_id}</dd>
                </div>
              )}
            </dl>

            {order.status === 'pending' && order.expires_at && (
              <div className="mt-8 pt-6 md:mt-auto">
                <CountdownRing createdAt={order.created_at} expiresAt={order.expires_at} />
              </div>
            )}
          </div>

          <div className="flex flex-col p-6 sm:p-8 md:col-span-3">{children}</div>
        </div>
      </div>

      <footer className="flex flex-col items-center gap-1.5 pb-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Secured by <span className="font-semibold text-slate-400">PayFlow</span>
        </div>
        <div>Payments go directly to the merchant&apos;s bank via UPI.</div>
      </footer>
    </div>
  );
}

export function StatusBody({
  order,
  orderNo,
  onSubmitted,
  extra,
}: {
  order: PublicOrder;
  orderNo: string;
  onSubmitted: () => void;
  extra?: React.ReactNode;
}) {
  if (order.status === 'paid') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="pop grid h-20 w-20 place-items-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="draw" d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Payment successful</h1>
        <p className="mt-2 text-slate-400">{inr(order.amount)} paid to {order.merchant}</p>
        <dl className="mt-8 w-full max-w-xs divide-y divide-white/10 rounded-xl bg-white/[0.04] text-left text-sm ring-1 ring-white/10">
          {order.utr && (
            <div className="flex justify-between px-4 py-3">
              <dt className="text-slate-400">UTR</dt>
              <dd className="font-mono font-medium text-white">{order.utr}</dd>
            </div>
          )}
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-400">Paid at</dt>
            <dd className="font-medium text-white">{fmtDate(order.paid_at)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-slate-500">You can safely close this page.</p>
        {extra}
      </div>
    );
  }

  if (order.status === 'review') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="relative grid h-20 w-20 place-items-center rounded-full bg-sky-500/10 text-sky-300">
          <svg className="absolute inset-0 h-20 w-20 animate-spin [animation-duration:2.5s]" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="currentColor" strokeOpacity=".15" strokeWidth="3" />
            <path d="M78 40A38 38 0 0 0 40 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Z" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Verifying your payment</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          {order.merchant} is confirming your UTR. This page updates automatically once it&apos;s approved.
        </p>
        <dl className="mt-8 w-full max-w-xs divide-y divide-white/10 rounded-xl bg-white/[0.04] text-left text-sm ring-1 ring-white/10">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-400">Your UTR</dt>
            <dd className="font-mono font-medium text-white">{order.customer_utr}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-400">Submitted</dt>
            <dd className="font-medium text-white">{fmtDate(order.utr_submitted_at)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-slate-500">Don&apos;t pay again — the merchant will be notified once confirmed.</p>
        {extra}
      </div>
    );
  }

  if (order.status === 'expired' || order.status === 'failed') {
    const failed = order.status === 'failed';
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div className={`grid h-20 w-20 place-items-center rounded-full ${failed ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.06] text-slate-400'}`}>
          {failed ? (
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
          {failed ? 'Payment failed' : 'Payment link expired'}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          {failed
            ? 'This payment was not completed. Ask the merchant for a new link.'
            : `If you already paid, don't pay again — submit your UTR below so ${order.merchant} can confirm it.`}
        </p>
        {!failed && <UtrForm orderNo={orderNo} onSubmitted={onSubmitted} />}
        {extra}
      </div>
    );
  }

  const qrUrl = `${API_BASE}/pay/${orderNo}/qr.png`;
  return (
    <>
      <div className="text-center">
        <h1 className="text-lg font-semibold text-white">Scan &amp; pay with any UPI app</h1>
        <p className="mt-1 text-sm text-slate-400">Open your UPI app, scan the QR and approve the payment.</p>
      </div>

      <div className="relative mx-auto mt-6 rounded-2xl bg-white p-3 shadow-lg shadow-black/40">
        <span className="absolute -left-px -top-px h-6 w-6 rounded-tl-2xl border-l-[3px] border-t-[3px] border-emerald-400" />
        <span className="absolute -right-px -top-px h-6 w-6 rounded-tr-2xl border-r-[3px] border-t-[3px] border-emerald-400" />
        <span className="absolute -bottom-px -left-px h-6 w-6 rounded-bl-2xl border-b-[3px] border-l-[3px] border-emerald-400" />
        <span className="absolute -bottom-px -right-px h-6 w-6 rounded-br-2xl border-b-[3px] border-r-[3px] border-emerald-400" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt={`UPI QR code for ${inr(order.amount)}`} className="h-52 w-52 sm:h-56 sm:w-56" />
      </div>

      <div className="mt-5">
        <UpiChips />
      </div>

      {order.upi_intent && (
        <div className="mt-6 md:hidden">
          <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />OR PAY ON THIS PHONE<span className="h-px flex-1 bg-white/10" />
          </div>
          <a href={order.upi_intent} className="btn btn-primary w-full text-base">
            Pay {inr(order.amount)} with UPI app
          </a>
        </div>
      )}

      {order.upi_id && <CopyRow label="Or pay to UPI ID" value={order.upi_id} />}

      <UtrForm orderNo={orderNo} onSubmitted={onSubmitted} />
      {extra}

      <div className="mt-auto pt-6">
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-400/20">
          <Spinner />
          <span>After paying, submit your UTR above</span>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">Please don&apos;t close or refresh this page after paying.</p>
      </div>
    </>
  );
}

export function usePublicOrder(orderNo: string, sandbox?: boolean) {
  const base = sandbox ? `/sandbox/pay/${orderNo}` : `/pay/${orderNo}`;
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState('');
  const statusRef = useRef<string>('');

  const load = useCallback(async () => {
    try {
      const o = await api<PublicOrder>(base, { auth: false });
      statusRef.current = o.status;
      setOrder(o);
      setError('');
    } catch (err: any) {
      setError(err?.status === 404 ? 'Payment link not found.' : err?.message || 'Could not load this payment.');
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(async () => {
      const current = statusRef.current;
      if (current !== 'pending' && current !== 'review') return;
      try {
        const s = await api<{ status: string }>(`/pay/${orderNo}/status`, { auth: false });
        if (s.status !== current) load();
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [orderNo, load]);

  return { order, error, reload: load };
}

export function LoadErrorScreen({ error }: { error: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#060913] p-6 text-center">
      <div>
        <div className="text-5xl">🔍</div>
        <h1 className="mt-4 text-xl font-bold text-white">{error}</h1>
        <p className="mt-2 text-sm text-slate-400">Check the link or ask the merchant for a new one.</p>
      </div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#060913]">
      <Spinner />
    </div>
  );
}
