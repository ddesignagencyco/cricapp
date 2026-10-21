import { loadSiteSettings } from '../../services/siteSettings';
import { resolvePublisherId } from './adsConfig';

/** Google's fixed reseller marker for a publisher selling direct. */
const DIRECT_FLOW = 'f08c47fec0942fa0';

/**
 * Body of `/ads.txt` (websites) and `/app-ads.txt` (apps): both declare the same
 * AdSense publisher, so both routes serve this one response.
 *
 * Only published in `adsense` mode: while ads are `off` or `house` the file 404s
 * rather than advertising a publisher id for a site that is not serving AdSense.
 * `loadSiteSettings` swallows API errors and returns the empty config, so a broken
 * settings fetch also fails closed with a 404.
 */
export async function adsTxtResponse(): Promise<Response> {
  const { ads } = await loadSiteSettings();

  // Same resolution as `AdProvider`: stored config first, env fallback second,
  // so the file never 404s while the frontend is serving real AdSense units.
  const publisherId = ads.mode === 'adsense' ? resolvePublisherId(ads.clientId) : null;
  if (!publisherId) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const bare = publisherId.replace(/^ca-/i, '');
  return new Response(`google.com, ${bare}, DIRECT, ${DIRECT_FLOW}\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
