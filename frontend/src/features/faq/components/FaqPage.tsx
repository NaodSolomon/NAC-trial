import PageBanner from '@/components/common/PageBanner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { sanitizeCmsText } from '@/features/cms';
import { localizedHref, translate, type Language } from '@/lib/i18n';
import type { FaqCollection, FaqItem } from '../faq.schemas';

function groupByCategory(items: FaqItem[], fallback: string) {
  const groups = new Map<string, FaqItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || fallback;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()];
}

export default function FaqPage({
  content,
  language,
  intro,
}: {
  content: FaqCollection;
  intro?: string | null;
  language: Language;
}) {
  const title = translate(language, 'faq');
  const groups = groupByCategory(content.items, translate(language, 'faqGeneral'));
  const showGroupHeadings = groups.length > 1;

  return (
    <>
      <PageBanner
        title={title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: title },
        ]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-foreground mx-auto mb-10 max-w-2xl text-center text-lg">
            {intro ?? translate(language, 'faqIntro')}
          </p>

          {content.items.length ? (
            groups.map(([category, items]) => (
              <div key={category} className="mb-10 last:mb-0">
                {showGroupHeadings && (
                  <h2 className="text-heading mb-4 text-xl font-semibold">{category}</h2>
                )}
                <Accordion type="single" collapsible className="w-full">
                  {items.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-heading text-base font-semibold sm:text-lg">
                        {sanitizeCmsText(item.question)}
                      </AccordionTrigger>
                      <AccordionContent className="text-foreground text-base leading-7">
                        {sanitizeCmsText(item.answer)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))
          ) : (
            <div role="status" className="bg-secondary-bg rounded-xl border p-10 text-center">
              <h2 className="text-heading text-2xl font-semibold">
                {translate(language, 'faqEmpty')}
              </h2>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
