import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmedActionButton } from './ConfirmationDialog';

describe('ConfirmedActionButton', () => {
  it('does not execute a destructive operation until explicit confirmation', async () => {
    const action = vi.fn();
    render(
      <ConfirmedActionButton
        title="Delete content?"
        description="This cannot be undone."
        confirmLabel="Delete content"
        onConfirm={action}
      >
        Delete
      </ConfirmedActionButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(action).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete content' }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it('keeps the dialog open when a destructive mutation fails', async () => {
    render(
      <ConfirmedActionButton
        title="Delete content?"
        description="This cannot be undone."
        confirmLabel="Delete content"
        onConfirm={() => Promise.reject(new Error('database unavailable'))}
      >
        Delete
      </ConfirmedActionButton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete content' }));
    await waitFor(() => expect(screen.getByText(/No changes were applied/)).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
