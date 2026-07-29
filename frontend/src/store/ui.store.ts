import { create } from 'zustand';

interface UIStore {
  isLoading: boolean;
  modalOpen: string | null;
  setLoading: (v: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLoading: false,
  modalOpen: null,
  setLoading: (v) => set({ isLoading: v }),
  openModal: (id) => set({ modalOpen: id }),
  closeModal: () => set({ modalOpen: null }),
}));
