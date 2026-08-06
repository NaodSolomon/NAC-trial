import Link from 'next/link';

export default function ForbiddenAdminPage() {
  return (
    <section className="bg-card mx-auto max-w-xl rounded-xl border p-8 text-center shadow-sm">
      <p className="text-destructive text-sm font-semibold tracking-wide uppercase">
        Access denied
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Your role cannot access this section</h1>
      <p className="text-foreground mt-3">
        Ask a super administrator if your responsibilities have changed.
      </p>
      <Link
        href="/admin"
        className="text-primary mt-6 inline-flex min-h-11 items-center font-semibold hover:underline"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
