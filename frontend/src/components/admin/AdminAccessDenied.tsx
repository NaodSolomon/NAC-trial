import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export function AdminAccessDenied({
  description = 'Your administrator role does not permit access to this information.',
}: {
  description?: string;
}) {
  return (
    <section
      role="alert"
      className="bg-card mx-auto max-w-xl rounded-xl border p-8 text-center shadow-sm"
    >
      <ShieldX aria-hidden="true" className="text-destructive mx-auto size-12" />
      <p className="text-destructive mt-4 text-sm font-semibold tracking-wide uppercase">
        Access denied
      </p>
      <h1 className="text-heading mt-2 text-3xl font-semibold">
        Your role cannot access this section
      </h1>
      <p className="text-foreground mt-3">{description}</p>
      <Link
        href="/admin"
        className="text-primary mt-6 inline-flex min-h-11 items-center font-semibold hover:underline"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
