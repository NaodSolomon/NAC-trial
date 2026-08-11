import { cn } from '@/lib/utils';

export function AdminStatusBadge({ status }: { status: string }) {
  const published = status === 'PUBLISHED' || status === 'CONFIRMED';
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
        published ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900',
      )}
    >
      {status}
    </span>
  );
}
