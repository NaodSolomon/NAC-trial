import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r bg-card px-4 py-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded px-3 py-2 text-sm hover:bg-accent"
        >
          {link.label}
        </Link>
      ))}
    </aside>
  );
}
