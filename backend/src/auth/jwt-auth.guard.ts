import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { SessionUser } from './auth.service.js';
import { AuthService } from './auth.service.js';
import { parseCookieHeader } from './cookie.utils.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      cookies?: Record<string, string | undefined>;
      user?: SessionUser;
    }>();

    try {
      const authorization = request.headers?.authorization;
      const cookies = request.cookies ?? parseCookieHeader(request.headers?.cookie);
      const accessToken = cookies.ferm_plus_access_token;
      const tokenValue = Array.isArray(authorization) ? authorization[0] : authorization;
      const payload = this.authService.readUserFromRequest(tokenValue, accessToken);
      request.user = await this.authService.hydrateSessionUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException('Session absente');
    }
  }
}
