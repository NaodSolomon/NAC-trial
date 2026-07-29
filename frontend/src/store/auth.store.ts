import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AdminRole = 'SUPER_ADMIN' | 'CONTENT_EDITOR' | 'FINANCE_VIEWER';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface AuthStore {
  user: AdminUser | null;
  token: string | null;
  setUser: (user: AdminUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' },
  ),
);
