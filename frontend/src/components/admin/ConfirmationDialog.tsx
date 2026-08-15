'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  busy = false,
  destructive = true,
  error,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  error?: string;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/55" />
        <Dialog.Content className="bg-card fixed top-1/2 left-1/2 z-[81] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-red-100 p-2 text-red-700">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </span>
            <div>
              <Dialog.Title className="text-heading text-xl font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="text-foreground mt-2 text-sm leading-6">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" disabled={busy}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              disabled={busy}
              className={destructive ? 'bg-red-700 text-white hover:bg-red-800' : undefined}
              onClick={() => void onConfirm()}
            >
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"
            >
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmedActionButton({
  children,
  title,
  description,
  confirmLabel,
  onConfirm,
  className,
  destructive = true,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setActionError('The action could not be completed. No changes were applied.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={destructive ? 'destructive' : 'outline'}
        disabled={disabled}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <ConfirmationDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        destructive={destructive}
        busy={busy}
        error={actionError}
        onConfirm={confirm}
        onOpenChange={setOpen}
      />
    </>
  );
}
