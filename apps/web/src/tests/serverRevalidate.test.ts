/**
 * @jest-environment node
 */
import { defaultRevalidate } from '../services/api/client';

describe('defaultRevalidate (server-side cache policy)', () => {
  it('caches slow-changing reference data', () => {
    expect(defaultRevalidate('/teams')).toBe(3600);
    expect(defaultRevalidate('/teams/sr:competitor:1/players')).toBe(3600);
    expect(defaultRevalidate('/news/some-slug')).toBe(120);
    expect(defaultRevalidate('/editorial-pages/privacy')).toBe(600);
  });

  it('never caches live or match data', () => {
    expect(defaultRevalidate('/matches')).toBeUndefined();
    expect(defaultRevalidate('/matches/live')).toBeUndefined();
    expect(defaultRevalidate('/live/123')).toBeUndefined();
  });

  it('does not match a different resource that shares a prefix', () => {
    expect(defaultRevalidate('/newsletter/subscribe')).toBeUndefined();
    expect(defaultRevalidate('/teamsx')).toBeUndefined();
  });
});
