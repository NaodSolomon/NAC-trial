CREATE TYPE "public"."event_rsvp_status" AS ENUM('CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"attendees" integer NOT NULL,
	"status" "event_rsvp_status" DEFAULT 'CONFIRMED' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_rsvps_attendees_positive_check" CHECK ("event_rsvps"."attendees" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"start_date" timestamp (3) with time zone NOT NULL,
	"end_date" timestamp (3) with time zone NOT NULL,
	"location" varchar(500) NOT NULL,
	"rsvp_enabled" boolean DEFAULT false NOT NULL,
	"status" "event_status" DEFAULT 'DRAFT' NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_end_after_start_check" CHECK ("events"."end_date" > "events"."start_date")
);
--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_rsvps_event_email_unique_idx" ON "event_rsvps" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX "event_rsvps_event_created_at_idx" ON "event_rsvps" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_language_unique_idx" ON "events" USING btree ("slug","language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "events_translation_language_unique_idx" ON "events" USING btree ("translation_key","language_code");--> statement-breakpoint
CREATE INDEX "events_status_language_start_idx" ON "events" USING btree ("status","language_code","start_date");--> statement-breakpoint
CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by");