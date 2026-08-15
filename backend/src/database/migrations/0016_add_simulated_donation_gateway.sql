ALTER TYPE "public"."donation_gateway" RENAME TO "donation_gateway_legacy";
--> statement-breakpoint
CREATE TYPE "public"."donation_gateway" AS ENUM('SIMULATED', 'PAYPAL', 'TELEBIRR', 'CBE');
--> statement-breakpoint
ALTER TABLE "donations"
ALTER COLUMN "gateway" TYPE "public"."donation_gateway"
USING "gateway"::text::"public"."donation_gateway";
--> statement-breakpoint
ALTER TABLE "payment_webhook_events"
ALTER COLUMN "gateway" TYPE "public"."donation_gateway"
USING "gateway"::text::"public"."donation_gateway";
--> statement-breakpoint
DROP TYPE "public"."donation_gateway_legacy";
