import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface FarmBusinessSettingsView {
  farmId: string;
  currency: string;
  stockRules: Record<string, unknown>;
  livestockRules: Record<string, unknown>;
  fishRules: Record<string, unknown>;
  cropRules: Record<string, unknown>;
  reminderDefaults: number[];
  units: string[];
  defaultPrices: Record<string, number>;
  taskCatalog: {
    categories: string[];
    priorities: string[];
  };
  alertRules: Record<string, unknown>;
  updatedAt: string;
}

export interface UpdateFarmBusinessSettingsInput {
  currency?: string;
  stockRules?: Record<string, unknown>;
  livestockRules?: Record<string, unknown>;
  fishRules?: Record<string, unknown>;
  cropRules?: Record<string, unknown>;
  reminderDefaults?: number[];
  units?: string[];
  defaultPrices?: Record<string, number>;
  taskCatalog?: {
    categories?: string[];
    priorities?: string[];
  };
  alertRules?: Record<string, unknown>;
}

const DEFAULT_SETTINGS: FarmBusinessSettingsView = {
  farmId: '',
  currency: 'FCFA',
  stockRules: {
    lowStockThreshold: 25,
    ruptureThreshold: 5
  },
  livestockRules: {
    mortalityThresholdPercent: 3,
    layingRateThresholdPercent: 80,
    eggsBrokenThresholdPercent: 4
  },
  fishRules: {
    mortalityThresholdPercent: 2,
    waterQuality: {
      phMin: 6.5,
      phMax: 8.5,
      oxygenMin: 5,
      temperatureMin: 24,
      temperatureMax: 32
    }
  },
  cropRules: {
    rendementThresholdPercent: 70
  },
  reminderDefaults: [24, 6, 1],
  units: ['kg', 'litre', 'plateau', 'sac', 'tonne'],
  defaultPrices: {
    eggTray: 0,
    fishKg: 0,
    harvestKg: 0
  },
  taskCatalog: {
    categories: [
      'ALIMENTATION',
      'SANITAIRE',
      'PRODUCTION',
      'RECOLTE',
      'VENTE',
      'STOCK',
      'FINANCE',
      'MAINTENANCE',
      'CULTURE',
      'REPRODUCTION',
      'NETTOYAGE',
      'CONTROLE',
      'ADMINISTRATIF'
    ],
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  alertRules: {
    lowStock: true,
    mortality: true,
    layingRate: true,
    waterQuality: true,
    cropYield: true
  },
  updatedAt: new Date(0).toISOString()
};

function parseJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toNumberArray(value: Prisma.JsonValue | null | undefined, fallback: number[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const parsed = value
    .map((item) => (typeof item === 'number' ? item : Number(item)))
    .filter((item) => Number.isFinite(item));

  return parsed.length ? parsed : fallback;
}

function toStringArray(value: Prisma.JsonValue | null | undefined, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const parsed = value.map((item) => String(item)).filter(Boolean);
  return parsed.length ? parsed : fallback;
}

function toBusinessSettingsView(row: {
  farmId: string;
  currency: string;
  stockRules: Prisma.JsonValue | null;
  livestockRules: Prisma.JsonValue | null;
  fishRules: Prisma.JsonValue | null;
  cropRules: Prisma.JsonValue | null;
  reminderDefaults: Prisma.JsonValue | null;
  units: Prisma.JsonValue | null;
  defaultPrices: Prisma.JsonValue | null;
  taskCatalog: Prisma.JsonValue | null;
  alertRules: Prisma.JsonValue | null;
  updatedAt: Date;
}): FarmBusinessSettingsView {
  return {
    farmId: row.farmId,
    currency: row.currency,
    stockRules: parseJsonObject(row.stockRules) ?? DEFAULT_SETTINGS.stockRules,
    livestockRules: parseJsonObject(row.livestockRules) ?? DEFAULT_SETTINGS.livestockRules,
    fishRules: parseJsonObject(row.fishRules) ?? DEFAULT_SETTINGS.fishRules,
    cropRules: parseJsonObject(row.cropRules) ?? DEFAULT_SETTINGS.cropRules,
    reminderDefaults: toNumberArray(row.reminderDefaults, DEFAULT_SETTINGS.reminderDefaults),
    units: toStringArray(row.units, DEFAULT_SETTINGS.units),
    defaultPrices: (parseJsonObject(row.defaultPrices) as Record<string, number> | null) ?? DEFAULT_SETTINGS.defaultPrices,
    taskCatalog: {
      categories:
        (parseJsonObject(row.taskCatalog)?.categories as string[] | undefined)?.filter(Boolean) ??
        DEFAULT_SETTINGS.taskCatalog.categories,
      priorities:
        (parseJsonObject(row.taskCatalog)?.priorities as string[] | undefined)?.filter(Boolean) ??
        DEFAULT_SETTINGS.taskCatalog.priorities
    },
    alertRules: parseJsonObject(row.alertRules) ?? DEFAULT_SETTINGS.alertRules,
    updatedAt: row.updatedAt.toISOString()
  };
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService
  ) {}

  async getFarmBusinessSettings(user: SessionUser, farmId: string) {
    await this.ensureFarmAccess(user, farmId);

    const settings =
      (await this.prisma.farmBusinessSettings.findUnique({
        where: { farmId }
      })) ??
      (await this.prisma.farmBusinessSettings.create({
        data: {
          farmId,
          currency: DEFAULT_SETTINGS.currency,
          ...(toJsonInput(DEFAULT_SETTINGS.stockRules) ? { stockRules: toJsonInput(DEFAULT_SETTINGS.stockRules) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.livestockRules) ? { livestockRules: toJsonInput(DEFAULT_SETTINGS.livestockRules) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.fishRules) ? { fishRules: toJsonInput(DEFAULT_SETTINGS.fishRules) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.cropRules) ? { cropRules: toJsonInput(DEFAULT_SETTINGS.cropRules) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.reminderDefaults) ? { reminderDefaults: toJsonInput(DEFAULT_SETTINGS.reminderDefaults) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.units) ? { units: toJsonInput(DEFAULT_SETTINGS.units) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.defaultPrices) ? { defaultPrices: toJsonInput(DEFAULT_SETTINGS.defaultPrices) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.taskCatalog) ? { taskCatalog: toJsonInput(DEFAULT_SETTINGS.taskCatalog) } : {}),
          ...(toJsonInput(DEFAULT_SETTINGS.alertRules) ? { alertRules: toJsonInput(DEFAULT_SETTINGS.alertRules) } : {}),
          updatedByUserId: user.id
        }
      }));

    return toBusinessSettingsView(settings);
  }

  async updateFarmBusinessSettings(
    user: SessionUser,
    farmId: string,
    input: UpdateFarmBusinessSettingsInput
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Les parametres metiers sont reserves a l administrateur');
    }

    await this.ensureFarmAccess(user, farmId);

    const existing = await this.getOrCreateSettings(farmId, user.id);
    const nextTaskCatalog = input.taskCatalog
      ? {
          categories: input.taskCatalog.categories ?? DEFAULT_SETTINGS.taskCatalog.categories,
          priorities: input.taskCatalog.priorities ?? DEFAULT_SETTINGS.taskCatalog.priorities
        }
      : parseJsonObject(existing.taskCatalog) ?? DEFAULT_SETTINGS.taskCatalog;

    const updated = await this.prisma.farmBusinessSettings.update({
      where: { farmId },
      data: {
        currency: input.currency?.trim() || existing.currency,
        ...(toJsonInput(input.stockRules ?? existing.stockRules) ? { stockRules: toJsonInput(input.stockRules ?? existing.stockRules) } : {}),
        ...(toJsonInput(input.livestockRules ?? existing.livestockRules) ? { livestockRules: toJsonInput(input.livestockRules ?? existing.livestockRules) } : {}),
        ...(toJsonInput(input.fishRules ?? existing.fishRules) ? { fishRules: toJsonInput(input.fishRules ?? existing.fishRules) } : {}),
        ...(toJsonInput(input.cropRules ?? existing.cropRules) ? { cropRules: toJsonInput(input.cropRules ?? existing.cropRules) } : {}),
        ...(toJsonInput(input.reminderDefaults ?? existing.reminderDefaults) ? { reminderDefaults: toJsonInput(input.reminderDefaults ?? existing.reminderDefaults) } : {}),
        ...(toJsonInput(input.units ?? existing.units) ? { units: toJsonInput(input.units ?? existing.units) } : {}),
        ...(toJsonInput(input.defaultPrices ?? existing.defaultPrices) ? { defaultPrices: toJsonInput(input.defaultPrices ?? existing.defaultPrices) } : {}),
        ...(toJsonInput(nextTaskCatalog) ? { taskCatalog: toJsonInput(nextTaskCatalog) } : {}),
        ...(toJsonInput(input.alertRules ?? existing.alertRules) ? { alertRules: toJsonInput(input.alertRules ?? existing.alertRules) } : {}),
        updatedByUserId: user.id
      }
    });

    await this.auditService.record({
      farmId,
      userId: user.id,
      userRole: user.role,
      module: 'settings',
      entityType: 'FarmBusinessSettings',
      entityId: updated.id,
      entityLabel: farmId,
      actionType: 'MODIFICATION',
      ...(toJsonInput(existing) ? { oldValue: toJsonInput(existing) } : {}),
      ...(toJsonInput(toBusinessSettingsView(updated)) ? { newValue: toJsonInput(toBusinessSettingsView(updated)) } : {})
    });

    return toBusinessSettingsView(updated);
  }

  async getSettingsSummary(user: SessionUser, farmId: string) {
    const settings = await this.getFarmBusinessSettings(user, farmId);
    return {
      settings,
      source: 'farm-settings'
    };
  }

  private async ensureFarmAccess(user: SessionUser, farmId: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        id: true,
        deletedAt: true
      }
    });

    if (!farm || farm.deletedAt) {
      throw new NotFoundException('Ferme introuvable');
    }

    if (user.role !== 'ADMIN' && !user.assignedFarmIds.includes(farmId)) {
      throw new ForbiddenException('Ferme inaccessible');
    }
  }

  private async getOrCreateSettings(farmId: string, userId: string) {
    const existing = await this.prisma.farmBusinessSettings.findUnique({ where: { farmId } });

    if (existing) {
      return existing;
    }

    return this.prisma.farmBusinessSettings.create({
      data: {
        farmId,
        currency: DEFAULT_SETTINGS.currency,
        ...(toJsonInput(DEFAULT_SETTINGS.stockRules) ? { stockRules: toJsonInput(DEFAULT_SETTINGS.stockRules) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.livestockRules) ? { livestockRules: toJsonInput(DEFAULT_SETTINGS.livestockRules) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.fishRules) ? { fishRules: toJsonInput(DEFAULT_SETTINGS.fishRules) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.cropRules) ? { cropRules: toJsonInput(DEFAULT_SETTINGS.cropRules) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.reminderDefaults) ? { reminderDefaults: toJsonInput(DEFAULT_SETTINGS.reminderDefaults) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.units) ? { units: toJsonInput(DEFAULT_SETTINGS.units) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.defaultPrices) ? { defaultPrices: toJsonInput(DEFAULT_SETTINGS.defaultPrices) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.taskCatalog) ? { taskCatalog: toJsonInput(DEFAULT_SETTINGS.taskCatalog) } : {}),
        ...(toJsonInput(DEFAULT_SETTINGS.alertRules) ? { alertRules: toJsonInput(DEFAULT_SETTINGS.alertRules) } : {}),
        updatedByUserId: userId
      }
    });
  }
}

export { DEFAULT_SETTINGS };
