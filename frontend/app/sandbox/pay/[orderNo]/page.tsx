'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import {
  CheckoutShell,
  LoadErrorScreen,
  LoadingScreen,
  StatusBody,
  usePublicOrder,
} from '@/app/pay/checkout-ui';

function SimulateCard({ orderNo, status, onDone }: { orderNo: string; status: string; onDone: () => void }) {
  const [busy, setBusy] = useState<'success' | 'failure' | null>(null);
  const [error, setError] = useState('');
  const done = status === 'paid';

  const simulate = async (outcome: 'success' | 'failure') => {
    if (busy) return;
    setBusy(outcome);
    setError('');
    try {
      await api(`/sandbox/pay/${orderNo}/simulate`, { method: 'POST', body: { outcome }, auth: false });
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Simulation failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 w-full rounded-xl bg-amber-500/[0.07] p-4 ring-1 ring-amber-400/25">
      <div className="text-sm font-semibold text-amber-200">Sandbox controls</div>
      <p className="mt-1 text-xs text-amber-200/70">
        No real money moves here. Simulate the customer&apos;s payment outcome.
      </p>
      {done ? (
        <p className="mt-3 text-xs font-medium text-emerald-300">Order already paid — nothing to simulate.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => simulate('success')}
            disabled={!!busy}
            className="btn flex-1 bg-emerald-500 font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy === 'success' ? <Spinner /> : 'Simulate success'}
          </button>
          <button
            type="button"
            onClick={() => simulate('failure')}
            disabled={!!busy}
            className="btn btn-ghost flex-1 text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy === 'failure' ? <Spinner /> : 'Simulate failure'}
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  );
}

export default function SandboxPayPage() {
  const params = useParams<{ orderNo: string }>();
  const orderNo = params.orderNo;
  const { order, error, reload } = usePublicOrder(orderNo, true);

  if (error) return <LoadErrorScreen error={error} />;
  if (!order) return <LoadingScreen />;

  const banner = (
    <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-xs font-bold tracking-wide text-amber-950">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 9v4m0 4h.01M10.3 4.3 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      SANDBOX · TEST MODE — NO REAL MONEY MOVES
    </div>
  );

  return (
    <CheckoutShell order={order} banner={banner}>
      <StatusBody
        order={order}
        orderNo={orderNo}
        onSubmitted={reload}
        extra={<SimulateCard orderNo={orderNo} status={order.status} onDone={reload} />}
      />
    </CheckoutShell>
  );
}
