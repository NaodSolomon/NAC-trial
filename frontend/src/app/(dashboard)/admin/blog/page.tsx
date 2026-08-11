import type { Metadata } from 'next';
import { BlogAdmin } from '@/features/blog/BlogAdmin';
export const metadata: Metadata = { title: 'Blog administration' };
export default function BlogAdministrationPage() {
  return <BlogAdmin />;
}
