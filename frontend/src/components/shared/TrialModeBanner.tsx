import { FlaskConical } from 'lucide-react';
import type { Language } from '@/lib/i18n';

export function TrialModeBanner({ language }: { language: Language }) {
  return (
    <aside
      aria-label={language === 'am' ? 'የሙከራ ሁነታ' : 'Trial mode'}
      className="sticky top-0 z-30 border-y border-amber-400 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-center gap-3 text-sm sm:text-base">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>{language === 'am' ? 'የሙከራ ልገሳ፦' : 'Trial donation:'}</strong>{' '}
          {language === 'am'
            ? 'ይህ ማሳያ ብቻ ነው። እውነተኛ ገንዘብ አይሰበሰብም፤ የካርድ ወይም የባንክ መረጃ አያስገቡ።'
            : 'This is a demonstration only. No real money is collected, and no card or bank information should be entered.'}
        </p>
      </div>
    </aside>
  );
}
