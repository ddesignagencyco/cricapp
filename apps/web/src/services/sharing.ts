import type { Metadata } from 'next';
import { apiGet } from './api/client';

export type ShareType = 'match' | 'news' | 'player' | 'team';

export interface ShareLink {
  url: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

/** Click-time share link. The API also increments share_stats. */
export function getShareLink(type: ShareType, id: string): Promise<ShareLink> {
  return apiGet<ShareLink>(`/share/${type}/${encodeURIComponent(id)}`);
}

/** OG tags for crawlers. Do not call getShareLink here — that endpoint tracks a share. */
export function sharePageMetadata(input: {
  title: string;
  description?: string;
  image?: string | null;
  path: string;
}): Metadata {
  const title = input.title;
  const description = input.description || input.title;
  const image = input.image || undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: input.path,
      type: 'website',
      siteName: 'PAK CRICZONE',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
