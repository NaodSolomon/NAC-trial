CREATE TYPE "public"."testimonial_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."volunteer_application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"text" text NOT NULL,
	"language_code" "language_code" NOT NULL,
	"status" "testimonial_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"role_interest" varchar(150) NOT NULL,
	"message" text NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"status" "volunteer_application_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_unique_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_created_at_idx" ON "newsletter_subscribers" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "testimonials_translation_language_unique_idx" ON "testimonials" USING btree ("translation_key","language_code");--> statement-breakpoint
CREATE INDEX "testimonials_status_language_idx" ON "testimonials" USING btree ("status","language_code");--> statement-breakpoint
CREATE INDEX "testimonials_created_by_idx" ON "testimonials" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "volunteer_applications_email_idx" ON "volunteer_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "volunteer_applications_status_idx" ON "volunteer_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "volunteer_applications_created_at_idx" ON "volunteer_applications" USING btree ("created_at");