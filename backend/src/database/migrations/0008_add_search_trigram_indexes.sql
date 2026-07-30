CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX "cms_pages_title_trgm_idx" ON "cms_pages" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "cms_pages_content_trgm_idx" ON "cms_pages" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "events_title_trgm_idx" ON "events" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "events_description_trgm_idx" ON "events" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "blog_posts_title_trgm_idx" ON "blog_posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "blog_posts_excerpt_trgm_idx" ON "blog_posts" USING gin ("excerpt" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "blog_posts_content_trgm_idx" ON "blog_posts" USING gin ("content" gin_trgm_ops);
