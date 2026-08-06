import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { DonationForm } from '@/features/donation';

export const metadata: Metadata = {
  title: 'Donate | Nehemiah',
};

export default function DonatePage() {
  return (
    <>
      <PageBanner
        title="Make a Donation"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Donate' }]}
      />

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-medium text-heading">
              Your Generosity Makes a Difference
            </h2>
            <p className="mt-4 text-foreground">
              Every donation, no matter how small, goes directly to supporting children&apos;s
              education, healthcare, and community development programs. Together, we can build a
              brighter future.
            </p>
          </div>
          <DonationForm />
        </div>
      </section>
    </>
  );
}
