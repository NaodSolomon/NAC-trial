'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

type DonationStatus = {
  id: string;
  amount: string;
  currency: string;
  status: string;
};

export default function SimulatedCheckoutPage() {
  const id = useSearchParams().get('donation');
  const [donation, setDonation] = useState<DonationStatus | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    void getDonation(id).then((nextDonation) => {
      if (!ignore) setDonation(nextDonation);
    });

    return () => {
      ignore = true;
    };
  }, [id]);

  async function simulate(action: 'confirm' | 'fail' | 'cancel') {
    if (!id) return;
    setBusy(true);
    if (action === 'cancel') {
      await apiClient.post(`/public/donations/${id}/cancel`);
    } else {
      const response = await apiClient.post<{ data: { receiptUrl?: string } }>(
        `/test/payments/${id}/${action}`,
      );
      setReceiptUrl(response.data.data.receiptUrl ?? '');
    }
    setDonation(await getDonation(id));
    setBusy(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <strong>Fake checkout.</strong> These buttons only change local test data. Do not enter
        payment credentials anywhere in this trial.
      </div>
      <h1 className="mt-8 text-3xl font-bold">Donation simulation</h1>
      {!id && <p className="mt-5 text-red-700">No donation ID was supplied.</p>}
      {donation && (
        <section className="mt-6 rounded-lg border p-6">
          <p className="text-2xl font-semibold">{donation.amount} {donation.currency}</p>
          <p className="mt-2">Status: <strong>{donation.status}</strong></p>
          {['INITIATED', 'PENDING'].includes(donation.status) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button disabled={busy} onClick={() => void simulate('confirm')} className="rounded bg-green-700 p-3 text-white">Confirm</button>
              <button disabled={busy} onClick={() => void simulate('fail')} className="rounded bg-red-700 p-3 text-white">Fail</button>
              <button disabled={busy} onClick={() => void simulate('cancel')} className="rounded border p-3">Cancel</button>
            </div>
          )}
          {receiptUrl && <a className="mt-6 block text-blue-700 underline" href={receiptUrl}>Open test receipt</a>}
        </section>
      )}
    </main>
  );
}

async function getDonation(id: string) {
  const response = await apiClient.get<{ data: DonationStatus }>(`/public/donations/${id}`);
  return response.data.data;
}
