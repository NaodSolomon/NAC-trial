CREATE TYPE "public"."admin_role" AS ENUM('SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."language_code" AS ENUM('en', 'am');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'VIDEO', 'DOCUMENT');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "admin_role" DEFAULT 'CONTENT_EDITOR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp (3) with time zone,
	"last_login_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"token_family_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_agent" varchar(512),
	"ip_hash" varchar(64),
	"expires_at" timestamp (3) with time zone NOT NULL,
	"last_used_at" timestamp (3) with time zone,
	"revoked_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"language_code" "language_code" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"scheduled_at" timestamp (3) with time zone,
	"published_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"language_code" "language_code" NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) DEFAULT 'global' NOT NULL,
	"site_name" varchar(150) NOT NULL,
	"default_language" "language_code" DEFAULT 'en' NOT NULL,
	"supported_languages" jsonb DEFAULT '["en","am"]'::jsonb NOT NULL,
	"contact_email" varchar(255),
	"phone" varchar(50),
	"address" varchar(500),
	"updated_by" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" varchar(1024) NOT NULL,
	"public_url" varchar(2048) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(150) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"type" "media_type" NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"language_code" "language_code" NOT NULL,
	"alt_text" varchar(500) NOT NULL,
	"caption" varchar(1000)
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_translations" ADD CONSTRAINT "media_translations_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique_idx" ON "admins" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "admins_role_idx" ON "admins" USING btree ("role");--> statement-breakpoint
CREATE INDEX "admins_active_idx" ON "admins" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_unique_idx" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_admin_id_idx" ON "auth_sessions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions" USING btree ("token_family_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_slug_language_unique_idx" ON "cms_pages" USING btree ("slug","language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_translation_language_unique_idx" ON "cms_pages" USING btree ("translation_key","language_code");--> statement-breakpoint
CREATE INDEX "cms_pages_status_idx" ON "cms_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cms_pages_scheduled_at_idx" ON "cms_pages" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "cms_pages_created_by_idx" ON "cms_pages" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "navigation_items_language_order_idx" ON "navigation_items" USING btree ("language_code","display_order");--> statement-breakpoint
CREATE INDEX "navigation_items_created_by_idx" ON "navigation_items" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_key_unique_idx" ON "site_settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_unique_idx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_type_idx" ON "media_assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "media_assets_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_translations_media_language_unique_idx" ON "media_translations" USING btree ("media_id","language_code");