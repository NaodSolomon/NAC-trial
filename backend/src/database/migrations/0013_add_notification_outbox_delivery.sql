ALTER TABLE "notification_outbox" ADD COLUMN "next_attempt_at" timestamp (3) with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "locked_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "lock_token" uuid;--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "last_error" varchar(100);--> statement-breakpoint
CREATE INDEX "notification_outbox_delivery_idx" ON "notification_outbox" USING btree ("type","status","next_attempt_at","created_at");