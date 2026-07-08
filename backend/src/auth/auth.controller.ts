import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from './current-user.decorator.js';
import { AuthService } from './auth.service.js';
import type { SessionUser } from './auth.service.js';
import { parseCookieHeader } from './cookie.utils.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RegisterAdminDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class CreateOwnerDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  farmId?: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

@Controller()
export class AuthController {
  private readonly accessCookieName = 'ferm_plus_access_token';
  private readonly refreshCookieName = 'ferm_plus_refresh_token';

  constructor(private readonly authService: AuthService) {}

  @Post('auth/register-admin')
  async registerAdmin(
    @Body() body: RegisterAdminDto,
    @Req() request: { headers?: Record<string, string | string[] | undefined>; ip?: string; ips?: string[]; socket?: { remoteAddress?: string } },
    @Res({ passthrough: true })
    response: { cookie: (name: string, value: string, options?: Record<string, unknown>) => void }
  ) {
    const session = await this.authService.registerAdmin(
      body.fullName,
      body.email,
      body.password,
      this.getRequestMeta(request)
    );
    this.writeAuthCookies(response, session.accessToken, session.refreshToken);
    return {
      token: session.token,
      user: session.user
    };
  }

  @Post('auth/create-owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createOwner(
    @Body() body: CreateOwnerDto,
    @CurrentUser() user?: SessionUser
  ) {
    const owner = await this.authService.createOwnerAccount(
      body.fullName,
      body.email,
      body.password,
      body.farmId ?? null,
      user ? { id: user.id, role: user.role } : null
    );

    return {
      owner
    };
  }

  @Get('auth/bootstrap-status')
  async bootstrapStatus() {
    return this.authService.getBootstrapStatus();
  }

  @Post('auth/session')
  async login(
    @Body() body: LoginDto,
    @Req() request: { headers?: Record<string, string | string[] | undefined>; ip?: string; ips?: string[]; socket?: { remoteAddress?: string } },
    @Res({ passthrough: true })
    response: { cookie: (name: string, value: string, options?: Record<string, unknown>) => void }
  ) {
    const session = await this.authService.login(body.email, body.password, this.getRequestMeta(request));
    this.writeAuthCookies(response, session.accessToken, session.refreshToken);
    return {
      token: session.token,
      user: session.user
    };
  }

  @Post('auth/refresh')
  async refresh(
    @Req() request: {
      cookies?: Record<string, string | undefined>;
      headers?: Record<string, string | string[] | undefined>;
      ip?: string;
      ips?: string[];
      socket?: { remoteAddress?: string };
    },
    @Res({ passthrough: true })
    response: {
      cookie: (name: string, value: string, options?: Record<string, unknown>) => void;
      clearCookie: (name: string, options?: Record<string, unknown>) => void;
    }
  ) {
    const refreshToken = this.readCookieFromRequest(request, this.refreshCookieName);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token absent');
    }

    const session = await this.authService.refreshSession(refreshToken, this.getRequestMeta(request));
    this.writeAuthCookies(response, session.accessToken, session.refreshToken);
    return {
      token: session.token,
      user: session.user
    };
  }

  @Post('auth/logout')
  async logout(
    @Req() request: {
      cookies?: Record<string, string | undefined>;
      headers?: Record<string, string | string[] | undefined>;
    },
    @Res({ passthrough: true })
    response: { clearCookie: (name: string, options?: Record<string, unknown>) => void }
  ) {
    await this.authService.logout(this.readCookieFromRequest(request, this.refreshCookieName));
    this.clearAuthCookies(response);
    return { success: true };
  }

  @Post('auth/me/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user?: SessionUser
  ) {
    if (!user) {
      throw new UnauthorizedException('Session absente');
    }

    await this.authService.changeAdminPassword(user.id, body.currentPassword, body.newPassword);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user?: SessionUser) {
    try {
      return user;
    } catch {
      throw new UnauthorizedException('Session absente');
    }
  }

  private writeAuthCookies(
    response: { cookie: (name: string, value: string, options?: Record<string, unknown>) => void },
    accessToken: string,
    refreshToken: string
  ) {
    const cookieOptions = this.authService.getCookieOptions();
    response.cookie(this.accessCookieName, accessToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 15
    });
    response.cookie(this.refreshCookieName, refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
  }

  private clearAuthCookies(response: {
    clearCookie: (name: string, options?: Record<string, unknown>) => void;
  }) {
    const cookieOptions = this.authService.getCookieOptions();
    response.clearCookie(this.accessCookieName, cookieOptions);
    response.clearCookie(this.refreshCookieName, cookieOptions);
  }

  private getRequestMeta(request: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
    ips?: string[];
    socket?: { remoteAddress?: string };
  }) {
    const headerUserAgent = request.headers?.['user-agent'];
    const userAgent = Array.isArray(headerUserAgent) ? headerUserAgent[0] : headerUserAgent;

    return {
      userAgent: userAgent ?? null,
      ipAddress: request.ip ?? request.ips?.[0] ?? request.socket?.remoteAddress ?? null
    };
  }

  private readCookieFromRequest(
    request: {
      cookies?: Record<string, string | undefined>;
      headers?: Record<string, string | string[] | undefined>;
    },
    cookieName: string
  ) {
    if (request.cookies?.[cookieName]) {
      return request.cookies[cookieName];
    }

    return parseCookieHeader(request.headers?.cookie)[cookieName];
  }
}
