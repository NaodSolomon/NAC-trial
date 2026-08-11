import type { CmsStatus } from '../admin-cms.schemas';

const statusStyles: Record<CmsStatus, string> = {
  DRAFT: 'border-slate-300 bg-slate-100 text-slate-800',
  SCHEDULED: 'border-amber-300 bg-amber-100 text-amber-900',
  PUBLISHED: 'border-green-300 bg-green-100 text-green-900',
};

export function CmsStatusBadge({ status }: { status: CmsStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
