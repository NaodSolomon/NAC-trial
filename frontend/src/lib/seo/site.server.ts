import 'server-only';

import type { Metadata } from 'next';
import { loadPublicSettings } from '@/features/settings/public-settings.server';
import { buildLocalizedMetadata } from './site';

type Input = Parameters<typeof buildLocalizedMetadata>[0];

// The settings-aware variant every public page uses. The pure builder stays
// importable from unit tests and non-request code.
export async function localizedPageMetadata(input: Input): Promise<Metadata> {
  const settings = await loadPublicSettings();
  return buildLocalizedMetadata({
    ...input,
    siteNameOverride: input.siteNameOverride ?? settings?.siteName ?? null,
    defaultImageUrl: input.defaultImageUrl ?? settings?.defaultShareImageUrl ?? null,
  });
}
