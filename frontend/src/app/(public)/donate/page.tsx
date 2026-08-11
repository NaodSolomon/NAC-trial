import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { TrialModeBanner } from '@/components/shared/TrialModeBanner';
import { DonationForm } from '@/features/donations/components/DonationForm';
import { DonationUnavailable } from '@/features/donations/components/DonationUnavailable';
import { loadDonationCapabilities } from '@/features/donations/donation.server';
import { localizedHref } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Donate | Nehemiah',
  description: 'Try the Nehemiah Autism Center donation demonstration without a real payment.',
};

export default async function DonatePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = await resolveRequestLanguage(lang);
  const capabilities = await loadDonationCapabilities().catch(() => null);

  return (
    <>
      {capabilities?.trialMode && <TrialModeBanner language={language} />}
      <PageBanner
        title={language === 'am' ? 'ይለግሱ' : 'Make a Donation'}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
          { label: language === 'am' ? 'ይለግሱ' : 'Donate' },
        ]}
      />

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-heading font-serif text-3xl font-medium">
              {language === 'am' ? 'የእርስዎ ልግስና ለውጥ ያመጣል' : 'Your Generosity Makes a Difference'}
            </h2>
            <p className="text-foreground mt-4">
              {capabilities?.trialMode
                ? language === 'am'
                  ? 'ይህ የሙከራ ልገሳ ሂደት ብቻ ነው። እውነተኛ ገንዘብ አይሰበሰብም።'
                  : 'Explore the complete donation journey in a safe demonstration. No real money is collected.'
                : language === 'am'
                  ? 'የእርስዎ ድጋፍ ለልጆችና ለቤተሰቦች ፕሮግራሞች ይረዳል።'
                  : 'Your support helps sustain programs for children and families.'}
            </p>
          </div>
          {capabilities?.canCreateDonation ? (
            <DonationForm capabilities={capabilities} language={language} />
          ) : (
            <DonationUnavailable language={language} />
          )}
        </div>
      </section>
    </>
  );
}
