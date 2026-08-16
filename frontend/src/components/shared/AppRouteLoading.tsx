export default function AppRouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}
