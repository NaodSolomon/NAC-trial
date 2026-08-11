'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, CircleX, LoaderCircle } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Language } from '@/lib/i18n';
import { cancelDonation, refreshDonation, simulateDonation } from '../donation.client';
import type { DonationCapabilities, PublicDonation } from '../donation.types';

export function DonationCheckout({
  capabilities,
  initialDonation,
  language,
}: {
  capabilities: DonationCapabilities | null;
  initialDonation: PublicDonation;
  language: Language;
}) {
  const inFlight = useRef(false);
  const [donation, setDonation] = useState(initialDonation);
  const [receiptUrl, setReceiptUrl] = useState(initialDonation.receiptUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trialControls = capabilities?.trialControlsEnabled === true;
  const pending = donation.status === 'INITIATED' || donation.status === 'PENDING';

  async function act(action: 'confirm' | 'fail' | 'cancel') {
    if (inFlight.current || !pending) return;
    if (action !== 'cancel' && !trialControls) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (action === 'cancel') {
        await cancelDonation(donation.id);
        setMessage(
          language === 'am' ? 'የሙከራ ልገሳው ተሰርዟል።' : 'The donation demonstration was cancelled.',
        );
      } else {
        const result = await simulateDonation(donation.id, action);
        if (result.receiptUrl) setReceiptUrl(result.receiptUrl);
        setMessage(
          action === 'confirm'
            ? result.duplicate
              ? language === 'am'
                ? 'ማረጋገጫው አስቀድሞ ተካሂዷል፤ ሁለተኛ ልገሳ አልተፈጠረም።'
                : 'This confirmation was already processed; no second donation was created.'
              : language === 'am'
                ? 'የሙከራ ልገሳው ተረጋግጧል። እውነተኛ ገንዘብ አልተሰበሰበም።'
                : 'The trial donation was confirmed. No real money was collected.'
            : language === 'am'
              ? 'የሙከራ ልገሳው አልተሳካም ተብሎ ተመዝግቧል።'
              : 'The trial donation was marked as failed.',
        );
      }
      setDonation(await refreshDonation(donation.id));
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="checkout-heading"
      className="bg-card rounded-xl border p-6 shadow-sm sm:p-8"
    >
      <h1 id="checkout-heading" className="text-heading font-serif text-3xl">
        {language === 'am' ? 'የልገሳ ማሳያ' : 'Donation simulation'}
      </h1>
      <dl className="mt-7 grid gap-5 rounded-lg bg-gray-50 p-5 sm:grid-cols-2">
        <div>
          <dt className="text-foreground text-sm">{language === 'am' ? 'መጠን' : 'Amount'}</dt>
          <dd className="text-heading mt-1 text-2xl font-semibold">
            {donation.amount} {donation.currency}
          </dd>
        </div>
        <div>
          <dt className="text-foreground text-sm">{language === 'am' ? 'ሁኔታ' : 'Status'}</dt>
          <dd className="text-heading mt-1 font-semibold">{donation.status}</dd>
        </div>
      </dl>

      {trialControls && pending && (
        <div
          aria-label={language === 'am' ? 'የሙከራ ክፍያ መቆጣጠሪያዎች' : 'Trial payment controls'}
          className="mt-7 grid gap-3 sm:grid-cols-3"
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('confirm')}
            className="min-h-12 rounded-lg bg-green-700 px-5 font-semibold text-white disabled:opacity-60"
          >
            {language === 'am' ? 'አረጋግጥ' : 'Confirm simulation'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('fail')}
            className="min-h-12 rounded-lg bg-red-700 px-5 font-semibold text-white disabled:opacity-60"
          >
            {language === 'am' ? 'አልተሳካም' : 'Simulate failure'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void act('cancel')}
            className="min-h-12 rounded-lg border px-5 font-semibold disabled:opacity-60"
          >
            {language === 'am' ? 'ሰርዝ' : 'Cancel'}
          </button>
        </div>
      )}

      {!trialControls && pending && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          {language === 'am'
            ? 'የሙከራ መቆጣጠሪያዎች አልተነቁም።'
            : 'Trial payment controls are not available in this runtime.'}
        </p>
      )}

      {busy && (
        <p role="status" className="text-foreground mt-5 flex items-center gap-2">
          <LoaderCircle
            aria-hidden="true"
            className="size-5 animate-spin motion-reduce:animate-none"
          />
          {language === 'am' ? 'በማዘመን ላይ…' : 'Updating simulation…'}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-green-900"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          <CircleX aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}
      {receiptUrl && donation.status === 'CONFIRMED' && (
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-6 inline-flex min-h-11 items-center font-semibold underline"
        >
          {language === 'am' ? 'የሙከራ ደረሰኝ ይክፈቱ' : 'Open test receipt'}
        </a>
      )}
    </section>
  );
}
