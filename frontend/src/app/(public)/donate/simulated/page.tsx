'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { browserApiClient } from '@/lib/api/browser-client';
import { getApiErrorMessage } from '@/lib/api/errors';

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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    void getDonation(id)
      .then((nextDonation) => {
        if (!ignore) setDonation(nextDonation);
      })
      .catch((error: unknown) => {
        if (!ignore) setErrorMessage(getApiErrorMessage(error));
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  async function simulate(action: 'confirm' | 'fail' | 'cancel') {
    if (!id) return;
    setBusy(true);
    setErrorMessage('');
    try {
      if (action === 'cancel') {
        await browserApiClient.post(`/public/donations/${id}/cancel`);
      } else {
        const response = await browserApiClient.post<{ receiptUrl?: string }>(
          `/test/payments/${id}/${action}`,
        );
        setReceiptUrl(response.receiptUrl ?? '');
      }
      setDonation(await getDonation(id));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <strong>Fake checkout.</strong> These buttons only change local test data. Do not enter
        payment credentials anywhere in this trial.
      </div>
      <h1 className="mt-8 text-3xl font-bold">Donation simulation</h1>
      {!id && <p className="mt-5 text-red-700">No donation ID was supplied.</p>}
      {errorMessage && (
        <p role="alert" className="mt-5 rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {errorMessage}
        </p>
      )}
      {donation && (
        <section className="mt-6 rounded-lg border p-6">
          <p className="text-2xl font-semibold">
            {donation.amount} {donation.currency}
          </p>
          <p className="mt-2">
            Status: <strong>{donation.status}</strong>
          </p>
          {['INITIATED', 'PENDING'].includes(donation.status) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                disabled={busy}
                onClick={() => void simulate('confirm')}
                className="rounded bg-green-700 p-3 text-white"
              >
                Confirm
              </button>
              <button
                disabled={busy}
                onClick={() => void simulate('fail')}
                className="rounded bg-red-700 p-3 text-white"
              >
                Fail
              </button>
              <button
                disabled={busy}
                onClick={() => void simulate('cancel')}
                className="rounded border p-3"
              >
                Cancel
              </button>
            </div>
          )}
          {receiptUrl && (
            <a className="mt-6 block text-blue-700 underline" href={receiptUrl}>
              Open test receipt
            </a>
          )}
        </section>
      )}
    </main>
  );
}

async function getDonation(id: string) {
  return browserApiClient.get<DonationStatus>(`/public/donations/${id}`);
}
