import { cn } from '@/lib/utils';

export function BrandMark({ siteName, compact = false }: { siteName: string; compact?: boolean }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-3">
      <span
        className={cn(
          'bg-primary-dark inline-flex shrink-0 items-center justify-center rounded font-serif font-bold tracking-wide text-white',
          compact ? 'h-9 min-w-12 px-2 text-sm' : 'h-12 min-w-16 px-3 text-lg',
        )}
      >
        NAC
      </span>
      <span
        className={cn(
          'text-heading max-w-48 font-serif leading-tight font-semibold',
          compact ? 'text-sm' : 'text-base lg:text-lg',
        )}
      >
        {siteName}
      </span>
    </span>
  );
}
