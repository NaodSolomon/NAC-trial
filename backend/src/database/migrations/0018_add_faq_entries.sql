CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language_code" "language_code" DEFAULT 'en' NOT NULL,
	"translation_key" varchar(180) NOT NULL,
	"category" varchar(120),
	"question" varchar(500) NOT NULL,
	"answer" text NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"published_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "faqs_translation_language_unique_idx" ON "faqs" USING btree ("translation_key","language_code");--> statement-breakpoint
CREATE INDEX "faqs_language_status_order_idx" ON "faqs" USING btree ("language_code","status","sort_order");--> statement-breakpoint
CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "faqs_question_trgm_idx" ON "faqs" USING gin ("question" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "faqs_answer_trgm_idx" ON "faqs" USING gin ("answer" gin_trgm_ops);