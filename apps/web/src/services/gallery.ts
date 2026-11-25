import { apiGet, apiGetOptional, apiPost, apiDelete, extractPage, API_ORIGIN } from './api/client';
import { authHeaders } from './auth';

export type GalleryMediaType = 'image' | 'short' | 'video';

export interface GalleryMedia {
  id: string;
  title: string | null;
  caption: string | null;
  type: GalleryMediaType;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  createdAt?: string;
}

export interface GalleryListParams {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  type?: GalleryMediaType;
}

export interface GalleryPageResult {
  items: GalleryMedia[];
  total: number;
  totalPages: number;
}

export async function fetchGalleryPage(
  params: GalleryListParams = {},
  signal?: AbortSignal
): Promise<GalleryPageResult> {
  const res = await apiGet('/gallery', { page: 1, limit: 40, ...params }, { signal });
  const { items, meta } = extractPage<GalleryMedia>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export function fetchGalleryItem(id: string, signal?: AbortSignal): Promise<GalleryMedia | null> {
  return apiGetOptional<GalleryMedia>(`/gallery/${id}`, undefined, { signal });
}

export async function uploadGalleryMedia(input: {
  file: File;
  type: GalleryMediaType;
  title?: string;
  caption?: string;
  onProgress?: (percent: number) => void;
}): Promise<GalleryMedia> {
  const body = new FormData();
  body.append('file', input.file);
  body.append('type', input.type);
  if (input.title) body.append('title', input.title);
  if (input.caption) body.append('caption', input.caption);

  if (!input.onProgress || typeof XMLHttpRequest === 'undefined') {
    return apiPost<GalleryMedia>('/gallery', body, { headers: authHeaders() });
  }

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const base = rawApiUrl === 'same-origin' ? '' : (API_ORIGIN || rawApiUrl).replace(/\/$/, '');
  const url = `${base}/api/gallery`;

  return new Promise<GalleryMedia>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.withCredentials = true;

    const headers = authHeaders() as Record<string, string>;
    for (const [k, v] of Object.entries(headers)) {
      if (v) xhr.setRequestHeader(k, v);
    }

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        input.onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        input.onProgress?.(100);
        try {
          resolve(JSON.parse(xhr.responseText) as GalleryMedia);
        } catch {
          reject(new Error('Invalid server response after upload.'));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string | string[] };
          const msg = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
          reject(new Error(msg || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading media.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(body);
  });
}

export async function deleteGalleryMedia(id: string): Promise<void> {
  await apiDelete(`/gallery/${id}`, { headers: authHeaders() });
}
