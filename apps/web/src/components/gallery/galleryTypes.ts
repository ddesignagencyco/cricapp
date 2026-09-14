export type GalleryPhoto = {
  id: string;
  src: string;
  title: string;
  href: string;
  language?: string;
  author?: string;
  date?: string;
  excerpt?: string;
};

export type GalleryShort = {
  id: string;
  title: string;
  image?: string;
  embedUrl?: string;
  rawUrl?: string;
  status?: string;
  href?: string;
  kind: 'video' | 'photo';
};
