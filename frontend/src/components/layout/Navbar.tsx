import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="border-b bg-card px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Nehemiah
        </Link>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm hover:text-primary">
            Sign In
          </Link>
          <Link href="/register" className="text-sm hover:text-primary">
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
