import { CmsArticle } from './CmsArticle';
import type { CmsEditorValues } from '../admin-cms.schemas';

export function CmsContentPreview({ values }: { values: CmsEditorValues }) {
  return (
    <section aria-label="Content preview" className="bg-card rounded-xl border p-6 shadow-sm">
      <p className="text-primary text-xs font-semibold tracking-wide uppercase">
        Sanitized preview
      </p>
      <h2 className="text-heading mt-2 font-serif text-3xl">{values.title || 'Untitled page'}</h2>
      <div className="mt-5">
        <CmsArticle content={values.content} />
      </div>
      {values.contentType === 'homepage' && (
        <div className="mt-8 space-y-6 border-t pt-6">
          <section>
            <h3 className="text-heading text-2xl font-semibold">{values.homepage.heroHeading}</h3>
            <p className="text-foreground mt-2">{values.homepage.heroBody}</p>
          </section>
          <section>
            <h3 className="text-heading text-xl font-semibold">
              {values.homepage.servicesHeading}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {values.homepage.services.map((service, index) => (
                <article key={index} className="rounded-lg bg-slate-50 p-4">
                  <h4 className="font-semibold">{service.title}</h4>
                  <p className="text-foreground mt-1 text-sm">{service.body}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="rounded-lg border p-5">
            <h3 className="text-heading text-xl font-semibold">
              {values.homepage.locationHeading}
            </h3>
            <p className="text-foreground mt-2">{values.homepage.locationBody}</p>
            <p className="text-foreground mt-2 text-sm break-all">{values.homepage.mapEmbedUrl}</p>
          </section>
          <section className="bg-primary/10 rounded-lg p-5">
            <h3 className="text-heading text-xl font-semibold">{values.homepage.ctaHeading}</h3>
            <p className="text-foreground mt-2">{values.homepage.ctaBody}</p>
            <span className="text-primary mt-3 inline-block font-semibold">
              {values.homepage.ctaLabel}
            </span>
          </section>
        </div>
      )}
      {values.contentType === 'faq' && (
        <div className="mt-8 space-y-3 border-t pt-6">
          {values.faqs.map((faq, index) => (
            <details key={index} className="rounded-lg border p-4">
              <summary className="text-heading cursor-pointer font-semibold">
                {faq.question}
              </summary>
              <p className="text-foreground mt-3">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
