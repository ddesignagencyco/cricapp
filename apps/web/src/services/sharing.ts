import type { Metadata } from 'next';
import { apiGet } from './api/client';

export type ShareType =
  | 'match'
  | 'news'
  | 'player'
  | 'team'
  | 'tour'
  | 'tournament'
  | 'gallery';

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

const SITE_ORIGIN = 'https://pakcriczone.com';

/** OG tags for crawlers. Do not call getShareLink here — that endpoint tracks a share. */
export function sharePageMetadata(input: {
  title: string;
  description?: string;
  image?: string | null;
  path: string;
  /**
   * Open Graph title, when it should differ from the document title. A match page
   * appends the status, which belongs on a social card but not in the tab title.
   */
  ogTitle?: string;
  ogDescription?: string;
  ogType?: 'website' | 'article';
  /**
   * Emit an absolute canonical URL. On by default, because a page reachable at both
   * `/x` and `/x?tab=scorecard` should declare one of them as canonical.
   */
  canonical?: boolean;
}): Metadata {
  const title = input.title;
  const description = input.description || input.title;
  const image = input.image || undefined;
  const canonicalUrl = `${SITE_ORIGIN}${input.path}`;
  return {
    title,
    description,
    alternates: input.canonical === false ? undefined : { canonical: canonicalUrl },
    openGraph: {
      title: input.ogTitle || title,
      description: input.ogDescription || description,
      url: input.path,
      type: input.ogType || 'website',
      siteName: 'PAK CRICZONE',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: input.ogTitle || title,
      description: input.ogDescription || description,
      images: image ? [image] : undefined,
    },
  };
}
