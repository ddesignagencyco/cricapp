const STREAMING_HOST =
  /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|facebook\.com|fb\.watch|fb\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|streamable\.com|twitch\.tv)$/i;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export type MediaDownloadOutcome = 'downloaded' | 'opened';

function pathnameOf(url: string): string {
  try {
    return new URL(url, typeof window === 'undefined' ? 'https://example.com' : window.location.origin).pathname;
  } catch {
    return '';
  }
}

function extensionFrom(url: string): string {
  const name = pathnameOf(url).split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  const ext = name.slice(dot + 1).split(/[?#]/)[0].toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : '';
}

function isStreamingUrl(url: string): boolean {
  try {
    const host = new URL(url, typeof window === 'undefined' ? 'https://example.com' : window.location.origin).hostname;
    return STREAMING_HOST.test(host);
  } catch {
    return false;
  }
}

/** "Photos, shorts and videos" → "photos-shorts-and-videos", capped so the name stays valid on every OS. */
export function mediaFileName(title: string | null | undefined, url: string, fallbackExt = 'jpg'): string {
  const fromUrl = extensionFrom(url);
  const base = (title || 'pakcriczone-media')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'pakcriczone-media'}.${fromUrl || fallbackExt}`;
}

function openInNewTab(url: string): void {
  if (typeof window === 'undefined') return;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.assign(url);
}

function triggerAnchor(objectUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

/**
 * Save a remote asset to the device. Media served without CORS headers cannot be
 * turned into a blob, and streaming hosts (YouTube and friends) have no original
 * file behind the watch URL — both cases open the source instead of failing.
 */
export async function downloadMedia(
  url: string,
  input: { title?: string | null; fallbackExt?: string; signal?: AbortSignal } = {}
): Promise<MediaDownloadOutcome> {
  if (!url) return 'opened';
  if (isStreamingUrl(url)) {
    openInNewTab(url);
    return 'opened';
  }

  const fallbackExt = input.fallbackExt || 'jpg';
  try {
    const res = await fetch(url, input.signal ? { signal: input.signal } : {});
    if (!res.ok) throw new Error(`Request failed with ${res.status}`);
    const blob = await res.blob();
    const mime = blob.type.split(';')[0].trim().toLowerCase();
    const ext = mime && EXT_BY_MIME[mime] ? EXT_BY_MIME[mime] : fallbackExt;
    triggerAnchor(URL.createObjectURL(blob), mediaFileName(input.title, url, ext));
    return 'downloaded';
  } catch {
    openInNewTab(url);
    return 'opened';
  }
}
