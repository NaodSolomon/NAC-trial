import type { Metadata } from 'next';
import { SettingsAdmin } from '@/features/settings';

export const metadata: Metadata = { title: 'Public settings administration' };

export default function SettingsAdministrationPage() {
  return <SettingsAdmin />;
}
