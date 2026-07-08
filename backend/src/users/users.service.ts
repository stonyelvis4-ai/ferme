import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { Prisma, type UserRole, type UserStatus } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { AuthService } from '../auth/auth.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface UserFarmSummary {
  id: string;
  name: string;
  status: string;
}

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  passwordChangedAt: string | null;
  forcePasswordReset: boolean;
  assignedFarmCount: number;
  assignedFarms: UserFarmSummary[];
}

export interface UserDetailView extends UserListItem {
  loginHistory: Array<{
    id: string;
    actionType: 'CONNEXION' | 'DECONNEXION';
    source: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export interface AssignFarmsInput {
  farmIds: string[];
}

export interface CreateOwnerInput {
  fullName: string;
  email: string;
  password: string;
  farmIds?: string[];
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function normalizeIds(farmIds: string[]) {
  return [...new Set(farmIds.map((item) => item.trim()).filter(Boolean))];
}

function generateTemporaryPassword() {
  return `FERM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService
  ) {}

  async listUsers(user: SessionUser, filters: { farmId?: string; search?: string; role?: string; status?: string } = {}) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces utilisateurs refuse');
    }

    const rows = await this.prisma.user.findMany({
      where: {
        ...(filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(filters.role && filters.role !== 'ALL' ? { role: filters.role as UserRole } : {}),
        ...(filters.status && filters.status !== 'ALL' ? { status: filters.status as UserStatus } : {}),
        ...(filters.farmId ? { assignedFarms: { some: { id: filters.farmId } } } : {})
      },
      include: {
        assignedFarms: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        loginEvents: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }]
    });

    return {
      items: rows.map((row) => this.mapUserListItem(row))
    };
  }

  async getUser(user: SessionUser, userId: string): Promise<UserDetailView> {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces utilisateurs refuse');
    }

    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedFarms: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        loginEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!row) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const history = await this.auditService.listUserHistory(userId);

    return {
      ...this.mapUserListItem(row),
      loginHistory: history.items.map((entry) => ({
        ...entry,
        actionType: entry.actionType === 'DECONNEXION' ? 'DECONNEXION' : 'CONNEXION'
      }))
    };
  }

  async createOwner(user: SessionUser, input: CreateOwnerInput) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Creation de proprietaire reservee');
    }

    const owner = await this.authService.createOwnerAccount(
      input.fullName,
      input.email,
      input.password,
      input.farmIds?.[0] ?? null,
      { id: user.id, role: user.role }
    );

    if (input.farmIds && input.farmIds.length > 1) {
      await this.assignFarms(user, owner.id, { farmIds: input.farmIds });
    }

    return owner;
  }

  async setStatus(
    user: SessionUser,
    userId: string,
    input: { status: 'ACTIVE' | 'DISABLED' | 'PENDING'; reason?: string }
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Action reservee a l administrateur');
    }

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const next = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: input.status,
        isActive: input.status === 'ACTIVE',
        disabledAt: input.status === 'DISABLED' ? new Date() : null,
        disabledReason: input.status === 'DISABLED' ? (input.reason?.trim() || 'Compte desactive par l administrateur') : null
      },
      include: {
        assignedFarms: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    await this.auditService.record({
      farmId: next.assignedFarms[0]?.id ?? null,
      userId: user.id,
      userRole: user.role,
      module: 'users',
      entityType: 'User',
      entityId: next.id,
      entityLabel: next.fullName,
      actionType: 'MODIFICATION',
      oldValue: {
        status: existing.status,
        isActive: existing.isActive
      },
      newValue: {
        status: next.status,
        isActive: next.isActive,
        disabledReason: next.disabledReason
      }
    });

    return this.mapUserListItem(next);
  }

  async resetPassword(user: SessionUser, userId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Action reservee a l administrateur');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const temporaryPassword = generateTemporaryPassword();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hash(temporaryPassword, 10),
        forcePasswordReset: true,
        passwordChangedAt: new Date(),
        status: 'PENDING',
        isActive: true
      }
    });

    await this.auditService.record({
      farmId: null,
      userId: user.id,
      userRole: user.role,
      module: 'users',
      entityType: 'User',
      entityId: existing.id,
      entityLabel: existing.fullName,
      actionType: 'MODIFICATION',
      newValue: {
        forcePasswordReset: true
      }
    });

    return {
      temporaryPassword
    };
  }

  async assignFarms(user: SessionUser, userId: string, input: AssignFarmsInput) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Action reservee a l administrateur');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedFarms: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    if (!target) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const nextFarmIds = normalizeIds(input.farmIds);
    const farms = nextFarmIds.length
      ? await this.prisma.farm.findMany({
          where: {
            id: { in: nextFarmIds }
          },
          select: {
            id: true
          }
        })
      : [];

    if (nextFarmIds.length !== farms.length) {
      throw new BadRequestException('Une ou plusieurs fermes sont introuvables');
    }

    const previousFarmIds = target.assignedFarms.map((farm) => farm.id);
    const farmIdsToDetach = previousFarmIds.filter((farmId) => !nextFarmIds.includes(farmId));
    const farmIdsToAttach = nextFarmIds;

    await this.prisma.$transaction([
      ...(farmIdsToDetach.length
        ? [
            this.prisma.farm.updateMany({
              where: {
                id: { in: farmIdsToDetach },
                ownerUserId: target.id
              },
              data: { ownerUserId: null }
            })
          ]
        : []),
      ...(farmIdsToAttach.length
        ? [
            this.prisma.farm.updateMany({
              where: {
                id: { in: farmIdsToAttach }
              },
              data: { ownerUserId: target.id }
            })
          ]
        : [])
    ]);

    const next = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignedFarms: {
          select: { id: true, name: true, status: true }
        },
        loginEvents: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!next) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    await this.auditService.record({
      farmId: nextFarmIds[0] ?? null,
      userId: user.id,
      userRole: user.role,
      module: 'users',
      entityType: 'User',
      entityId: next.id,
      entityLabel: next.fullName,
      actionType: 'MODIFICATION',
      oldValue: {
        assignedFarmIds: previousFarmIds
      },
      newValue: {
        assignedFarmIds: nextFarmIds
      }
    });

    return this.mapUserListItem(next);
  }

  async getLoginHistory(user: SessionUser, userId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces historique refuse');
    }

    return this.auditService.listUserHistory(userId);
  }

  private mapUserListItem(row: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    isActive: boolean;
    lastLoginAt: Date | null;
    lastActivityAt: Date | null;
    disabledAt: Date | null;
    disabledReason: string | null;
    passwordChangedAt: Date | null;
    forcePasswordReset: boolean;
    assignedFarms: Array<{ id: string; name: string; status: string }>;
  }): UserListItem {
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      status: row.status,
      isActive: row.isActive,
      lastLoginAt: toIso(row.lastLoginAt),
      lastActivityAt: toIso(row.lastActivityAt),
      disabledAt: toIso(row.disabledAt),
      disabledReason: row.disabledReason,
      passwordChangedAt: toIso(row.passwordChangedAt),
      forcePasswordReset: row.forcePasswordReset,
      assignedFarmCount: row.assignedFarms.length,
      assignedFarms: row.assignedFarms
    };
  }
}
