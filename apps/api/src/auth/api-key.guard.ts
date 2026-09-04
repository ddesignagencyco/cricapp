import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
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
