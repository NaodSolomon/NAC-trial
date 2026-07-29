CREATE TYPE "public"."donation_currency" AS ENUM('USD', 'ETB');--> statement-breakpoint
CREATE TYPE "public"."donation_gateway" AS ENUM('PAYPAL', 'TELEBIRR', 'CBE');--> statement-breakpoint
CREATE TYPE "public"."donation_status" AS ENUM('INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_name" varchar(100) NOT NULL,
	"donor_email" varchar(255) NOT NULL,
	"message" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" "donation_currency" NOT NULL,
	"gateway" "donation_gateway" NOT NULL,
	"status" "donation_status" DEFAULT 'INITIATED' NOT NULL,
	"provider_order_id" varchar(255),
	"external_transaction_id" varchar(255),
	"receipt_url" varchar(2048),
	"confirmed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway" "donation_gateway" NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(150) NOT NULL,
	"processed_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "donations_provider_order_unique_idx" ON "donations" USING btree ("gateway","provider_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "donations_external_transaction_unique_idx" ON "donations" USING btree ("gateway","external_transaction_id");--> statement-breakpoint
CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "donations_created_at_idx" ON "donations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "donations_currency_idx" ON "donations" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "notification_outbox_status_created_idx" ON "notification_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_gateway_event_unique_idx" ON "payment_webhook_events" USING btree ("gateway","provider_event_id");