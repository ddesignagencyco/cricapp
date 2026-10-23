import { adsTxtResponse } from '../../lib/advertisements/adsTxt';

export const revalidate = 60;

/**
 * `ads.txt` at the site root: the file AdSense crawls for websites (`app-ads.txt` is
 * only for mobile apps). Without it AdSense flags "ads.txt not found" during review.
 */
export function GET() {
  return adsTxtResponse();
}
