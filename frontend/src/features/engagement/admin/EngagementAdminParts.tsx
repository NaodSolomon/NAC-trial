import { Button } from '@/components/ui/button';

export function EngagementHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      <h1 id={id} className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl">
        {title}
      </h1>
      <p className="text-foreground mt-2 max-w-3xl">{description}</p>
    </header>
  );
}

export function ListPager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
      <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm">
        Page {page} of {pages}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

export function LanguageFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="Filter by language"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 rounded-lg border bg-white px-3"
    >
      <option value="">All languages</option>
      <option value="en">English</option>
      <option value="am">Amharic</option>
    </select>
  );
}

export function LoadState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading)
    return (
      <p role="status" className="mt-6">
        Loading records…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
        {error}
      </p>
    );
  if (empty)
    return (
      <p className="mt-6 rounded-lg border border-dashed p-6 text-center">
        No records match these filters.
      </p>
    );
  return <>{children}</>;
}
