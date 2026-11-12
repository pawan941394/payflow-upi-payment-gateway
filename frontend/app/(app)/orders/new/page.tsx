'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui';

type Order = { order_no: string };

export default function NewOrderPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [environment, setEnvironment] = useState('live');
  const [expiryMinutes, setExpiryMinutes] = useState('15');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        auth: true,
        body: {
          amount: Number(amount),
          note,
          customer_name: customerName,
          customer_email: customerEmail,
          environment,
          expiry_minutes: Number(expiryMinutes) || 15,
        },
      });
      router.push(`/orders/${order.order_no}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Could not create the payment link.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="New payment link" subtitle="Share the link or QR with your customer to collect via UPI." />

      <form onSubmit={submit} className="card space-y-5 p-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">{error}</div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Amount (₹)</label>
          <input
            type="number"
            required
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="499.00"
            className="input w-full"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What is this payment for?"
            className="input w-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Customer name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Customer email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Optional"
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Environment</label>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="input w-full">
              <option value="live">Live</option>
              <option value="sandbox">Sandbox · TEST</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Expires in (minutes)</label>
            <input
              type="number"
              min="1"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        <button className="btn btn-primary w-full" disabled={saving}>
          {saving ? 'Creating…' : 'Create payment link'}
        </button>
      </form>
    </div>
  );
}
