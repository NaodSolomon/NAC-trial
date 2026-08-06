import { LegacyAuthStorageCleaner } from '@/features/auth';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-secondary/30 flex min-h-screen items-center justify-center px-4 py-10">
      <LegacyAuthStorageCleaner />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
