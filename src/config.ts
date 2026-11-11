/**
 * Base URL of the deployed CricApp NestJS API (hosted on Render). The
 * client appends `/api` to this, so keep it as the bare host with no
 * trailing path or slash.
 */
export const API_URL = 'https://cricapp-api.onrender.com';

/** Sent with every request. */
export const API_HEADERS: Record<string, string> = {};

/** The website, for pages the app links out to (policies, contact). */
export const SITE_URL = 'https://pakcriczone.com';

export const REQUEST_TIMEOUT_MS = 20000;
