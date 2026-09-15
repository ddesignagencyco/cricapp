export const STREAM_PROVIDERS = ['YouTube', 'Facebook', 'Twitch', 'Vimeo', 'Dailymotion'] as const;

export const CUSTOM_PROVIDER = '__custom__';

export type StreamProviderChoice = (typeof STREAM_PROVIDERS)[number] | typeof CUSTOM_PROVIDER | '';

export function youtubeVideoId(url: string): string | null {
  const raw = url.trim();
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com') {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery) return fromQuery;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (host === 'youtu.be') return parts[0] || null;
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1] || null;
    }
  } catch {
    // fall through to regex
  }
  const match = raw.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|watch\?(?:.*&)?v=))([A-Za-z0-9_-]{6,})/i,
  );
  return match?.[1] || null;
}

export function vimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] || null;
}

export function dailymotionVideoId(url: string): string | null {
  const match = url.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([A-Za-z0-9]+)/i);
  return match?.[1] || null;
}

export function inferStreamFromUrl(url: string): { provider: string; thumbnailUrl: string } {
  const trimmed = url.trim();
  if (!trimmed) return { provider: '', thumbnailUrl: '' };

  const youtubeId = youtubeVideoId(trimmed);
  if (youtubeId) {
    return {
      provider: 'YouTube',
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = vimeoVideoId(trimmed);
  if (vimeoId) {
    return {
      provider: 'Vimeo',
      thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
    };
  }

  const dailyId = dailymotionVideoId(trimmed);
  if (dailyId) {
    return {
      provider: 'Dailymotion',
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${dailyId}`,
    };
  }

  if (/facebook\.com|fb\.watch/i.test(trimmed)) {
    return { provider: 'Facebook', thumbnailUrl: '' };
  }
  if (/twitch\.tv/i.test(trimmed)) {
    return { provider: 'Twitch', thumbnailUrl: '' };
  }

  return { provider: '', thumbnailUrl: '' };
}

function oembedEndpoints(url: string): string[] {
  const trimmed = url.trim();
  const youtubeId = youtubeVideoId(trimmed);
  if (youtubeId) {
    const watch = `https://www.youtube.com/watch?v=${youtubeId}`;
    return [
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
      `https://noembed.com/embed?url=${encodeURIComponent(watch)}`,
    ];
  }
  const vimeoId = vimeoVideoId(trimmed);
  if (vimeoId) {
    const watch = `https://vimeo.com/${vimeoId}`;
    return [
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watch)}`,
      `https://noembed.com/embed?url=${encodeURIComponent(watch)}`,
    ];
  }
  const dailyId = dailymotionVideoId(trimmed);
  if (dailyId) {
    const watch = `https://www.dailymotion.com/video/${dailyId}`;
    return [
      `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(watch)}`,
      `https://noembed.com/embed?url=${encodeURIComponent(watch)}`,
    ];
  }
  return [];
}

export async function fetchStreamTitle(url: string, signal?: AbortSignal): Promise<string> {
  const endpoints = oembedEndpoints(url);
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { signal });
      if (!res.ok) continue;
      const data = (await res.json()) as { title?: unknown };
      if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
    } catch {
      if (signal?.aborted) return '';
    }
  }
  return '';
}

export function providerChoiceFromName(name?: string | null): StreamProviderChoice {
  if (!name) return '';
  const match = STREAM_PROVIDERS.find((item) => item.toLowerCase() === name.trim().toLowerCase());
  return match || CUSTOM_PROVIDER;
}
