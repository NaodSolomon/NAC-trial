import { NewsletterSignup } from '@/features/engagement/components/NewsletterSignup';
import type { Language } from '@/lib/i18n';

export default function NewsletterSection({ language }: { language: Language }) {
  return (
    <section className="bg-primary py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="font-serif text-3xl font-semibold">
            {language === 'am' ? 'የዜና መልእክታችንን ይቀበሉ' : 'Subscribe to our newsletter'}
          </h2>
          <p className="mt-2 text-white/85">
            {language === 'am'
              ? 'የማዕከሉን ዜናና የማህበረሰብ ዕድሎች በኢሜይል ያግኙ።'
              : 'Receive center news and community opportunities by email.'}
          </p>
        </div>
        <NewsletterSignup language={language} />
      </div>
    </section>
  );
}
