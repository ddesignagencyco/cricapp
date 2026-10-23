import { adsTxtResponse } from '../../lib/advertisements/adsTxt';

export const revalidate = 60;

/** `app-ads.txt` at the site root, for app stores. Same body as `/ads.txt`. */
export function GET() {
  return adsTxtResponse();
}
