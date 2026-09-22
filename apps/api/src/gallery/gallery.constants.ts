export const GALLERY_TYPES = ['image', 'short', 'video'] as const;
export type GalleryType = (typeof GALLERY_TYPES)[number];

/** Public site tabs: image / short / video (Cloudinary resource is image or video). */
export const GALLERY_RESOURCE_TYPES = ['image', 'video'] as const;
export type GalleryResourceType = (typeof GALLERY_RESOURCE_TYPES)[number];

/** What the asset is for — only `gallery` appears on GET /gallery. */
export const MEDIA_PURPOSES = ['gallery', 'editorial'] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export const PUBLIC_GALLERY_PURPOSE: MediaPurpose = 'gallery';
