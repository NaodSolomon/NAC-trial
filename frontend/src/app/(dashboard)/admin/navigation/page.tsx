import type { Metadata } from 'next';
import { NavigationAdmin } from '@/features/navigation';

export const metadata: Metadata = { title: 'Navigation administration' };

export default function NavigationAdministrationPage() {
  return <NavigationAdmin />;
}
