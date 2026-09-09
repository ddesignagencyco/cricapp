import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const requiredKey = this.config.get<string>('API_KEY');
    if (!requiredKey) return true;

    const req = ctx.switchToHttp().getRequest();
    const provided =
      req.headers['x-api-key'] ??
      req.query.api_key;

    if (!provided || provided !== requiredKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}
