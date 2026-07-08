import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type AuditActionType, type AuditSource } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface SyncActionInput {
  clientMutationId: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  actionType: AuditActionType;
  payload: Record<string, unknown>;
  source?: AuditSource;
}

export interface SyncBatchInput {
  farmId?: string;
  actions: SyncActionInput[];
}

function countBy<T extends { status: string }>(items: T[], status: string) {
  return items.filter((item) => item.status === status).length;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService
  ) {}

  async getSyncSummary(user: SessionUser, farmId?: string) {
    await this.ensureAccess(user, farmId);

    const items = await this.prisma.offlineSyncAction.findMany({
      where: {
        ...(farmId ? { farmId } : {}),
        ...(user.role !== 'ADMIN' && !farmId ? { farmId: { in: user.assignedFarmIds } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        farmId: item.farmId,
        userId: item.userId,
        module: item.module,
        entityType: item.entityType,
        entityId: item.entityId,
        actionType: item.actionType,
        source: item.source,
        clientMutationId: item.clientMutationId,
        payload: item.payload,
        status: item.status,
        errorMessage: item.errorMessage,
        appliedAt: item.appliedAt ? item.appliedAt.toISOString() : null,
        createdAt: item.createdAt.toISOString()
      })),
      summary: {
        pending: countBy(items, 'PENDING'),
        applied: countBy(items, 'APPLIED'),
        failed: countBy(items, 'FAILED')
      },
      offline: false
    };
  }

  async syncBatch(user: SessionUser, input: SyncBatchInput) {
    await this.ensureAccess(user, input.farmId);

    if (!input.actions.length) {
      return {
        applied: 0,
        failed: 0,
        items: []
      };
    }

    const results: Array<{
      clientMutationId: string;
      status: 'APPLIED' | 'FAILED';
      errorMessage: string | null;
    }> = [];

    for (const action of input.actions) {
      try {
        if (!action.clientMutationId) {
          throw new NotFoundException('Mutation locale invalide');
        }

        const farmId = input.farmId ?? null;
        await this.auditService.record({
          farmId,
          userId: user.id,
          userRole: user.role,
          module: action.module,
          entityType: action.entityType,
          entityId: action.entityId ?? null,
          entityLabel: action.entityLabel ?? null,
          actionType: action.actionType,
          source: action.source ?? 'SYNCHRONISATION_HORS_LIGNE',
          ...(toJsonInput(action.payload) ? { newValue: toJsonInput(action.payload) } : {}),
          metadata: {
            clientMutationId: action.clientMutationId,
            source: action.source ?? 'SYNCHRONISATION_HORS_LIGNE'
          }
        });

        await this.auditService.recordSync({
          userId: user.id,
          userRole: user.role,
          farmId,
          module: action.module,
          entityType: action.entityType,
          entityId: action.entityId ?? null,
          entityLabel: action.entityLabel ?? null,
          source: action.source ?? 'SYNCHRONISATION_HORS_LIGNE',
          payload: {
            ...action.payload,
            actionType: action.actionType,
            source: action.source ?? 'SYNCHRONISATION_HORS_LIGNE'
          },
          clientMutationId: action.clientMutationId
        });

        results.push({
          clientMutationId: action.clientMutationId,
          status: 'APPLIED',
          errorMessage: null
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Synchronisation impossible';
        await this.prisma.offlineSyncAction.upsert({
          where: { clientMutationId: action.clientMutationId },
          create: {
            farmId: input.farmId ?? null,
            userId: user.id,
            module: action.module,
            entityType: action.entityType,
            entityId: action.entityId ?? null,
            actionType: 'SYNC',
            source: action.source ?? 'SYNCHRONISATION_HORS_LIGNE',
            clientMutationId: action.clientMutationId,
            payload: toJsonInput(action.payload) ?? Prisma.JsonNull,
            status: 'FAILED',
            errorMessage
          },
          update: {
            status: 'FAILED',
            errorMessage,
            payload: toJsonInput(action.payload) ?? Prisma.JsonNull,
            userId: user.id,
            farmId: input.farmId ?? null
          }
        });

        results.push({
          clientMutationId: action.clientMutationId,
          status: 'FAILED',
          errorMessage
        });
      }
    }

    return {
      applied: results.filter((item) => item.status === 'APPLIED').length,
      failed: results.filter((item) => item.status === 'FAILED').length,
      items: results
    };
  }

  private async ensureAccess(user: SessionUser, farmId?: string) {
    if (!farmId) {
      return;
    }

    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { id: true, deletedAt: true }
    });

    if (!farm || farm.deletedAt) {
      throw new NotFoundException('Ferme introuvable');
    }

    if (user.role !== 'ADMIN' && !user.assignedFarmIds.includes(farmId)) {
      throw new ForbiddenException('Acces synchronisation refuse');
    }
  }
}
