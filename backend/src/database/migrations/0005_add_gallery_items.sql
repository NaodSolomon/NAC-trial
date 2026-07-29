CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"alt_text" varchar(500) NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_items_media_unique_idx" ON "gallery_items" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "gallery_items_language_created_at_idx" ON "gallery_items" USING btree ("language_code","created_at");--> statement-breakpoint
CREATE INDEX "gallery_items_created_by_idx" ON "gallery_items" USING btree ("created_by");