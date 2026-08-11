import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const BlogAdmin = dynamic(() => import('@/features/blog/BlogAdmin').then((module) => module.BlogAdmin));
export const metadata: Metadata = { title: 'Blog administration' };
export default function BlogAdministrationPage() {
  return <BlogAdmin />;
}
