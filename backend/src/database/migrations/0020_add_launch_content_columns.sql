ALTER TABLE "site_settings" ADD COLUMN "default_share_image_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "localized_text" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "image_url" varchar(2048);