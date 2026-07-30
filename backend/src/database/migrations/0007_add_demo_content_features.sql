CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"seo_image_url" varchar(2048),
	"created_by" uuid NOT NULL,
	"published_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"file_url" varchar(2048) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "seo_title" varchar(70);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "seo_description" varchar(160);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "seo_image_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_language_unique_idx" ON "blog_posts" USING btree ("slug","language_code");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "resources_status_language_idx" ON "resources" USING btree ("status","language_code");