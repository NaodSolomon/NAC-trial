import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';
import { useUIStore } from './ui.store';

const administrator = {
  id: '00000000-0000-4000-8000-000000002001',
  email: 'admin@example.org',
  name: 'Root Administrator',
  role: 'SUPER_ADMIN',
} as const;

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'BOOTSTRAPPING' });
  });

  it('starts in a state that is neither signed in nor known to be signed out', () => {
    // The administrator shell renders nothing until this resolves, so the initial
    // status must not read as ANONYMOUS or a redirect would fire on every load.
    expect(useAuthStore.getState().status).toBe('BOOTSTRAPPING');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('records the administrator on authentication', () => {
    useAuthStore.getState().setAuthenticated(administrator);
    expect(useAuthStore.getState()).toMatchObject({
      user: administrator,
      status: 'AUTHENTICATED',
    });
  });

  it('discards the administrator when the session ends', () => {
    useAuthStore.getState().setAuthenticated(administrator);
    useAuthStore.getState().setAnonymous();
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'ANONYMOUS' });
  });

  it('clears the previous administrator when bootstrapping again', () => {
    // Re-bootstrapping after a role change must not leave the old principal readable.
    useAuthStore.getState().setAuthenticated(administrator);
    useAuthStore.getState().beginBootstrap();
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'BOOTSTRAPPING' });
  });
});

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ isLoading: false, modalOpen: null });
  });

  it('tracks a single open modal at a time', () => {
    useUIStore.getState().openModal('confirm-delete');
    expect(useUIStore.getState().modalOpen).toBe('confirm-delete');

    useUIStore.getState().openModal('confirm-publish');
    expect(useUIStore.getState().modalOpen).toBe('confirm-publish');

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().modalOpen).toBeNull();
  });

  it('tracks loading independently of the open modal', () => {
    useUIStore.getState().openModal('confirm-delete');
    useUIStore.getState().setLoading(true);
    expect(useUIStore.getState()).toMatchObject({ isLoading: true, modalOpen: 'confirm-delete' });
  });
});
