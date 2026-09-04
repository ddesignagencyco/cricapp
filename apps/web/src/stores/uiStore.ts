import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UiState {
  unreadCount: number;
  markAllRead: () => void;
  markRead: (n?: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      unreadCount: 3,
      markAllRead: () => set({ unreadCount: 0 }),
      markRead: (n?: number) =>
        set((s: UiState) => ({
          unreadCount: Math.max(0, s.unreadCount - (n || 1)),
        })),
    }),
    {
      name: 'pak-criczone-ui',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
