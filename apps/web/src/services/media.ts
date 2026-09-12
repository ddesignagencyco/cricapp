import { apiPost } from './api/client';
import { authHeaders } from './auth';

export interface MediaUploadResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_TYPES = /^image\/(jpeg|png|webp|gif|avif)$/;

const RECENT_KEY = 'cricapp.media.recent';
const RECENT_LIMIT = 40;

export interface RecentMedia extends MediaUploadResult {
  uploadedAt: string;
}

export function assertMediaFile(file: File): void {
  if (!MEDIA_TYPES.test(file.type)) {
    throw new Error('Use JPEG, PNG, WebP, GIF, or AVIF.');
  }
  if (file.size > MEDIA_MAX_BYTES) {
    throw new Error('Image must be 10 MB or smaller.');
  }
}

export function readRecentMedia(): RecentMedia[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMedia[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.url) : [];
  } catch {
    return [];
  }
}

export function rememberMedia(uploaded: MediaUploadResult): RecentMedia[] {
  const next: RecentMedia = { ...uploaded, uploadedAt: new Date().toISOString() };
  const recent = [next, ...readRecentMedia().filter((item) => item.publicId !== uploaded.publicId)].slice(0, RECENT_LIMIT);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  return recent;
}

export async function uploadMedia(file: File): Promise<MediaUploadResult> {
  assertMediaFile(file);
  const body = new FormData();
  body.append('file', file);
  const uploaded = await apiPost<MediaUploadResult>('/admin/media/upload', body, { headers: authHeaders() });
  rememberMedia(uploaded);
  return uploaded;
}
