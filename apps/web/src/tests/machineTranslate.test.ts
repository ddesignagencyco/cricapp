import { translatePlain, translateHtml, translateNewsCopy } from '../lib/machineTranslate';

const originalFetch = globalThis.fetch;

function okResponse(text: unknown) {
  return {
    ok: true,
    json: async () => ({ responseStatus: 200, responseData: { translatedText: text } }),
  };
}

/**
 * Echoes the query back with a marker so assertions can find the source text.
 * Packed batches arrive joined by §, so each part is marked separately —
 * prefixing the whole string would leave the 2nd..nth part looking untranslated.
 */
function echoFetch() {
  return jest.fn((input: string) => {
    const url = new URL(input);
    const q = url.searchParams.get('q') ?? '';
    const marked = q
      .split('§')
      .map((part) => `UR:${part.trim()}`)
      .join(' § ');
    return Promise.resolve(okResponse(marked));
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('translatePlain', () => {
  it('returns the input untouched for empty or whitespace input', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(translatePlain('   ', 'en', 'ur')).resolves.toBe('   ');
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends the correct langpair to the provider', async () => {
    const spy = echoFetch();
    globalThis.fetch = spy as unknown as typeof fetch;
    await translatePlain('Pakistan won', 'en', 'ur');
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.searchParams.get('langpair')).toBe('en|ur');
    expect(url.searchParams.get('q')).toBe('Pakistan won');
  });

  it('returns the translated text', async () => {
    globalThis.fetch = echoFetch() as unknown as typeof fetch;
    await expect(translatePlain('Pakistan won', 'en', 'ur')).resolves.toBe('UR:Pakistan won');
  });

  it('skips the request when en to ur input is already Urdu', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(translatePlain('پاکستان جیتا', 'en', 'ur')).resolves.toBe('پاکستان جیتا');
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips the request when ur to en input is not Urdu', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(translatePlain('Pakistan won', 'ur', 'en')).resolves.toBe('Pakistan won');
    expect(spy).not.toHaveBeenCalled();
  });

  it('throws on a non-ok response', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as unknown as typeof fetch;
    await expect(translatePlain('Pakistan won', 'en', 'ur')).rejects.toThrow('Translation request failed (503)');
  });

  it('throws when the provider reports a non-200 status', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ responseStatus: '429', responseDetails: 'Daily limit reached' }),
    }) as unknown as typeof fetch;
    await expect(translatePlain('Pakistan won', 'en', 'ur')).rejects.toThrow('Daily limit reached');
  });

  it('throws on a MYMEMORY quota warning returned as 200', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(okResponse('MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS')) as unknown as typeof fetch;
    await expect(translatePlain('Pakistan won', 'en', 'ur')).rejects.toThrow();
  });

  it('falls back to a generic message when the provider gives no details', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(okResponse('')) as unknown as typeof fetch;
    await expect(translatePlain('Pakistan won', 'en', 'ur')).rejects.toThrow(
      'Translation request failed',
    );
  });

  it('splits long text into chunks and rejoins the result', async () => {
    const spy = echoFetch();
    globalThis.fetch = spy as unknown as typeof fetch;
    const long = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
    const out = await translatePlain(long, 'en', 'ur');
    expect(spy.mock.calls.length).toBeGreaterThan(1);
    expect(out).toContain('word0');
    expect(out).toContain('word199');
  });

  it('keeps every chunk under the provider query limit', async () => {
    const spy = echoFetch();
    globalThis.fetch = spy as unknown as typeof fetch;
    await translatePlain(Array.from({ length: 300 }, (_, i) => `w${i}`).join(' '), 'en', 'ur');
    for (const call of spy.mock.calls) {
      const q = new URL(call[0] as string).searchParams.get('q') ?? '';
      expect(new TextEncoder().encode(q).length).toBeLessThanOrEqual(450);
    }
  });
});

describe('translateHtml', () => {
  it('returns html untouched when it is empty', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(translateHtml('   ', 'en', 'ur')).resolves.toBe('   ');
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns html untouched when it has no text nodes', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(translateHtml('<p><br></p>', 'en', 'ur')).resolves.toBe('<p><br></p>');
    expect(spy).not.toHaveBeenCalled();
  });

  it('translates text while leaving tags exactly in place', async () => {
    globalThis.fetch = echoFetch() as unknown as typeof fetch;
    const out = await translateHtml('<p>Hello</p>', 'en', 'ur');
    expect(out).toBe('<p>UR:Hello</p>');
  });

  it('preserves attributes and their order', async () => {
    globalThis.fetch = echoFetch() as unknown as typeof fetch;
    const out = await translateHtml('<a href="/x" class="link">Hello</a>', 'en', 'ur');
    expect(out).toBe('<a href="/x" class="link">UR:Hello</a>');
  });

  it('escapes angle brackets coming back from the provider', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(okResponse('a < b & c'))
      .mockResolvedValue(okResponse('a < b & c')) as unknown as typeof fetch;
    const out = await translateHtml('<p>Hello</p>', 'en', 'ur');
    expect(out).toBe('<p>a &lt; b &amp; c</p>');
  });

  it('decodes entities before sending so the provider sees real text', async () => {
    const spy = echoFetch();
    globalThis.fetch = spy as unknown as typeof fetch;
    await translateHtml('<p>Tom &amp; Jerry</p>', 'en', 'ur');
    const q = new URL(spy.mock.calls[0][0] as string).searchParams.get('q');
    expect(q).toBe('Tom & Jerry');
  });

  it('translates several text nodes independently', async () => {
    globalThis.fetch = echoFetch() as unknown as typeof fetch;
    const out = await translateHtml('<p>One</p><p>Two</p>', 'en', 'ur');
    expect(out).toContain('UR:One');
    expect(out).toContain('UR:Two');
  });
});

describe('translateNewsCopy', () => {
  const fields = {
    title: 'Pakistan won',
    summary: 'A short summary',
    content: '<p>Body text</p>',
    metaTitle: 'Meta title',
    metaDescription: 'Meta description',
  };

  it('returns the fields untouched when the languages match', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await expect(translateNewsCopy(fields, 'en', 'en')).resolves.toBe(fields);
    expect(spy).not.toHaveBeenCalled();
  });

  it('translates every field and preserves the shape', async () => {
    globalThis.fetch = echoFetch() as unknown as typeof fetch;
    const out = await translateNewsCopy(fields, 'en', 'ur');
    expect(Object.keys(out).sort()).toEqual(Object.keys(fields).sort());
    expect(out.title).toBe('UR:Pakistan won');
    expect(out.summary).toBe('UR:A short summary');
    expect(out.metaTitle).toBe('UR:Meta title');
    expect(out.metaDescription).toBe('UR:Meta description');
  });

  it('keeps the html structure of the content field', async () => {
    globalThis.fetch = echoFetch() as unknown as typeof fetch;
    const out = await translateNewsCopy(fields, 'en', 'ur');
    expect(out.content).toBe('<p>UR:Body text</p>');
  });
});
