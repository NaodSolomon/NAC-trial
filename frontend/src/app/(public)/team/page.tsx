import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import TeamGrid from '@/features/team/components/TeamGrid';

export const metadata: Metadata = {
  title: 'Our Team - Nehemiah',
  description:
    'Meet the dedicated individuals who donate their time and skills to make our mission possible.',
};

export default function TeamPage() {
  return (
    <>
      <PageBanner
        title="Our Team"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Team' },
        ]}
        backgroundImage="/images/team_6.jpg"
      />
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <TeamGrid />
        </div>
      </section>
    </>
  );
}
