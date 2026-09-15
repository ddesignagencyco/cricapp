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
