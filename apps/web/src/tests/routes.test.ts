/**
 * @jest-environment node
 *
 * Route handlers return a real `Response`, which jsdom does not provide. The
 * node environment has it, and it is the accurate environment for a server
 * route anyway.
 */
import { GET as googleNewsSitemap } from '../app/google-news-sitemap.xml/route';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('google news sitemap proxy', () => {
  it('passes the api xml through with the upstream status', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<urlset></urlset>',
    }) as unknown as typeof fetch;

    const res = await googleNewsSitemap();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    await expect(res.text()).resolves.toBe('<urlset></urlset>');
  });

  it('propagates an upstream error status rather than serving an empty body', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '',
    }) as unknown as typeof fetch;

    const res = await googleNewsSitemap();
    expect(res.status).toBe(502);
  });

  it('requests the upstream route with a revalidate window', async () => {
    const spy = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    globalThis.fetch = spy as unknown as typeof fetch;
    await googleNewsSitemap();
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/api/news/google-news-sitemap.xml');
    expect((init as Record<string, unknown>).next).toEqual({ revalidate: 300 });
  });

  it('relays the exact body from the api, so google sees the same xml', async () => {
    const xml = '<?xml version="1.0"?><urlset><url><loc>x</loc></url></urlset>';
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml }) as unknown as typeof fetch;
    const res = await googleNewsSitemap();
    expect(await res.text()).toBe(xml);
  });
});
