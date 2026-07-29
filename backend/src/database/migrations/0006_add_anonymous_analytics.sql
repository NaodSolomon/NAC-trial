CREATE TYPE "public"."analytics_device_type" AS ENUM('mobile', 'desktop', 'tablet', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_type" AS ENUM('page_view', 'click', 'submit');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"page_url" varchar(2048) NOT NULL,
	"country" varchar(2),
	"device_type" "analytics_device_type" DEFAULT 'unknown' NOT NULL,
	"referrer" varchar(2048),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_events_type_created_at_idx" ON "analytics_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_country_created_at_idx" ON "analytics_events" USING btree ("country","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_page_created_at_idx" ON "analytics_events" USING btree ("page_url","created_at");