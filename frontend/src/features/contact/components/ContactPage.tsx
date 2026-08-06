import PageBanner from '@/components/common/PageBanner';
import { ContactForm } from '@/features/contact/components/ContactForm';
import { contactInfo } from '@/features/contact/data';

export default function ContactPage() {
  return (
    <>
      <PageBanner
        title="Contact Us"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact Us' }]}
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="mb-6 font-serif text-3xl font-medium text-heading">Get In Touch</h2>
              <ContactForm />
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-6">
                {contactInfo.map((info) => (
                  <div
                    key={info.title}
                    className="flex gap-4 rounded-lg border bg-white p-6 shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-heading">{info.title}</h3>
                      <p className="mt-1 text-sm text-foreground">{info.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
