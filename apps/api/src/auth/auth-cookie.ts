import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';

export const DEFAULT_AUTH_COOKIE_NAME = 'cricapp_access_token';

/**
 * Readable companion to the HttpOnly session cookie. It carries no secret, only
 * "a session exists", so the web app can skip probing `GET /auth/me` for
 * anonymous visitors (that probe 401s on every page view and Lighthouse reports
 * it as a console error). Keep in sync with `AUTH_HINT_COOKIE` in the web app.
 */
export const AUTH_HINT_COOKIE_NAME = 'cz_signed_in';

export function authHintCookieOptions(config: ConfigService): CookieOptions {
  return { ...authCookieOptions(config), httpOnly: false };
}

export function authCookieName(config: ConfigService): string {
  return config.get<string>('AUTH_COOKIE_NAME', DEFAULT_AUTH_COOKIE_NAME);
}

export function authCookieOptions(config: ConfigService): CookieOptions {
  const production = config.get<string>('NODE_ENV') === 'production';
  const secure =
    config.get<string>('AUTH_COOKIE_SECURE') === 'true' || production;
  const sameSite = config.get<string>(
    'AUTH_COOKIE_SAME_SITE',
    production ? 'lax' : 'lax',
  ) as CookieOptions['sameSite'];
  const domain = config.get<string>('AUTH_COOKIE_DOMAIN');

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: Number(
      config.get<string>('AUTH_COOKIE_MAX_AGE_MS', '604800000'),
    ),
    ...(domain ? { domain } : {}),
  };
}
