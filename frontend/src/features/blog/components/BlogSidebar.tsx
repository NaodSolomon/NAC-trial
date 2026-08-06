import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { blogPosts } from '@/features/blog/data';

const categories = [
  { name: 'Donations', count: 4 },
  { name: 'Volunteering', count: 6 },
  { name: 'Education', count: 5 },
  { name: 'Health', count: 3 },
  { name: 'Community', count: 7 },
];

const tags = [
  'donations',
  'volunteering',
  'education',
  'health',
  'community',
  'clean water',
  'sustainability',
  'empowerment',
  'scholarships',
  'impact',
];

export default function BlogSidebar() {
  return (
    <aside className="space-y-8">
      {/* Search */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h4 className="mb-4 font-serif text-lg font-semibold text-heading">Search</h4>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search posts..."
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h4 className="mb-4 font-serif text-lg font-semibold text-heading">Categories</h4>
        <ul className="space-y-3">
          {categories.map((category) => (
            <li key={category.name}>
              <Link
                href={`/blog?category=${category.name.toLowerCase()}`}
                className="flex items-center justify-between text-sm text-foreground transition hover:text-primary"
              >
                <span>{category.name}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold">
                  {category.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Recent Posts */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h4 className="mb-4 font-serif text-lg font-semibold text-heading">Recent Posts</h4>
        <div className="space-y-4">
          {blogPosts.slice(0, 3).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex items-center gap-3 group"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded">
                <Image src={post.image} alt={post.title} fill className="object-cover" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-heading transition group-hover:text-primary">
                  {post.title}
                </h5>
                <p className="text-xs text-foreground">{post.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tags Cloud */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h4 className="mb-4 font-serif text-lg font-semibold text-heading">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag} href={`/blog?tag=${tag}`}>
              <Badge
                variant="secondary"
                className="cursor-pointer transition hover:bg-primary hover:text-white"
              >
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
