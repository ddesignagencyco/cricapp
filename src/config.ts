/**
 * Base URL of the CricApp NestJS API (cric_info/apps/api, port 3001),
 * reached through a public HTTPS tunnel so the emulator and real phones
 * (debug or release) all talk to the same backend. Switch this to the
 * deployed API for launch.
 */
export const API_URL = 'https://bycpirzw4l.localto.net';

/**
 * Sent with every request. The free Localtonet tunnel answers first-time
 * visitors with an HTML warning page unless this header is present.
 */
export const API_HEADERS: Record<string, string> = { 'localtonet-skip-warning': '1' };

/** The website, for pages the app links out to (policies, contact). */
export const SITE_URL = 'https://pakcriczone.com';

export const REQUEST_TIMEOUT_MS = 15000;
