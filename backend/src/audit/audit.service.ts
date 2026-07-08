import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type AuditActionType, type AuditSource, type UserRole } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface RecordAuditInput {
  farmId?: string | null;
  userId?: string | null;
  userRole?: UserRole | null;
  module: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  actionType: AuditActionType;
  source?: AuditSource;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

export interface AuditLogView {
  id: string;
  farmId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: UserRole | null;
  module: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actionType: AuditActionType;
  source: AuditSource;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
}

export interface UserHistoryView {
  id: string;
  actionType: AuditActionType;
  source: AuditSource;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapAuditRow(row: {
  id: string;
  farmId: string | null;
  userId: string | null;
  userRole: UserRole | null;
  module: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actionType: AuditActionType;
  source: AuditSource;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  user?: { fullName: string; email: string } | null;
}): AuditLogView {
  return {
    id: row.id,
    farmId: row.farmId,
    userId: row.userId,
    userName: row.user?.fullName ?? null,
    userEmail: row.user?.email ?? null,
    userRole: row.userRole,
    module: row.module,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    actionType: row.actionType,
    source: row.source,
    oldValue: row.oldValue,
    newValue: row.newValue,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString()
  };
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(
    user: SessionUser,
    filters: { farmId?: string; module?: string; actionType?: string; limit?: number } = {}
  ): Promise<{ items: AuditLogView[] }> {
    if (user.role !== 'ADMIN') {
      if (filters.farmId && !user.assignedFarmIds.includes(filters.farmId)) {
        throw new ForbiddenException('Acces audit refuse');
      }
    }

    const farmId = filters.farmId ?? null;
    const take = Math.max(10, Math.min(filters.limit ?? 80, 200));

    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(farmId ? { farmId } : {}),
        ...(filters.module ? { module: filters.module } : {}),
        ...(filters.actionType ? { actionType: filters.actionType as AuditActionType } : {}),
        ...(user.role !== 'ADMIN' && !farmId
          ? { farmId: { in: user.assignedFarmIds } }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    return {
      items: rows.map((row) => mapAuditRow(row))
    };
  }

  async listUserHistory(userId: string): Promise<{ items: UserHistoryView[] }> {
    const rows = await this.prisma.userConnectionEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        actionType: row.actionType,
        source: row.source,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  async touchActivity(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        lastActivityAt: new Date()
      }
    });
  }

  async recordLogin(input: {
    userId: string;
    userRole: UserRole;
    farmId?: string | null;
    source?: AuditSource;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: input.userId },
        data: {
          isActive: true,
          status: 'ACTIVE',
          lastLoginAt: now,
          lastActivityAt: now
        }
      }),
      this.prisma.userConnectionEvent.create({
        data: {
          userId: input.userId,
          farmId: input.farmId ?? null,
          actionType: 'CONNEXION',
          source: input.source ?? 'WEB',
          userRole: input.userRole,
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null
        }
      })
    ]);
  }

  async recordLogout(input: {
    userId: string;
    userRole: UserRole;
    farmId?: string | null;
    source?: AuditSource;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    await this.prisma.userConnectionEvent.create({
      data: {
        userId: input.userId,
        farmId: input.farmId ?? null,
        actionType: 'DECONNEXION',
        source: input.source ?? 'WEB',
        userRole: input.userRole,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null
      }
    });
  }

  async record(input: RecordAuditInput) {
    return this.prisma.auditLog.create({
      data: {
        farmId: input.farmId ?? null,
        userId: input.userId ?? null,
        userRole: input.userRole ?? null,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        actionType: input.actionType,
        source: input.source ?? 'WEB',
        ...(toJsonValue(input.oldValue) ? { oldValue: toJsonValue(input.oldValue) } : {}),
        ...(toJsonValue(input.newValue) ? { newValue: toJsonValue(input.newValue) } : {}),
        ...(toJsonValue(input.metadata) ? { metadata: toJsonValue(input.metadata) } : {})
      }
    });
  }

  async recordSync(input: {
    userId?: string | null;
    userRole?: UserRole | null;
    farmId?: string | null;
    module: string;
    entityType: string;
    entityId?: string | null;
    entityLabel?: string | null;
    source?: AuditSource;
    payload: Prisma.InputJsonValue;
    clientMutationId: string;
  }) {
    return this.prisma.offlineSyncAction.upsert({
      where: { clientMutationId: input.clientMutationId },
      create: {
        farmId: input.farmId ?? null,
        userId: input.userId ?? null,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actionType: 'SYNC',
        source: input.source ?? 'SYNCHRONISATION_HORS_LIGNE',
        clientMutationId: input.clientMutationId,
        payload: input.payload,
        status: 'APPLIED',
        appliedAt: new Date()
      },
      update: {
        status: 'APPLIED',
        appliedAt: new Date(),
        errorMessage: null,
        payload: input.payload,
        source: input.source ?? 'SYNCHRONISATION_HORS_LIGNE',
        userId: input.userId ?? null,
        farmId: input.farmId ?? null,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId ?? null
      }
    });
  }

  async listSyncActions(user: SessionUser, farmId?: string) {
    if (user.role !== 'ADMIN' && farmId && !user.assignedFarmIds.includes(farmId)) {
      throw new ForbiddenException('Acces synchronisation refuse');
    }

    const rows = await this.prisma.offlineSyncAction.findMany({
      where: {
        ...(farmId ? { farmId } : {}),
        ...(user.role !== 'ADMIN' && !farmId ? { farmId: { in: user.assignedFarmIds } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        farmId: row.farmId,
        userId: row.userId,
        module: row.module,
        entityType: row.entityType,
        entityId: row.entityId,
        actionType: row.actionType,
        source: row.source,
        clientMutationId: row.clientMutationId,
        payload: row.payload,
        status: row.status,
        errorMessage: row.errorMessage,
        appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }
}

export { mapAuditRow };
