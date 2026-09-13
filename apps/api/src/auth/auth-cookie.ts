import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';

export const DEFAULT_AUTH_COOKIE_NAME = 'cricapp_access_token';

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
