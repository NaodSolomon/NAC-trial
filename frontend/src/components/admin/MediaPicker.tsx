'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { listMedia } from '@/features/media/media-admin.client';
import type { MediaAsset } from '@/features/media/media-admin.schemas';

export function MediaPicker({
  label,
  id,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <span id={`${id}-label`} className="text-heading mb-2 block font-semibold">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <span className="relative block h-16 w-24 overflow-hidden rounded-md border bg-slate-100">
            <Image src={value} alt="" fill sizes="96px" className="object-cover" />
          </span>
        ) : (
          <span className="text-foreground flex h-16 w-24 items-center justify-center rounded-md border border-dashed">
            <ImageIcon aria-hidden="true" className="size-5" />
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          id={id}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          onClick={() => setOpen(true)}
        >
          {value ? `Change ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
        </Button>
        {value && (
          <Button type="button" variant="outline" onClick={() => onChange('')}>
            <X aria-hidden="true" /> Remove
          </Button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-foreground mt-1 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive mt-1 text-sm">
          {error}
        </p>
      )}
      <MediaPickerDialog
        title={`Choose ${label.toLowerCase()}`}
        open={open}
        onOpenChange={setOpen}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </div>
  );
}

function MediaPickerDialog({
  title,
  open,
  onOpenChange,
  onSelect,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (pageToLoad: number, signal: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listMedia({ page: pageToLoad, type: 'IMAGE', signal });
      if (signal.aborted) return;
      setItems(result.data);
      setPages(Math.max(1, result.meta.totalPages));
    } catch (cause) {
      if (!signal.aborted) setError(getApiErrorMessageWithDetails(cause));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void load(page, controller.signal);
    return () => controller.abort();
  }, [open, page, load]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/55" />
        <Dialog.Content className="bg-card fixed top-1/2 left-1/2 z-[81] max-h-[85vh] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-heading text-xl font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="text-foreground mt-1 text-sm">
                Pictures come from the Media library. Upload new ones on the Media screen first.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="outline" aria-label="Close">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {loading ? (
            <p role="status" className="mt-6">
              Loading images…
            </p>
          ) : error ? (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
            >
              {error}
            </p>
          ) : items.length === 0 ? (
            <p role="status" className="mt-6 rounded-lg border border-dashed p-6 text-center">
              There are no images in the Media library yet. Upload one on the Media screen, then
              choose it here.
            </p>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.publicUrl)}
                    className="focus-visible:ring-primary block w-full overflow-hidden rounded-lg border text-left focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="relative block aspect-video bg-slate-100">
                      <Image
                        src={item.publicUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover"
                      />
                    </span>
                    <span className="block truncate px-2 py-1.5 text-xs" title={item.originalName}>
                      {item.originalName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label="Image pages" className="mt-5 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {pages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
