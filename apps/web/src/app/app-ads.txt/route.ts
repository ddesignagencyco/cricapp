import { loadSiteSettings } from '../../services/siteSettings';

/** Google's fixed reseller marker for a publisher selling direct. */
const DIRECT_FLOW = 'f08c47fec0942fa0';

export const revalidate = 60;

/**
 * `app-ads.txt` at the site root, generated from the stored publisher id.
 *
 * Only published in `adsense` mode: while ads are `off` or `house` the file 404s
 * rather than advertising a publisher id for a site that is not serving AdSense.
 * `loadSiteSettings` swallows API errors and returns the empty config, so a broken
 * settings fetch also fails closed with a 404.
 */
export async function GET() {
  const { ads } = await loadSiteSettings();

  if (ads.mode !== 'adsense' || !ads.clientId) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(`google.com, ${ads.clientId}, DIRECT, ${DIRECT_FLOW}\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}