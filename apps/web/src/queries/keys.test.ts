import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  normalizeParams,
  parseLimit,
  parsePositiveInt,
  playerKeys,
  teamKeys,
  tourKeys,
  tournamentKeys,
} from './keys';

describe('directory query keys', () => {
  it('normalizes strings, trims values, drops empty values, and sorts keys', () => {
    expect(normalizeParams({ q: '  Babar  ', page: 2, limit: 20, empty: '   ', missing: undefined })).toEqual({
      limit: 20,
      page: 2,
      q: 'Babar',
    });
  });

  it('builds stable list keys for equivalent parameter objects', () => {
    expect(playerKeys.list({ page: 1, limit: 24, q: 'babar' })).toEqual(
      playerKeys.list({ q: ' babar ', limit: 24, page: 1 })
    );
    expect(teamKeys.list({ page: 1, limit: 20 })).not.toEqual(teamKeys.list({ page: 2, limit: 20 }));
    expect(tourKeys.list({ page: 1, q: 'a' })).not.toEqual(tourKeys.list({ page: 1, q: 'b' }));
    expect(tournamentKeys.list({ page: 1, country: 'pakistan' })).not.toEqual(
      tournamentKeys.list({ page: 1, country: 'india' })
    );
  });

  it('parses page and limit defensively', () => {
    expect(parsePositiveInt('4', 1)).toBe(4);
    expect(parsePositiveInt('-2', 1)).toBe(1);
    expect(parsePositiveInt('nope', 3)).toBe(3);
    expect(parseLimit('500', 20)).toBe(100);
  });

  it('supports targeted list invalidation without clearing unrelated resources', async () => {
    const client = new QueryClient();
    client.setQueryData(playerKeys.list({ page: 1, limit: 20 }), { items: [] });
    client.setQueryData(teamKeys.list({ page: 1, limit: 20 }), { items: [] });

    await client.invalidateQueries({ queryKey: playerKeys.lists() });

    expect(client.getQueryState(playerKeys.list({ page: 1, limit: 20 }))?.isInvalidated).toBe(true);
    expect(client.getQueryState(teamKeys.list({ page: 1, limit: 20 }))?.isInvalidated).toBe(false);
  });
});
