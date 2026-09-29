import {
  youtubeVideoId,
  vimeoVideoId,
  dailymotionVideoId,
  inferStreamFromUrl,
  fetchStreamTitle,
  providerChoiceFromName,
  toPlayerEmbedUrl,
  CUSTOM_PROVIDER,
  STREAM_PROVIDERS,
} from '../utils/streamEmbed';

describe('youtubeVideoId', () => {
  it('reads the v query parameter from a watch url', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the v parameter when it comes after another param', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads a youtu.be short link', () => {
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads an embed url', () => {
    expect(youtubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads a shorts url', () => {
    expect(youtubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads a live url', () => {
    expect(youtubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the nocookie domain', () => {
    expect(youtubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('tolerates a missing www prefix', () => {
    expect(youtubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('handles a bare id with no scheme via the regex fallback', () => {
    expect(youtubeVideoId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for a non-youtube url', () => {
    expect(youtubeVideoId('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for a youtube url with no video id', () => {
    expect(youtubeVideoId('https://www.youtube.com/')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(youtubeVideoId('')).toBeNull();
  });
});

describe('vimeoVideoId', () => {
  it('reads the numeric id from a normal url', () => {
    expect(vimeoVideoId('https://vimeo.com/123456789')).toBe('123456789');
  });

  it('reads the id from a /video/ url', () => {
    expect(vimeoVideoId('https://vimeo.com/video/123456789')).toBe('123456789');
  });

  it('returns null for a non-vimeo url', () => {
    expect(vimeoVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

describe('dailymotionVideoId', () => {
  it('reads the id from a normal url', () => {
    expect(dailymotionVideoId('https://www.dailymotion.com/video/x8abcde')).toBe('x8abcde');
  });

  it('reads the id from an embed url', () => {
    expect(dailymotionVideoId('https://www.dailymotion.com/embed/video/x8abcde')).toBe('x8abcde');
  });

  it('reads the id from a dai.ly short link', () => {
    expect(dailymotionVideoId('https://dai.ly/x8abcde')).toBe('x8abcde');
  });

  it('returns null for a non-dailymotion url', () => {
    expect(dailymotionVideoId('https://vimeo.com/123')).toBeNull();
  });
});

describe('inferStreamFromUrl', () => {
  it('infers YouTube and builds a thumbnail', () => {
    expect(inferStreamFromUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'YouTube',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });

  it('infers Vimeo and builds a thumbnail', () => {
    expect(inferStreamFromUrl('https://vimeo.com/123456')).toEqual({
      provider: 'Vimeo',
      thumbnailUrl: 'https://vumbnail.com/123456.jpg',
    });
  });

  it('infers Dailymotion and builds a thumbnail', () => {
    expect(inferStreamFromUrl('https://dai.ly/x8abcde')).toEqual({
      provider: 'Dailymotion',
      thumbnailUrl: 'https://www.dailymotion.com/thumbnail/video/x8abcde',
    });
  });

  it('infers Facebook with no thumbnail', () => {
    expect(inferStreamFromUrl('https://www.facebook.com/somepage/videos/1')).toEqual({
      provider: 'Facebook',
      thumbnailUrl: '',
    });
  });

  it('infers Twitch with no thumbnail', () => {
    expect(inferStreamFromUrl('https://www.twitch.tv/somechannel')).toEqual({
      provider: 'Twitch',
      thumbnailUrl: '',
    });
  });

  it('returns blank fields for an unrecognised url', () => {
    expect(inferStreamFromUrl('https://example.com/stream')).toEqual({ provider: '', thumbnailUrl: '' });
  });

  it('returns blank fields for an empty url', () => {
    expect(inferStreamFromUrl('   ')).toEqual({ provider: '', thumbnailUrl: '' });
  });

  it('prefers YouTube over a facebook-looking query string', () => {
    expect(inferStreamFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ').provider).toBe('YouTube');
  });
});

describe('fetchStreamTitle', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the title from the first successful endpoint', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: '  Match Day Live  ' }),
    }) as unknown as typeof fetch;

    await expect(fetchStreamTitle('https://youtu.be/dQw4w9WgXcQ')).resolves.toBe('Match Day Live');
  });

  it('falls through to the second endpoint when the first fails', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Backup Title' }) }) as unknown as typeof fetch;

    await expect(fetchStreamTitle('https://youtu.be/dQw4w9WgXcQ')).resolves.toBe('Backup Title');
  });

  it('skips an endpoint that returns a blank title', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ title: '   ' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Real Title' }) }) as unknown as typeof fetch;

    await expect(fetchStreamTitle('https://youtu.be/dQw4w9WgXcQ')).resolves.toBe('Real Title');
  });

  it('returns an empty string when every endpoint fails', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    await expect(fetchStreamTitle('https://youtu.be/dQw4w9WgXcQ')).resolves.toBe('');
  });

  it('makes no request for an unsupported url', async () => {
    const spy = jest.fn();
    globalThis.fetch = spy as unknown as typeof fetch;

    await expect(fetchStreamTitle('https://example.com/stream')).resolves.toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('stops immediately when the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })) as unknown as typeof fetch;

    await expect(
      fetchStreamTitle('https://youtu.be/dQw4w9WgXcQ', controller.signal),
    ).resolves.toBe('');
  });
});

describe('providerChoiceFromName', () => {
  it.each(STREAM_PROVIDERS)('maps %s to itself', (provider) => {
    expect(providerChoiceFromName(provider)).toBe(provider);
  });

  it('is case and whitespace insensitive', () => {
    expect(providerChoiceFromName('  youtube ')).toBe('YouTube');
  });

  it('returns the custom sentinel for an unknown provider', () => {
    expect(providerChoiceFromName('Kaltura')).toBe(CUSTOM_PROVIDER);
  });

  it('returns an empty string when there is no name', () => {
    expect(providerChoiceFromName()).toBe('');
    expect(providerChoiceFromName(null)).toBe('');
    expect(providerChoiceFromName('')).toBe('');
  });
});

describe('toPlayerEmbedUrl', () => {
  it('builds a privacy-friendly nocookie YouTube embed', () => {
    const url = toPlayerEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(url).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(url).toContain('rel=0');
    expect(url).toContain('autoplay=0');
  });

  it('sets autoplay=1 when asked', () => {
    expect(toPlayerEmbedUrl('https://youtu.be/dQw4w9WgXcQ', { autoplay: true })).toContain(
      'autoplay=1',
    );
  });

  it('builds a Vimeo player url with chrome suppressed', () => {
    expect(toPlayerEmbedUrl('https://vimeo.com/123456')).toBe(
      'https://player.vimeo.com/video/123456?autoplay=0&title=0&byline=0&portrait=0',
    );
  });

  it('builds a Dailymotion embed url', () => {
    expect(toPlayerEmbedUrl('https://dai.ly/x8abcde')).toBe(
      'https://www.dailymotion.com/embed/video/x8abcde?autoplay=0&ui-start-screen-info=0',
    );
  });

  it('builds a Twitch video player url with the current host as parent', () => {
    const url = toPlayerEmbedUrl('https://www.twitch.tv/videos/123456', { hostname: 'example.com' });
    expect(url).toBe('https://player.twitch.tv/?video=123456&parent=example.com&autoplay=false');
  });

  it('falls back to a Twitch channel url', () => {
    const url = toPlayerEmbedUrl('https://twitch.tv/somechannel', { hostname: 'example.com' });
    expect(url).toBe('https://player.twitch.tv/?channel=somechannel&parent=example.com&autoplay=false');
  });

  it('passes an already-embeddable https url straight through', () => {
    expect(toPlayerEmbedUrl('https://example.com/embed/abc')).toBe('https://example.com/embed/abc');
  });

  it('returns null for an empty url', () => {
    expect(toPlayerEmbedUrl('  ')).toBeNull();
  });

  it('returns null for an unsupported url', () => {
    expect(toPlayerEmbedUrl('https://example.com/watch')).toBeNull();
  });

  it('rejects a non-https embed url so it cannot be upgraded to an iframe', () => {
    expect(toPlayerEmbedUrl('javascript:alert(1)//embed/x')).toBeNull();
  });
});
