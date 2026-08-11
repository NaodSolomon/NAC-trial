import { ShieldAlert } from 'lucide-react';
import type { Language } from '@/lib/i18n';

export function DonationUnavailable({ language }: { language: Language }) {
  return (
    <section role="status" className="bg-secondary-bg rounded-xl border p-8 text-center">
      <ShieldAlert aria-hidden="true" className="text-primary mx-auto size-12" />
      <h2 className="text-heading mt-4 font-serif text-2xl">
        {language === 'am' ? 'የልገሳ ማሳያው አይገኝም' : 'Donation demonstration unavailable'}
      </h2>
      <p className="text-foreground mx-auto mt-3 max-w-xl">
        {language === 'am'
          ? 'ምንም የክፍያ መግቢያ አልተነቃም። ምንም መረጃ አልተላከም እና ገንዘብ አልተሰበሰበም።'
          : 'No payment gateway is enabled. No information was submitted and no money was collected.'}
      </p>
    </section>
  );
}
