import { describe, expect, it } from '@jest/globals';
import {
  galleryDurationLimit,
  isGalleryDurationAllowed,
} from './media.service.js';

describe('galleryDurationLimit', () => {
  it('enforces 30 seconds for shorts and 60 seconds for videos', () => {
    expect(galleryDurationLimit('short')).toBe(30);
    expect(galleryDurationLimit('video')).toBe(60);
    expect(galleryDurationLimit('image')).toBeNull();
  });

  it('accepts the boundary and rejects over-limit media', () => {
    expect(isGalleryDurationAllowed('short', 30)).toBe(true);
    expect(isGalleryDurationAllowed('short', 30.01)).toBe(false);
    expect(isGalleryDurationAllowed('video', 60)).toBe(true);
    expect(isGalleryDurationAllowed('video', 60.01)).toBe(false);
    expect(isGalleryDurationAllowed('video', null)).toBe(false);
    expect(isGalleryDurationAllowed('image', null)).toBe(true);
  });
});
