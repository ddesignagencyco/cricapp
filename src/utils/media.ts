import { PixelRatio } from 'react-native';

/*
 * Images come from Cloudinary at full size (a 1080 px photo is 200–300 KB).
 * Asking Cloudinary for the width a slot actually shows, in the screen's
 * pixel density, with automatic quality and format, cuts that 3–15× and is
 * the main thing that makes thumbnails appear quickly over a slow network.
 * Other hosts are returned untouched.
 */

/** Widths are rounded up to these steps so nearby sizes share one cached file. */
const STEPS = [160, 240, 320, 480, 640, 800, 1080, 1440];

export function sized(url: string | null | undefined, displayWidth: number): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  // Already transformed by us or by the editor.
  if (/\/image\/upload\/(c_|w_|q_|f_)/.test(url)) return url;
  const px = PixelRatio.getPixelSizeForLayoutSize(displayWidth);
  const w = STEPS.find(s => s >= px) ?? STEPS[STEPS.length - 1];
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${w},q_auto,f_auto/`);
}
