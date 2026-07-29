export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-card" />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
