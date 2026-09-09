import { apiGet } from './api/client';

export type ShareType = 'match' | 'news' | 'player' | 'team';

export interface ShareLink {
  url: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export function getShareLink(type: ShareType, id: string): Promise<ShareLink> {
  return apiGet<ShareLink>(`/share/${type}/${encodeURIComponent(id)}`);
}
