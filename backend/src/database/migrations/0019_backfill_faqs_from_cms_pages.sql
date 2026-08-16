INSERT INTO "faqs" (
  "language_code",
  "translation_key",
  "question",
  "answer",
  "status",
  "sort_order",
  "created_by",
  "published_at"
)
SELECT
  page."language_code",
  'cms-faq-' || page."language_code" || '-' || item."ordinality"::text,
  left(item."value" ->> 'question', 500),
  item."value" ->> 'answer',
  page."status",
  (item."ordinality" - 1)::int,
  page."created_by",
  page."published_at"
FROM "cms_pages" AS page
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(page."metadata" -> 'items') = 'array'
      THEN page."metadata" -> 'items'
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS item("value", "ordinality")
WHERE page."slug" = 'faq'
  AND item."value" ->> 'question' IS NOT NULL
  AND item."value" ->> 'answer' IS NOT NULL
ON CONFLICT ("translation_key", "language_code") DO NOTHING;
