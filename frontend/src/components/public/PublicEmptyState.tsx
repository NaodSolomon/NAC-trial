'use client';

import { Inbox } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export function PublicEmptyState({ title, description }: { title?: string; description?: string }) {
  const { t } = useLanguage();
  return (
    <section className="mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <Inbox aria-hidden="true" className="text-primary size-12" />
      <h2 className="mt-5 text-2xl">{title ?? t('emptyTitle')}</h2>
      <p className="text-foreground mt-3">{description ?? t('emptyDescription')}</p>
    </section>
  );
}
