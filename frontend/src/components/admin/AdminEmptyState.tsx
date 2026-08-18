import { Button } from '@/components/ui/button';

export function AdminEmptyState({
  entity,
  filtered,
  onClearFilters,
}: {
  /** Plural noun for what is missing, for example "articles". */
  entity: string;
  /** True when a filter or search is narrowing the list. */
  filtered: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div role="status" className="bg-card mt-6 rounded-xl border border-dashed p-8 text-center">
      <p className="text-heading font-semibold">
        {filtered ? `No ${entity} match the current filters.` : `There are no ${entity} yet.`}
      </p>
      <p className="text-foreground mt-2 text-sm">
        {filtered
          ? 'Widen or clear the filters to see more.'
          : 'They will appear here as soon as there are any.'}
      </p>
      {filtered && onClearFilters && (
        <Button type="button" variant="outline" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
