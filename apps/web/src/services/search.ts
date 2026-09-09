import { apiGet } from './api/client';
import type { SearchResults } from '../types/index';

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim().toLowerCase();
  if (!q) return { players: [], teams: [], matches: [], tournaments: [] };

  try {
    const results = await apiGet('/search', { q });
    if (results) {
      return results as SearchResults;
    }
  } catch (err) {
    console.error('Search API failed', err);
  }

  return { players: [], teams: [], matches: [], tournaments: [] };
}
