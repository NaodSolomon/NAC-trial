import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAdminActions } from './use-admin-actions';

const notify = vi.fn();
vi.mock('@/components/admin/AdminFeedbackProvider', () => ({
  useAdminFeedback: () => ({ notify }),
}));

function setup(reload = vi.fn(async () => {})) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const { result } = renderHook(() => useAdminActions({ reload, queryKey: ['blog'] }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return { result, reload, invalidate };
}

describe('useAdminActions', () => {
  it('invalidates the public cache before reloading the list', async () => {
    const order: string[] = [];
    const reload = vi.fn(async () => {
      order.push('reload');
    });
    const { result, invalidate } = setup(reload);
    invalidate.mockImplementation(async () => {
      order.push('invalidate');
    });

    await act(() => result.current.refresh());

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['blog'] });
    // Reloading first would repopulate the list from a cache that is still stale.
    expect(order).toEqual(['invalidate', 'reload']);
  });

  it('announces a write only after it has been applied and reloaded', async () => {
    notify.mockClear();
    const order: string[] = [];
    const reload = vi.fn(async () => {
      order.push('reload');
    });
    const { result } = setup(reload);
    notify.mockImplementation(() => order.push('notify'));

    await act(() =>
      result.current.run(async () => order.push('action'), { title: 'Blog post deleted' }),
    );

    expect(order).toEqual(['action', 'reload', 'notify']);
    expect(notify).toHaveBeenCalledWith({ title: 'Blog post deleted' });
  });

  it('lets a failure reach the caller instead of reporting success', async () => {
    notify.mockClear();
    const reload = vi.fn(async () => {});
    const { result } = setup(reload);

    // A swallowed failure would let the confirmation dialog close as though the
    // record had been removed.
    await expect(
      act(() =>
        result.current.run(
          async () => {
            throw new Error('The last super administrator cannot be deleted.');
          },
          { title: 'Deleted' },
        ),
      ),
    ).rejects.toThrow('The last super administrator cannot be deleted.');

    expect(notify).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not announce a write whose reload failed', async () => {
    notify.mockClear();
    const reload = vi.fn(async () => {
      throw new Error('the list could not be reloaded');
    });
    const { result } = setup(reload);

    await expect(
      act(() => result.current.run(async () => undefined, { title: 'Saved' })),
    ).rejects.toThrow('the list could not be reloaded');
    expect(notify).not.toHaveBeenCalled();
  });
});
