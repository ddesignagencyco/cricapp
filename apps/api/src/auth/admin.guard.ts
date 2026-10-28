import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;

    // A super admin outranks an admin, even if the admin flag itself is off.
    if (!user || !(user.isAdmin || user.isSuperAdmin)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
