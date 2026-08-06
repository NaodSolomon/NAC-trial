import BlogCard from '@/features/blog/components/BlogCard';
import AnimateOnScroll from '@/components/common/AnimateOnScroll';
import { blogPosts } from '@/features/blog/data';

export default function BlogList() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {blogPosts.map((post) => (
        <AnimateOnScroll key={post.slug} animation="fadeUp">
          <BlogCard
            image={post.image}
            title={post.title}
            excerpt={post.excerpt}
            date={post.date}
            author={post.author}
            slug={post.slug}
          />
        </AnimateOnScroll>
      ))}
    </div>
  );
}
