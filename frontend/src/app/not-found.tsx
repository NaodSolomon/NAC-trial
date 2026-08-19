import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-primary font-serif text-[120px] leading-none font-bold md:text-[180px]">
        404
      </p>
      <h2 className="text-heading mt-4 font-serif text-2xl md:text-3xl">Page Not Found</h2>
      <p className="text-foreground mt-4 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is
        temporarily unavailable.
      </p>
      <Link
        href="/"
        className="bg-primary hover:bg-primary-hover mt-8 inline-block rounded px-8 py-3 font-semibold text-white uppercase transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
