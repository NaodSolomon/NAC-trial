'use client';

import { create } from 'zustand';
import type { AdminPrincipal } from '@/lib/auth/constants';

export type AuthenticationStatus = 'BOOTSTRAPPING' | 'AUTHENTICATED' | 'ANONYMOUS';

interface AuthStore {
  user: AdminPrincipal | null;
  status: AuthenticationStatus;
  setAuthenticated: (user: AdminPrincipal) => void;
  setAnonymous: () => void;
  beginBootstrap: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  status: 'BOOTSTRAPPING',
  setAuthenticated: (user) => set({ user, status: 'AUTHENTICATED' }),
  setAnonymous: () => set({ user: null, status: 'ANONYMOUS' }),
  beginBootstrap: () => set({ user: null, status: 'BOOTSTRAPPING' }),
}));
