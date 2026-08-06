import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-serif text-[120px] font-bold leading-none text-primary md:text-[180px]">
        404
      </p>
      <h2 className="mt-4 font-serif text-2xl text-heading md:text-3xl">Page Not Found</h2>
      <p className="mt-4 max-w-md text-foreground">
        The page you are looking for might have been removed, had its name changed, or is
        temporarily unavailable.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded bg-primary px-8 py-3 font-semibold uppercase text-white transition hover:bg-primary-hover"
      >
        Back to Home
      </Link>
    </div>
  );
}
