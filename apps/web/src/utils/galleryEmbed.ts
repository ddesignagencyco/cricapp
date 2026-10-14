export function isVerticalShortUrl(url?: string | null): boolean {
  return !!url && /youtube\.com\/shorts\//i.test(url);
}

export function youtubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:embed\/|shorts\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return match?.[1] || null;
}

export function buildGalleryEmbedUrl(raw?: string | null): string | null {
  if (!raw || raw === '#') return null;
  const id = youtubeId(raw);
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`;
  if (raw.includes('/embed/')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return null;
}

/** Extensions a browser can play in a native <video> without an iframe. */
const DIRECT_VIDEO_FILE = /\.(mp4|webm|ogv|ogg|mov|m4v)(?:$|[?#])/i;

/**
 * True when the asset is a file we can hand to a native <video> (what the CMS
 * upload writes to Cloudinary) rather than a page to embed.
 *
 * `buildGalleryEmbedUrl` falls through to "return any http(s) url", so it cannot
 * tell the two apart on its own. The distinction matters for the story viewer,
 * which needs its own play/pause, mute and progress control and can only get
 * them from a media element it owns — an iframe owns its own player instead.
 */
export function isDirectVideoUrl(url?: string | null): boolean {
  return !!url && DIRECT_VIDEO_FILE.test(url);
}
