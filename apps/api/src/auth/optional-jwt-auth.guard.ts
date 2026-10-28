import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Reads the session when there is one and lets the request through either
 * way, so a public endpoint can personalise its answer (e.g. "you reacted").
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser | null {
    return user || null;
  }
}
