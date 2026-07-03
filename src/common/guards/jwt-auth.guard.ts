import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Try to decode token and attach user, but never block
      const request = context.switchToHttp().getRequest();
      const authHeader: string | undefined = request.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
          );
          // Only trust if not expired
          if (!payload.exp || payload.exp * 1000 > Date.now()) {
            request.user = payload;
          }
        } catch {
          // malformed token — ignore
        }
      }
      return true;
    }

    return super.canActivate(context);
  }
}
