UPDATE "donations"
SET "gateway" = 'SIMULATED'
WHERE "gateway" = 'PAYPAL'
  AND "provider_order_id" LIKE 'FAKE-%';
--> statement-breakpoint
UPDATE "payment_webhook_events"
SET "gateway" = 'SIMULATED'
WHERE "gateway" = 'PAYPAL'
  AND "event_type" LIKE 'FAKE.%';
