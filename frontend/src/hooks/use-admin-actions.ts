'use client';

import { useCallback } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';

export interface AdminActions {
  /** Invalidate the public caches for this feature, then reload the list. */
  refresh: () => Promise<void>;
  /** Perform a write, refresh, and announce it once it has actually happened. */
  run: (
    action: () => Promise<unknown>,
    announcement: { title: string; message?: string },
  ) => Promise<void>;
}

export function useAdminActions({
  reload,
  queryKey,
}: {
  reload: () => Promise<void>;
  /** A stable key. Invalidation matches by prefix, so a feature root covers its children. */
  queryKey: QueryKey;
}): AdminActions {
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    await reload();
  }, [queryClient, queryKey, reload]);

  const run = useCallback<AdminActions['run']>(
    async (action, announcement) => {
      // Failures propagate deliberately. The confirmation dialog reports the reason
      // beside the control that was used, and catching here would let that dialog
      // close as though the action had succeeded.
      await action();
      await refresh();
      notify(announcement);
    },
    [notify, refresh],
  );

  return { refresh, run };
}
