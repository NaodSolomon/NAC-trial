import { ConsentMapEmbed } from '@/components/shared/ConsentMapEmbed';
import type { Language } from '@/lib/i18n';

export function SecureMapEmbed({ url, language }: { url: string; language: Language }) {
  return (
    <ConsentMapEmbed
      url={url}
      language={language}
      title={language === 'am' ? 'የነህምያ ኦቲዝም ማዕከል ካርታ' : 'Map of Nehemiah Autism Center'}
    />
  );
}
