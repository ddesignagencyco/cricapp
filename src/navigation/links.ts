import type { RouteName } from './routes';

/*
 * Links into the app. Website links (pakcriczone.com/…) open the matching
 * screen, so a shared story or match lands in the app; the app's own scheme
 * (pakcriczone://screen/<Route>?param=value) can open any screen.
 */

type Target = { name: RouteName; params?: Record<string, string> };

const WEB: [RegExp, (m: RegExpMatchArray) => Target][] = [
  [/^\/matches\/([^/?#]+)/, m => ({ name: 'Match', params: { id: decodeURIComponent(m[1]) } })],
  [/^\/news\/([^/?#]+)/, m => ({ name: 'Article', params: { id: decodeURIComponent(m[1]) } })],
  [/^\/teams\/([^/?#]+)/, m => ({ name: 'Team', params: { id: decodeURIComponent(m[1]) } })],
  [/^\/players\/([^/?#]+)/, m => ({ name: 'Player', params: { id: decodeURIComponent(m[1]) } })],
  [/^\/tournaments\/([^/?#]+)/, m => ({ name: 'Series', params: { id: decodeURIComponent(m[1]) } })],
  [/^\/psl\b/, () => ({ name: 'Psl' })],
  [/^\/tools\/?$/, () => ({ name: 'Tools' })],
  [/^\/compare\b/, () => ({ name: 'Compare', params: { kind: 'teams' } })],
  [/^\/gallery\b/, () => ({ name: 'Gallery' })],
];

export function parseLink(url: string): Target | undefined {
  const m = url.match(/^([a-z]+):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i);
  if (!m) return undefined;
  const [, scheme, host, path, query] = m;
  const params: Record<string, string> = {};
  for (const pair of (query ?? '').slice(1).split('&').filter(Boolean)) {
    const [k, v = ''] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  if (scheme === 'pakcriczone' && host === 'screen') {
    const name = path.replace(/^\//, '') as RouteName;
    return name ? { name, params: Object.keys(params).length ? params : undefined } : undefined;
  }
  if (/^(www\.)?pakcriczone\.com$/i.test(host)) {
    for (const [re, to] of WEB) {
      const hit = path.match(re);
      if (hit) return to(hit);
    }
  }
  return undefined;
}
