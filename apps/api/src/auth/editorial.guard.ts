import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

export type EditorialRole = 'USER' | 'AUTHOR' | 'EDITOR';

export function hasEditorialAccess(user: {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  editorialRole?: string;
} | null | undefined): boolean {
  if (!user) return false;
  return Boolean(
    user.isAdmin ||
      user.isSuperAdmin ||
      user.editorialRole === 'AUTHOR' ||
      user.editorialRole === 'EDITOR',
  );
}

export function isEditorOrAdmin(user: {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  editorialRole?: string;
} | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.isAdmin || user.isSuperAdmin || user.editorialRole === 'EDITOR');
}

@Injectable()
export class EditorialGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = ctx.switchToHttp().getRequest();
    if (!hasEditorialAccess(req.user)) {
      throw new ForbiddenException('Editorial access required');
    }
    return true;
  }
}

@Injectable()
export class EditorGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = ctx.switchToHttp().getRequest();
    if (!isEditorOrAdmin(req.user)) {
      throw new ForbiddenException('Editor or admin access required');
    }
    return true;
  }
}
