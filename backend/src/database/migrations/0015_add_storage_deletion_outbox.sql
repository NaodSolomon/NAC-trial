CREATE TABLE "storage_deletion_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" varchar(1024) NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp (3) with time zone,
	"lock_token" uuid,
	"last_error" varchar(100),
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "storage_deletion_outbox_object_key_unique_idx" ON "storage_deletion_outbox" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "storage_deletion_outbox_delivery_idx" ON "storage_deletion_outbox" USING btree ("status","next_attempt_at","created_at");