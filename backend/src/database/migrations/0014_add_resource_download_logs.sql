CREATE TABLE "resource_download_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"country" varchar(2),
	"downloaded_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_download_logs_country_check" CHECK ("resource_download_logs"."country" is null or ("resource_download_logs"."country" ~ '^[A-Z]{2}$' and "resource_download_logs"."country" not in ('XX', 'T1')))
);
--> statement-breakpoint
ALTER TABLE "resource_download_logs" ADD CONSTRAINT "resource_download_logs_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_download_logs_resource_downloaded_idx" ON "resource_download_logs" USING btree ("resource_id","downloaded_at");--> statement-breakpoint
CREATE INDEX "resource_download_logs_country_downloaded_idx" ON "resource_download_logs" USING btree ("country","downloaded_at");--> statement-breakpoint
CREATE INDEX "resource_download_logs_downloaded_at_idx" ON "resource_download_logs" USING btree ("downloaded_at");