import {
  apiGet,
  apiGetOptional,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  extractPage,
  ApiError,
  CLIENT_BASE,
} from '../services/api/client';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: async () => JSON.parse(body),
    text: async () => body,
  } as unknown as Response;
}

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: url as string, init: init as RequestInit };
}

describe('url building', () => {
  it('prefixes /api onto the path', async () => {
    await apiGet('/matches');
    expect(lastCall().url).toBe(`${CLIENT_BASE}/api/matches`);
  });

  it('appends params as a query string', async () => {
    await apiGet('/matches', { page: 2, limit: 20 });
    expect(lastCall().url).toContain('?page=2&limit=20');
  });

  it('drops undefined, null and empty params', async () => {
    await apiGet('/matches', { a: undefined, b: null, c: '', d: 'kept' });
    expect(lastCall().url).toContain('?d=kept');
    expect(lastCall().url).not.toContain('a=');
  });

  it('keeps zero and false, which are real filter values', async () => {
    await apiGet('/news', { page: 0, featured: false });
    const url = lastCall().url;
    expect(url).toContain('page=0');
    expect(url).toContain('featured=false');
  });

  it('produces no question mark when every param is dropped', async () => {
    await apiGet('/matches', { a: undefined });
    expect(lastCall().url).not.toContain('?');
  });

  it('encodes param values', async () => {
    await apiGet('/search', { q: 'a b&c' });
    expect(lastCall().url).toContain('q=a+b%26c');
  });
});

describe('request options', () => {
  it('sends cookies by default', async () => {
    await apiGet('/matches');
    expect(lastCall().init.credentials).toBe('include');
  });

  it('lets the caller override credentials', async () => {
    await apiGet('/matches', undefined, { credentials: 'omit' });
    expect(lastCall().init.credentials).toBe('omit');
  });

  it('uses the right http verb for each helper', async () => {
    await apiGet('/a');
    await apiPost('/b');
    await apiPut('/c');
    await apiPatch('/d');
    await apiDelete('/e');
    expect(fetchMock.mock.calls.map((c) => (c[1] as RequestInit).method)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ]);
  });

  it('serialises a plain body to json and sets the content type', async () => {
    await apiPost('/news', { title: 'Hello' });
    const { init } = lastCall();
    expect(init.body).toBe(JSON.stringify({ title: 'Hello' }));
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
  });

  it('does not override a caller supplied content type', async () => {
    await apiPost('/news', { a: 1 }, { headers: { 'Content-Type': 'application/vnd.custom' } });
    expect(new Headers(lastCall().init.headers).get('content-type')).toBe('application/vnd.custom');
  });

  it('sends FormData unchanged with no json content type', async () => {
    const form = new FormData();
    form.append('file', 'x');
    await apiPost('/gallery', form);
    const { init } = lastCall();
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).get('content-type')).not.toBe('application/json');
  });

  it('forwards the next revalidate hint for server components', async () => {
    await apiGet('/news', undefined, { revalidate: 60 });
    expect((lastCall().init as Record<string, unknown>).next).toEqual({ revalidate: 60 });
  });

  it('forwards the cache hint', async () => {
    await apiGet('/news', undefined, { cache: 'no-store' });
    expect(lastCall().init.cache).toBe('no-store');
  });
});

describe('response handling', () => {
  it('returns the parsed json body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'm1' }));
    await expect(apiGet('/matches/m1')).resolves.toEqual({ id: 'm1' });
  });

  it('returns undefined for a 204', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: async () => {
        throw new Error('no body');
      },
      text: async () => '',
    });
    await expect(apiDelete('/matches/m1')).resolves.toBeUndefined();
  });

  it('returns raw text when the content type is not json', async () => {
    fetchMock.mockResolvedValue(textResponse('plain body'));
    await expect(apiGet('/health')).resolves.toBe('plain body');
  });

  it('returns undefined for an empty non-json body', async () => {
    fetchMock.mockResolvedValue(textResponse(''));
    await expect(apiGet('/health')).resolves.toBeUndefined();
  });

  it('throws an ApiError carrying the status and body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Match not found' }, 404));
    await expect(apiGet('/matches/nope')).rejects.toBeInstanceOf(ApiError);
    await expect(apiGet('/matches/nope')).rejects.toMatchObject({
      status: 404,
      message: 'Match not found',
    });
  });

  it('falls back to a generic message when the body has none', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    await expect(apiGet('/x')).rejects.toMatchObject({ message: 'API error 500' });
  });

  it('uses a text body as the message source when json parsing fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => {
        throw new Error('not json');
      },
      text: async () => 'Bad Gateway',
    } as unknown as Response);
    await expect(apiGet('/x')).rejects.toMatchObject({ status: 502, message: 'API error 502' });
  });
});

describe('apiGetOptional', () => {
  it('returns the data on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'm1' }));
    await expect(apiGetOptional('/matches/m1')).resolves.toEqual({ id: 'm1' });
  });

  it('swallows a 404 and returns null', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 404));
    await expect(apiGetOptional('/matches/nope')).resolves.toBeNull();
  });

  it('swallows a 429 and returns null', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'slow down' }, 429));
    await expect(apiGetOptional('/matches')).resolves.toBeNull();
  });

  it('still throws for a 500 so real outages are not hidden', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500));
    await expect(apiGetOptional('/matches')).rejects.toBeInstanceOf(ApiError);
  });

  it('rethrows a network error untouched', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(apiGetOptional('/matches')).rejects.toThrow('offline');
  });
});

describe('extractPage', () => {
  it('returns empty items and meta for a nullish response', () => {
    expect(extractPage(null)).toEqual({
      items: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  it('unwraps a plain array', () => {
    expect(extractPage([1, 2, 3])).toEqual({
      items: [1, 2, 3],
      meta: { total: 3, page: 1, limit: 3, totalPages: 1 },
    });
  });

  it('unwraps a paginated envelope', () => {
    const res = {
      data: ['a', 'b'],
      meta: { totalRecords: 50, page: 2, limit: 2, totalPages: 25 },
    };
    expect(extractPage(res)).toEqual({
      items: ['a', 'b'],
      meta: { total: 50, page: 2, limit: 2, totalPages: 25 },
    });
  });

  it('derives totalPages when the api omits it', () => {
    const res = { data: ['a'], meta: { totalRecords: 45, page: 1, limit: 20 } };
    expect(extractPage(res).meta.totalPages).toBe(3);
  });

  it('handles a data array with no meta at all', () => {
    expect(extractPage({ data: ['a', 'b'] })).toEqual({
      items: ['a', 'b'],
      meta: { total: 2, page: 1, limit: 2, totalPages: 1 },
    });
  });

  it('returns empty items for an unrecognised shape', () => {
    expect(extractPage({ unexpected: true }).items).toEqual([]);
  });

  it('defaults a zero limit to 20 so totalPages is not Infinity', () => {
    const res = { data: ['a'], meta: { totalRecords: 10, page: 1, limit: 0 } };
    expect(extractPage(res).meta).toMatchObject({ limit: 20, totalPages: 1 });
  });
});
