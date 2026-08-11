import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CmsEditorValues } from '../admin-cms.schemas';

export function HomepageEditor({
  value,
  onChange,
}: {
  value: CmsEditorValues['homepage'];
  onChange: (value: CmsEditorValues['homepage']) => void;
}) {
  const field = (name: keyof Omit<typeof value, 'services'>, label: string, maxLength: number) => (
    <label className="block">
      <span className="text-heading mb-2 block text-sm font-semibold">{label}</span>
      <input
        value={String(value[name])}
        maxLength={maxLength}
        onChange={(event) => onChange({ ...value, [name]: event.target.value })}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
  return (
    <fieldset className="space-y-5 rounded-xl border p-5">
      <legend className="text-heading px-2 font-semibold">Homepage composition</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('heroHeading', 'Hero heading', 180)}
        {field('heroBody', 'Hero body', 1_000)}
        {field('primaryLabel', 'Primary action label', 80)}
        {field('primaryHref', 'Primary action link', 2_048)}
        {field('servicesHeading', 'Services heading', 180)}
        {field('ctaHeading', 'Call-to-action heading', 180)}
        {field('ctaBody', 'Call-to-action body', 1_000)}
        {field('ctaLabel', 'Call-to-action label', 80)}
        {field('ctaHref', 'Call-to-action link', 2_048)}
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-heading font-semibold">Services</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({ ...value, services: [...value.services, { title: '', body: '' }] })
            }
            disabled={value.services.length >= 12}
          >
            <Plus aria-hidden="true" /> Add service
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {value.services.map((service, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_auto]"
            >
              <label>
                <span className="sr-only">Service {index + 1} title</span>
                <input
                  aria-label={`Service ${index + 1} title`}
                  value={service.title}
                  maxLength={120}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      services: value.services.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item,
                      ),
                    })
                  }
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                  placeholder="Service title"
                />
              </label>
              <label>
                <span className="sr-only">Service {index + 1} description</span>
                <input
                  aria-label={`Service ${index + 1} description`}
                  value={service.body}
                  maxLength={500}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      services: value.services.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, body: event.target.value } : item,
                      ),
                    })
                  }
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                  placeholder="Service description"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                aria-label={`Remove service ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...value,
                    services: value.services.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

export function FaqEditor({
  value,
  onChange,
}: {
  value: CmsEditorValues['faqs'];
  onChange: (value: CmsEditorValues['faqs']) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border p-5">
      <legend className="text-heading px-2 font-semibold">FAQ items</legend>
      {value.map((faq, index) => (
        <div key={index} className="rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between gap-3">
            <h3 className="font-semibold">FAQ {index + 1}</h3>
            <Button
              type="button"
              variant="outline"
              aria-label={`Remove FAQ ${index + 1}`}
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          <label className="mt-3 block">
            <span className="text-heading mb-2 block text-sm font-semibold">Question</span>
            <input
              value={faq.question}
              maxLength={300}
              onChange={(event) =>
                onChange(
                  value.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, question: event.target.value } : item,
                  ),
                )
              }
              className="min-h-11 w-full rounded-lg border bg-white px-3"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-heading mb-2 block text-sm font-semibold">Answer</span>
            <textarea
              value={faq.answer}
              maxLength={2_000}
              rows={4}
              onChange={(event) =>
                onChange(
                  value.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, answer: event.target.value } : item,
                  ),
                )
              }
              className="w-full rounded-lg border bg-white p-3"
            />
          </label>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.length >= 50}
        onClick={() => onChange([...value, { question: '', answer: '' }])}
      >
        <Plus aria-hidden="true" /> Add FAQ
      </Button>
    </fieldset>
  );
}
