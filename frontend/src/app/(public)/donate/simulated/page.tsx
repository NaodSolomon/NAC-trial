import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { TrialModeBanner } from '@/components/shared/TrialModeBanner';
import { DonationCheckout } from '@/features/donations/components/DonationCheckout';
import { DonationUnavailable } from '@/features/donations/components/DonationUnavailable';
import { loadDonationCapabilities, loadPublicDonation } from '@/features/donations/donation.server';
import { localizedHref, translate } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Donation simulation | Nehemiah',
  robots: { index: false, follow: false },
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SimulatedCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string; lang?: string }>;
}) {
  const query = await searchParams;
  const language = await resolveRequestLanguage(query.lang);
  const donationId = query.donation?.trim() ?? '';
  const capabilities = await loadDonationCapabilities().catch(() => null);
  const donation = uuidPattern.test(donationId)
    ? await loadPublicDonation(donationId).catch(() => null)
    : null;

  return (
    <>
      {capabilities?.trialMode && <TrialModeBanner language={language} />}
      <PageBanner
        title={language === 'am' ? 'የልገሳ ሙከራ' : 'Donation Simulation'}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          {
            label: language === 'am' ? 'ይለግሱ' : 'Donate',
            href: localizedHref('/donate', language),
          },
          { label: language === 'am' ? 'ሙከራ' : 'Simulation' },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-16">
        {!capabilities ? (
          <DonationUnavailable language={language} />
        ) : !donation ? (
          <section
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-8 text-red-900"
          >
            <h1 className="font-serif text-2xl font-semibold">
              {language === 'am' ? 'ልገሳው አልተገኘም' : 'Donation not found'}
            </h1>
            <p className="mt-3">
              {language === 'am'
                ? 'የልገሳ አድራሻው የተሳሳተ ወይም ጊዜው ያለፈበት ሊሆን ይችላል።'
                : 'The donation link is invalid, unavailable, or no longer exists.'}
            </p>
          </section>
        ) : (
          <DonationCheckout
            capabilities={capabilities}
            initialDonation={donation}
            language={language}
          />
        )}
      </div>
    </>
  );
}
