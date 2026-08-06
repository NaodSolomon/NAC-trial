'use client';

import { useEffect } from 'react';
import { clearLegacyBrowserStorage } from '@/lib/auth';

export function LegacyAuthStorageCleaner() {
  useEffect(() => {
    clearLegacyBrowserStorage();
  }, []);
  return null;
}
