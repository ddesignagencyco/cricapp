import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import {
  authCookieName,
} from './auth-cookie.js';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  emailVerified: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const cookieName = authCookieName(config);
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookieHeader = request?.headers?.cookie;
          if (!cookieHeader) return null;
          const cookie = cookieHeader
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${cookieName}=`));
          return cookie
            ? decodeURIComponent(cookie.slice(cookieName.length + 1))
            : null;
        },
        // Temporary compatibility for existing API clients during rollout.
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      isAdmin: payload.isAdmin,
      isSuperAdmin: payload.isSuperAdmin ?? false,
      emailVerified: payload.emailVerified ?? false,
    };
  }
}
