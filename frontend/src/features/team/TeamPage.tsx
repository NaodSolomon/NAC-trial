import PageBanner from '@/components/common/PageBanner';
import {
  cmsBannerImage,
  CmsArticle,
  teamMetadataSchema,
  type PublishedCmsPage,
} from '@/features/cms';
import { localizedHref, translate, type Language } from '@/lib/i18n';

export function TeamPage({ page, language }: { page: PublishedCmsPage; language: Language }) {
  const composition = teamMetadataSchema.parse(page.metadata);

  return (
    <>
      <PageBanner
        title={page.title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: page.title },
        ]}
        backgroundImage={cmsBannerImage(page.metadata) ?? '/images/about-us.jpg'}
      />
      <section className="bg-secondary-bg py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="bg-card mx-auto max-w-4xl rounded-xl border p-7 shadow-sm">
            <CmsArticle content={page.content} />
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {composition.teamMembers.map((member) => (
              <article
                key={`${member.name}-${member.role}`}
                className="bg-card rounded-xl border p-6 shadow-sm"
              >
                <div
                  aria-hidden="true"
                  className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full text-xl font-bold"
                >
                  {initials(member.name)}
                </div>
                <h2 className="text-heading mt-5 text-xl font-semibold">{member.name}</h2>
                <p className="text-primary mt-1 font-medium">{member.role}</p>
                <p className="text-foreground mt-4 leading-7 whitespace-pre-line">
                  {member.biography}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
