'use client';

import { useState } from 'react';
import { MapPinned } from 'lucide-react';
import type { Language } from '@/lib/i18n';

export function SecureMapEmbed({ url, language }: { url: string; language: Language }) {
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    return (
      <div className="bg-card flex min-h-72 flex-col items-center justify-center rounded-xl border p-8 text-center">
        <MapPinned aria-hidden="true" className="text-primary size-12" />
        <p className="text-foreground mt-4 max-w-xl">
          {language === 'am'
            ? 'ካርታውን ሲከፍቱ ከGoogle ጋር ግንኙነት ይፈጠራል።'
            : 'The map connects to Google only after you choose to load it.'}
        </p>
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="bg-primary hover:bg-primary-hover mt-5 min-h-12 rounded-lg px-6 font-semibold text-white"
        >
          {language === 'am' ? 'ካርታውን ይክፈቱ' : 'Load secure map'}
        </button>
      </div>
    );
  }
  return (
    <iframe
      src={url}
      title={language === 'am' ? 'የነህምያ ኦቲዝም ማዕከል ካርታ' : 'Map of Nehemiah Autism Center'}
      loading="lazy"
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-popups"
      className="h-96 w-full rounded-xl border"
    />
  );
}
