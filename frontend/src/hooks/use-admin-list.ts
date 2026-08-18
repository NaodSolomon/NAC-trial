'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';

export interface AdminListResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AdminList<T> {
  records: T[];
  setRecords: React.Dispatch<React.SetStateAction<T[]>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pages: number;
  loading: boolean;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  reload: () => Promise<void>;
}

export function useAdminList<T>(
  load: (criteria: { page: number; signal?: AbortSignal }) => Promise<AdminListResult<T>>,
): AdminList<T> {
  const [records, setRecords] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const run = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await load({ page, signal });
        // A response that resolved before its abort landed would otherwise overwrite
        // whatever the newer request has already put on screen.
        if (signal?.aborted) return;
        const lastPage = Math.max(1, result.meta.totalPages);
        setPages(lastPage);
        // Deleting the tail of the last page leaves the reader on a page that no
        // longer exists, showing an empty list with no explanation.
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setRecords(result.data);
        // A failure followed by a success used to leave the old banner on screen.
        setError('');
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [load, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    void run(controller.signal);
    return () => controller.abort();
  }, [run]);

  const reload = useCallback(() => run(), [run]);

  return { records, setRecords, page, setPage, pages, loading, error, setError, reload };
}
