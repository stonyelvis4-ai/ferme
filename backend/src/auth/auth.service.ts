import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../shared/database/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import type { PrismaClient } from '@prisma/client';
import { getSecurityEnvConfig } from '../shared/config/security-env.js';

export type UserRole = 'ADMIN' | 'PROPRIETAIRE';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedFarmIds: string[];
}

export interface SessionResponse {
  token: string;
  user: SessionUser;
}

export interface AuthCookieBundle {
  accessToken: string;
  refreshToken: string;
}

export interface AuthRequestMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

const securityEnv = getSecurityEnvConfig();

@Injectable()
export class AuthService {
  private readonly accessTokenSecret = securityEnv.jwtSecret;
  private readonly refreshTokenSecret = securityEnv.jwtRefreshSecret;
  private readonly accessTokenTtl = securityEnv.jwtExpiresIn;
  private readonly refreshTokenTtlMs = 1000 * 60 * 60 * 24 * 7;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  private get prismaClient() {
    return this.prisma as PrismaClient;
  }

  async login(
    email: string,
    password: string,
    meta?: AuthRequestMeta
  ): Promise<SessionResponse & AuthCookieBundle> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { assignedFarms: true }
    });

    if (!user || !(await this.validatePassword(user.id, user.passwordHash, password))) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const sessionUser = this.toSessionUser(user);
    const tokens = await this.createSessionTokens(sessionUser, meta);

    return {
      token: tokens.accessToken,
      user: sessionUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async registerAdmin(
    fullName: string,
    email: string,
    password: string,
    meta?: AuthRequestMeta
  ): Promise<SessionResponse & AuthCookieBundle> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();

    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        isActive: true
      }
    });

    if (existingAdmin) {
      throw new ConflictException('La creation d un administrateur est deja fermee. Utilisez un compte existant.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw new ConflictException('Un compte existe deja avec cet email');
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        passwordHash: await this.hashPassword(password),
        role: 'ADMIN',
        isActive: true
      },
      include: { assignedFarms: true }
    });

    const sessionUser = this.toSessionUser(user);
    const tokens = await this.createSessionTokens(sessionUser, meta);

    return {
      token: tokens.accessToken,
      user: sessionUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async createOwnerAccount(
    fullName: string,
    email: string,
    password: string,
    farmId?: string | null
  ): Promise<SessionUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw new ConflictException('Un compte existe deja avec cet email');
    }

    if (farmId) {
      const farm = await this.prisma.farm.findUnique({
        where: { id: farmId }
      });

      if (!farm || farm.deletedAt) {
        throw new NotFoundException('Ferme introuvable');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        passwordHash: await this.hashPassword(password),
        role: 'PROPRIETAIRE',
        isActive: true
      },
      include: { assignedFarms: true }
    });

    if (farmId) {
      await this.assignFarmToOwner(user.id, farmId);
    }

    const nextUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { assignedFarms: true }
    });

    if (!nextUser) {
      throw new NotFoundException('Compte proprietaire introuvable');
    }

    return this.toSessionUser(nextUser);
  }

  async getBootstrapStatus() {
    const adminCount = await this.prisma.user.count({
      where: {
        role: 'ADMIN',
        isActive: true
      }
    });

    return {
      canRegisterAdmin: adminCount === 0,
      adminCount
    };
  }

  getCurrentUserFromTokenPayload(payload: SessionUser): SessionUser {
    return payload;
  }

  readUserFromAuthorization(authorization?: string): SessionUser {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Session absente');
    }

    const token = authorization.slice('Bearer '.length);
    return this.jwtService.verify<SessionUser>(token, {
      secret: this.accessTokenSecret
    });
  }

  async refreshSession(
    refreshToken: string,
    meta?: AuthRequestMeta
  ): Promise<SessionResponse & AuthCookieBundle> {
    const payload = this.jwtService.verify<{ sub: string; sid: string; type: 'refresh' }>(refreshToken, {
      secret: this.refreshTokenSecret
    });

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const refreshSession = await this.prismaClient.refreshSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          include: {
            assignedFarms: true
          }
        }
      }
    });

    if (!refreshSession) {
      throw new UnauthorizedException('Session de rafraichissement invalide');
    }

    const validRefreshToken = await compare(refreshToken, refreshSession.tokenHash);
    if (!validRefreshToken) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    await this.prismaClient.refreshSession.update({
      where: { id: refreshSession.id },
      data: {
        revokedAt: new Date()
      }
    });

    const sessionUser = this.toSessionUser(refreshSession.user);
    const nextTokens = await this.createSessionTokens(sessionUser, meta);

    return {
      token: nextTokens.accessToken,
      user: sessionUser,
      accessToken: nextTokens.accessToken,
      refreshToken: nextTokens.refreshToken
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; sid: string; type: 'refresh' }>(refreshToken, {
        secret: this.refreshTokenSecret
      });

      await this.prismaClient.refreshSession.updateMany({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    } catch {
      return;
    }
  }

  async assignFarmToOwner(ownerId: string, farmId: string) {
    const owner = await this.prisma.user.findFirst({
      where: {
        id: ownerId,
        role: 'PROPRIETAIRE'
      }
    });

    if (!owner) {
      return;
    }

    await this.prisma.farm.update({
      where: { id: farmId },
      data: { ownerUserId: owner.id }
    });
  }

  async getAutomationUserId() {
    const admin = await this.prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return admin?.id ?? null;
  }

  async getVisibleFarmIds(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { assignedFarms: true }
    });
    return user?.assignedFarms.map((farm) => farm.id) ?? [];
  }

  async hydrateSessionUser(payload: SessionUser): Promise<SessionUser> {
    const assignedFarmIds = await this.getVisibleFarmIds(payload.id);
    return {
      ...payload,
      assignedFarmIds
    };
  }

  getCookieOptions() {
    const secure = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/'
    };
  }

  readUserFromRequest(authorization?: string, accessToken?: string): SessionUser {
    if (authorization?.startsWith('Bearer ')) {
      return this.readUserFromAuthorization(authorization);
    }

    if (!accessToken) {
      throw new UnauthorizedException('Session absente');
    }

    return this.jwtService.verify<SessionUser>(accessToken, {
      secret: this.accessTokenSecret
    });
  }

  private async createSessionTokens(
    sessionUser: SessionUser,
    meta?: AuthRequestMeta
  ) {
    const refreshSession = await this.prismaClient.refreshSession.create({
      data: {
        userId: sessionUser.id,
        tokenHash: 'pending',
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
        userAgent: meta?.userAgent ?? null,
        ipAddress: meta?.ipAddress ?? null
      }
    });

    const accessToken = this.jwtService.sign(sessionUser, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenTtl as never
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: sessionUser.id,
        sid: refreshSession.id,
        type: 'refresh'
      },
      {
        secret: this.refreshTokenSecret,
        expiresIn: Math.floor(this.refreshTokenTtlMs / 1000)
      }
    );

    await this.prismaClient.refreshSession.update({
      where: { id: refreshSession.id },
      data: {
        tokenHash: await this.hashPassword(refreshToken)
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    assignedFarms: Array<{ id: string }>;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedFarmIds: user.assignedFarms.map((farm) => farm.id)
    };
  }

  private async validatePassword(userId: string, passwordHash: string, password: string) {
    if (passwordHash.startsWith('$2')) {
      return compare(password, passwordHash);
    }

    const isLegacyMatch = passwordHash === password;
    if (isLegacyMatch) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await this.hashPassword(password)
        }
      });
    }

    return isLegacyMatch;
  }

  private hashPassword(password: string) {
    return hash(password, 10);
  }
}
