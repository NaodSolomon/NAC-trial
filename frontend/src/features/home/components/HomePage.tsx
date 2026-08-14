import NewsletterSection from '@/components/common/NewsletterSection';
import {
  HomeBlogTeasers,
  HomeCallToAction,
  HomeEventTeasers,
  HomeGalleryTeasers,
  HomeHero,
  HomeLocation,
  HomeServices,
} from '@/components/public/home';
import type { HomePageData, HomeSection } from '../home.types';

export default function HomePage({ data }: { data: HomePageData }) {
  return (
    <>
      {data.composition.sections.map((section, index) => (
        <HomeSectionRenderer
          key={`${section.type}-${index}`}
          section={section}
          language={data.language}
        />
      ))}
      {data.events && <HomeEventTeasers events={data.events} language={data.language} />}
      {data.blogPosts && <HomeBlogTeasers posts={data.blogPosts} language={data.language} />}
      {data.galleryItems && (
        <HomeGalleryTeasers items={data.galleryItems} language={data.language} />
      )}
      <NewsletterSection language={data.language} />
    </>
  );
}

function HomeSectionRenderer({
  section,
  language,
}: {
  section: HomeSection;
  language: HomePageData['language'];
}) {
  switch (section.type) {
    case 'hero':
      return <HomeHero section={section} language={language} />;
    case 'services':
      return <HomeServices section={section} />;
    case 'location':
      return <HomeLocation section={section} language={language} />;
    case 'callToAction':
      return <HomeCallToAction section={section} language={language} />;
  }
}
