import Image from 'next/image';
import { Calendar, User, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { BlogPost } from '@/features/blog/types';

interface BlogSingleProps {
  post: BlogPost;
}

export default function BlogSingle({ post }: BlogSingleProps) {
  return (
    <article className="space-y-8">
      {/* Featured Image */}
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Image src={post.image} alt={post.title} fill className="object-cover" />
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-foreground">
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {post.date}
        </span>
        <span className="flex items-center gap-1">
          <User size={14} />
          {post.author}
        </span>
        <span className="flex items-center gap-1">
          <Tag size={14} />
          {post.category}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {post.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      <Separator />

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-heading">Tags:</span>
        {post.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Author Info */}
      <div className="flex items-center gap-4 rounded-lg bg-white p-6 shadow-sm">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/10">
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h4 className="font-serif font-semibold text-heading">{post.author}</h4>
          <p className="text-sm text-foreground">
            Content writer and community advocate dedicated to sharing stories of impact and
            inspiring others to make a difference.
          </p>
        </div>
      </div>
    </article>
  );
}
