import PageBanner from '@/components/common/PageBanner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FaqComposition } from '@/features/cms';
import { sanitizeCmsText } from '@/features/cms';
import { localizedHref, type Language } from '@/lib/i18n';

export default function FaqPage({
  content,
  language,
}: {
  content: FaqComposition;
  language: Language;
}) {
  return (
    <>
      <PageBanner
        title={content.title}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
          { label: content.title },
        ]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4">
          {content.body && (
            <p className="text-foreground mx-auto mb-10 max-w-2xl text-center text-lg">
              {sanitizeCmsText(content.body)}
            </p>
          )}
          {content.items.length ? (
            <Accordion type="single" collapsible className="w-full">
              {content.items.map((item, index) => (
                <AccordionItem key={`${item.question}-${index}`} value={`faq-${index}`}>
                  <AccordionTrigger className="text-heading text-base font-semibold sm:text-lg">
                    {sanitizeCmsText(item.question)}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground text-base leading-7">
                    {sanitizeCmsText(item.answer)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div role="status" className="bg-secondary-bg rounded-xl border p-10 text-center">
              <h2 className="text-heading text-2xl font-semibold">
                {language === 'am' ? 'ጥያቄዎች በቅርቡ ይታከላሉ' : 'Questions will be added soon'}
              </h2>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
