import { Image } from 'react-native';

/*
 * Warm the image cache ahead of time so remote logos and headshots are ready
 * before a list scrolls into view. Each URL is fetched at most once per
 * session; failures are forgotten so a later attempt can retry.
 */

const seen = new Set<string>();

export function prefetch(urls: (string | null | undefined)[]): void {
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    Image.prefetch(u).catch(() => seen.delete(u));
  }
}
