import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FavoritesState {
  favoriteTeamId: string;
  favoritePlayerIds: string[];
  setFavoriteTeam: (id: string) => void;
  toggleFavoritePlayer: (id: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      favoriteTeamId: 'lahore-qalandars',
      favoritePlayerIds: [],
      setFavoriteTeam: (id: string) => set({ favoriteTeamId: id }),
      toggleFavoritePlayer: (id: string) =>
        set((s: FavoritesState) => ({
          favoritePlayerIds: s.favoritePlayerIds.includes(id)
            ? s.favoritePlayerIds.filter((pid: string) => pid !== id)
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
