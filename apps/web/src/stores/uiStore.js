import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set) => ({
      unreadCount: 3,
      markAllRead: () => set({ unreadCount: 0 }),
      markRead: (n) =>
        set((s) => ({
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