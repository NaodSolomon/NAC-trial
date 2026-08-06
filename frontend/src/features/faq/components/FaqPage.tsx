import PageBanner from '@/components/common/PageBanner';
import SectionHeading from '@/components/common/SectionHeading';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqs } from '@/features/faq/data';

export default function FaqPage() {
  return (
    <>
      <PageBanner
        title="Frequently Asked Questions"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]}
      />

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <SectionHeading title="Common" highlightedWord="Questions" align="center" />

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="font-serif text-base font-semibold text-heading">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
