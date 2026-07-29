'use client';

import { FormEvent, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type DonationResult = { donationId: string; paymentUrl: string };

export default function DonatePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<{ data: DonationResult }>('/public/donations', {
        amount: Number(data.get('amount')),
        currency: data.get('currency'),
        gateway: 'PAYPAL',
        donorName: data.get('donorName'),
        donorEmail: data.get('donorEmail'),
        message: data.get('message') || undefined,
      });
      window.location.assign(response.data.data.paymentUrl);
    } catch {
      setError('The simulated donation could not be created.');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <strong>Trial demonstration only.</strong> No real money is collected, and this form
        never asks for card or bank details.
      </div>
      <h1 className="text-3xl font-bold">Simulate a donation</h1>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <label className="block">Name<input name="donorName" required className="mt-1 w-full rounded border p-3" /></label>
        <label className="block">Email<input name="donorEmail" type="email" required className="mt-1 w-full rounded border p-3" /></label>
        <div className="grid grid-cols-2 gap-4">
          <label>Amount<input name="amount" type="number" min="1" step="0.01" required className="mt-1 w-full rounded border p-3" /></label>
          <label>Currency<select name="currency" className="mt-1 w-full rounded border p-3"><option>USD</option><option>ETB</option></select></label>
        </div>
        <label className="block">Message (optional)<textarea name="message" className="mt-1 w-full rounded border p-3" /></label>
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? 'Creating simulation…' : 'Continue to simulated checkout'}
        </button>
      </form>
    </main>
  );
}
