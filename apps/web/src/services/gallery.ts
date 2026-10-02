import { apiGet, apiGetOptional, apiPost, apiDelete, extractPage } from './api/client';
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
}): Promise<GalleryMedia> {
  const body = new FormData();
  body.append('file', input.file);
  body.append('type', input.type);
  if (input.title) body.append('title', input.title);
  if (input.caption) body.append('caption', input.caption);
  return apiPost<GalleryMedia>('/gallery', body, { headers: authHeaders() });
}

export async function deleteGalleryMedia(id: string): Promise<void> {
  await apiDelete(`/gallery/${id}`, { headers: authHeaders() });
}
