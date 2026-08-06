import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageBanner from '@/components/common/PageBanner';
import TeamSingle from '@/features/team/components/TeamSingle';
import { teamMembers } from '@/features/team/data';

interface TeamMemberPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return teamMembers.map((member) => ({
    slug: member.slug,
  }));
}

export async function generateMetadata({ params }: TeamMemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = teamMembers.find((m) => m.slug === slug);

  if (!member) {
    return { title: 'Team Member Not Found - Nehemiah' };
  }

  return {
    title: `${member.name} - Nehemiah`,
    description: `${member.name} is a ${member.role} at Nehemiah. Learn more about their contributions and expertise.`,
  };
}

export default async function TeamMemberPage({ params }: TeamMemberPageProps) {
  const { slug } = await params;
  const member = teamMembers.find((m) => m.slug === slug);

  if (!member) {
    notFound();
  }

  return (
    <>
      <PageBanner
        title={member.name}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Team', href: '/team' },
          { label: member.name },
        ]}
        backgroundImage={member.image}
      />
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <TeamSingle member={member} />
        </div>
      </section>
    </>
  );
}
