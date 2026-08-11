import { notFound } from 'next/navigation';
import { adminNavigation } from '@/lib/auth/permissions';

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const section = (await params).section;
  const item = adminNavigation.find(({ href }) => href === `/admin/${section}`);
  if (!item) notFound();
  return (
    <section aria-labelledby="section-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">Administration</p>
      <h1
        id="section-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        {item.label}
      </h1>
      <p className="text-foreground mt-3 max-w-2xl">{item.description}</p>
      <div className="bg-card mt-8 rounded-xl border p-6 shadow-sm">
        <h2 className="text-heading text-xl font-semibold">Workspace foundation ready</h2>
        <p className="text-foreground mt-2">
          Feature-specific tables and forms will be connected in their dedicated vertical slice.
          Authorization remains enforced by both this workspace and the backend API.
        </p>
      </div>
    </section>
  );
}
