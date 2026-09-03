import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useFavoritesStore = create(
  persist(
    (set) => ({
      favoriteTeamId: 'lahore-qalandars',
      favoritePlayerIds: [],
      setFavoriteTeam: (id) => set({ favoriteTeamId: id }),
      toggleFavoritePlayer: (id) =>
        set((s) => ({
          favoritePlayerIds: s.favoritePlayerIds.includes(id)
            ? s.favoritePlayerIds.filter((pid) => pid !== id)
            : [...s.favoritePlayerIds, id],
        })),
    }),
    {
      name: 'pak-criczone-favorites',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);