import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAdminList, type AdminListResult } from './use-admin-list';

function pageOf(data: string[], totalPages: number, page = 1): AdminListResult<string> {
  return { data, meta: { total: data.length, page, limit: 10, totalPages } };
}

describe('useAdminList', () => {
  it('loads the first page and reports when it has settled', async () => {
    const load = vi.fn(async () => pageOf(['a', 'b'], 1));
    const { result } = renderHook(() => useAdminList(load));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.records).toEqual(['a', 'b']);
    expect(result.current.pages).toBe(1);
    expect(result.current.error).toBe('');
  });

  it('reports a failure and clears it once a later load succeeds', async () => {
    const load = vi
      .fn<(criteria: { page: number; signal?: AbortSignal }) => Promise<AdminListResult<string>>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(pageOf(['a'], 1));
    const { result } = renderHook(() => useAdminList(load));

    await waitFor(() => expect(result.current.error).not.toBe(''));
    await act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe(''));
    expect(result.current.records).toEqual(['a']);
  });

  it('falls back to the last real page when the result set shrinks', async () => {
    // The tail is deleted while the reader sits on the last page, so the wider
    // count must not come back once it has shrunk.
    let shrunk = false;
    const load = vi.fn(async ({ page }: { page: number }) => {
      if (page > 1) shrunk = true;
      return pageOf(['a'], shrunk ? 1 : 3, 1);
    });
    const { result } = renderHook(() => useAdminList(load));
    await waitFor(() => expect(result.current.pages).toBe(3));

    act(() => result.current.setPage(3));

    await waitFor(() => expect(result.current.page).toBe(1));
    expect(result.current.records).toEqual(['a']);
    expect(result.current.pages).toBe(1);
  });

  it('ignores a response that resolves after its request was aborted', async () => {
    let release: (value: AdminListResult<string>) => void = () => {};
    const load = vi.fn(
      ({ signal }: { page: number; signal?: AbortSignal }) =>
        new Promise<AdminListResult<string>>((resolve) => {
          release = resolve;
          // Mirror a response that has already been parsed when the abort lands.
          signal?.addEventListener('abort', () => resolve(pageOf(['stale'], 1)));
        }),
    );
    const { result, unmount } = renderHook(() => useAdminList(load));

    unmount();
    await act(async () => {
      release(pageOf(['stale'], 1));
    });

    expect(result.current.records).toEqual([]);
  });

  it('surfaces a failure that is not an abort', async () => {
    const load = vi.fn(async () => {
      throw new Error('the service is unavailable');
    });
    const { result } = renderHook(() => useAdminList(load));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBe('');
    expect(result.current.records).toEqual([]);
  });
});
