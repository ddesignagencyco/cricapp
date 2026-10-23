/**
 * @jest-environment node
 */
import { adsTxtResponse } from '../lib/advertisements/adsTxt';
import { GET as adsTxt } from '../app/ads.txt/route';
import { GET as appAdsTxt } from '../app/app-ads.txt/route';
import { loadSiteSettings } from '../services/siteSettings';

jest.mock('../services/siteSettings', () => ({ loadSiteSettings: jest.fn() }));

const settings = loadSiteSettings as jest.MockedFunction<typeof loadSiteSettings>;

function withAds(ads: Record<string, unknown>) {
  settings.mockResolvedValue({ ads } as unknown as Awaited<ReturnType<typeof loadSiteSettings>>);
}

describe('ads.txt', () => {
  const env = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = env;
  });

  it('declares the AdSense publisher as DIRECT in adsense mode', async () => {
    withAds({ mode: 'adsense', clientId: 'ca-pub-1234567890123456' });
    const res = await adsTxtResponse();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  });

  it('404s while ads are off or house ads', async () => {
    withAds({ mode: 'house', clientId: 'ca-pub-1234567890123456' });
    expect((await adsTxtResponse()).status).toBe(404);
    withAds({ mode: 'off', clientId: null });
    expect((await adsTxtResponse()).status).toBe(404);
  });

  it('serves the same body at /ads.txt and /app-ads.txt', async () => {
    withAds({ mode: 'adsense', clientId: 'ca-pub-1234567890123456' });
    const [a, b] = await Promise.all([adsTxt(), appAdsTxt()]);
    expect(await a.text()).toBe(await b.text());
  });
});
