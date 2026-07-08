import { BadRequestException, Injectable } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { ReminderService } from '../notifications/reminder.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

type StockFamily = 'CONSOMMATION' | 'PRODUCTION' | 'SUPPORT';

export interface StockItemView {
  id: string;
  category:
    | 'ALIMENTS'
    | 'MEDICAMENTS'
    | 'SEMENCES'
    | 'ENGRAIS'
    | 'EQUIPEMENTS'
    | 'MATERIELS'
    | 'VACCINS'
    | 'CARBURANT'
    | 'PRODUITS_VETERINAIRES'
    | 'PRODUITS_ELEVAGE'
    | 'PRODUITS_PISCICOLES'
    | 'PRODUITS_AGRICOLES';
  family: StockFamily;
  categoryLabel: string;
  name: string;
  unit: string;
  currentQuantity: number;
  lowStockThreshold: number;
  stockStatus: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK';
  quantityGapToThreshold: number;
  recommendedReorderQuantity: number;
  averageDailyConsumption: number;
  daysOfAutonomy: number | null;
  estimatedStockoutAt: string | null;
  lastMovementAt: string | null;
  movementCount30d: number;
}

export interface StockMovementView {
  id: string;
  movementType: 'ENTREE' | 'SORTIE' | 'INVENTAIRE' | 'AJUSTEMENT';
  quantity: number;
  note: string | null;
  movementDate: string;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  sourceEntityLabel: string | null;
  relatedLotId: string | null;
  relatedPlotId: string | null;
  relatedProductionRecordId: string | null;
  relatedSaleId: string | null;
  relatedTaskId: string | null;
  recordedByUserName: string | null;
}

const stockCategoryLabels: Record<StockItemView['category'], string> = {
  ALIMENTS: 'Aliments',
  MEDICAMENTS: 'Medicaments',
  SEMENCES: 'Semences',
  ENGRAIS: 'Engrais',
  EQUIPEMENTS: 'Equipements',
  MATERIELS: 'Materiels',
  VACCINS: 'Vaccins',
  CARBURANT: 'Carburant',
  PRODUITS_VETERINAIRES: 'Produits veterinaire',
  PRODUITS_ELEVAGE: "Produits d'elevage",
  PRODUITS_PISCICOLES: 'Produits piscicoles',
  PRODUITS_AGRICOLES: 'Produits agricoles'
};

const stockFamilyByCategory: Record<StockItemView['category'], StockFamily> = {
  ALIMENTS: 'CONSOMMATION',
  MEDICAMENTS: 'CONSOMMATION',
  SEMENCES: 'CONSOMMATION',
  ENGRAIS: 'CONSOMMATION',
  EQUIPEMENTS: 'SUPPORT',
  MATERIELS: 'SUPPORT',
  VACCINS: 'CONSOMMATION',
  CARBURANT: 'CONSOMMATION',
  PRODUITS_VETERINAIRES: 'CONSOMMATION',
  PRODUITS_ELEVAGE: 'PRODUCTION',
  PRODUITS_PISCICOLES: 'PRODUCTION',
  PRODUITS_AGRICOLES: 'PRODUCTION'
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService,
    private readonly reminderService: ReminderService
  ) {}

  async listStockItems(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [items, movements] = await Promise.all([
      this.prisma.stockItem.findMany({
        where: { farmId: farm.id },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.stockMovement.findMany({
        where: { farmId: farm.id },
        include: {
          recordedByUser: { select: { fullName: true } }
        },
        orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
        take: 120
      })
    ]);

    const movementByItem = new Map<string, typeof movements>();
    for (const movement of movements) {
      const current = movementByItem.get(movement.stockItemId) ?? [];
      current.push(movement);
      movementByItem.set(movement.stockItemId, current);
    }

    const enrichedItems = items.map((item) => this.toStockItemView(item, movementByItem.get(item.id) ?? []));
    return {
      items: enrichedItems,
      movements: movements.map((movement) => this.toMovementView(movement)),
      stats: {
        totalItems: items.length,
        lowStockCount: enrichedItems.filter((item) => item.stockStatus === 'LOW').length,
        outOfStockCount: enrichedItems.filter((item) => item.stockStatus === 'OUT_OF_STOCK').length,
        criticalItemsCount: enrichedItems.filter((item) => item.stockStatus !== 'AVAILABLE').length,
        averageAutonomyDays:
          (() => {
            const autonomyValues = enrichedItems
              .map((item) => item.daysOfAutonomy)
              .filter((value): value is number => value !== null && Number.isFinite(value));
            return autonomyValues.length > 0
              ? autonomyValues.reduce((sum, value) => sum + value, 0) / autonomyValues.length
              : 0;
          })(),
        recentMovementsCount: movements.filter((movement) => movement.movementDate >= thirtyDaysAgo).length,
        outgoingQuantity30d: movements
          .filter((movement) => movement.movementDate >= thirtyDaysAgo && movement.movementType === 'SORTIE')
          .reduce((sum, movement) => sum + movement.quantity, 0),
        incomingQuantity30d: movements
          .filter((movement) => movement.movementDate >= thirtyDaysAgo && movement.movementType === 'ENTREE')
          .reduce((sum, movement) => sum + movement.quantity, 0)
      }
    };
  }

  async createStockItem(
    user: SessionUser,
    farmId: string,
    input: {
      category: StockItemView['category'];
      name: string;
      unit: string;
      currentQuantity: number;
      lowStockThreshold: number;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);

    const created = await this.prisma.stockItem.create({
      data: {
        farmId: farm.id,
        category: input.category,
        name: input.name,
        unit: input.unit,
        currentQuantity: input.currentQuantity,
        lowStockThreshold: input.lowStockThreshold
      }
    });

    await this.syncStockSignals(farm.id, created);

    return created;
  }

  async createMovement(
    user: SessionUser,
    farmId: string,
    input: {
      stockItemId: string;
      movementType: 'ENTREE' | 'SORTIE' | 'INVENTAIRE' | 'AJUSTEMENT';
      quantity: number;
      note?: string;
      sourceModule?: string;
      sourceEntityType?: string;
      sourceEntityId?: string;
      sourceEntityLabel?: string;
      relatedLotId?: string;
      relatedPlotId?: string;
      relatedProductionRecordId?: string;
      relatedSaleId?: string;
      relatedTaskId?: string;
      movementDate?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const item = await this.prisma.stockItem.findFirstOrThrow({
      where: {
        id: input.stockItemId,
        farmId: farm.id
      }
    });

    if (input.quantity <= 0) {
      throw new BadRequestException('La quantite doit etre strictement positive');
    }

    const movementDate = input.movementDate ? new Date(input.movementDate) : new Date();
    if (Number.isNaN(movementDate.getTime())) {
      throw new BadRequestException('Date de mouvement invalide');
    }

    const nextQuantity =
      input.movementType === 'SORTIE' ? item.currentQuantity - input.quantity : item.currentQuantity + input.quantity;

    if (input.movementType === 'SORTIE' && nextQuantity < 0) {
      throw new BadRequestException('Stock insuffisant pour effectuer cette sortie');
    }

    const [movement, updatedItem] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          farmId: farm.id,
          stockItemId: item.id,
          movementType: input.movementType,
          quantity: input.quantity,
          movementDate,
          note: input.note?.trim() || null,
          sourceModule: input.sourceModule?.trim() || null,
          sourceEntityType: input.sourceEntityType?.trim() || null,
          sourceEntityId: input.sourceEntityId?.trim() || null,
          sourceEntityLabel: input.sourceEntityLabel?.trim() || null,
          relatedLotId: input.relatedLotId?.trim() || null,
          relatedPlotId: input.relatedPlotId?.trim() || null,
          relatedProductionRecordId: input.relatedProductionRecordId?.trim() || null,
          relatedSaleId: input.relatedSaleId?.trim() || null,
          relatedTaskId: input.relatedTaskId?.trim() || null,
          recordedByUserId: user.id
        }
      }),
      this.prisma.stockItem.update({
        where: { id: item.id },
        data: {
          currentQuantity: nextQuantity
        }
      })
    ]);

    await this.syncStockSignals(farm.id, updatedItem);

    const recordedByUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true }
    });

    return this.toMovementView({
      ...movement,
      recordedByUser: recordedByUser ?? null
    });
  }

  private toStockItemView(item: {
    id: string;
    category: StockItemView['category'];
    name: string;
    unit: string;
    currentQuantity: number;
    lowStockThreshold: number;
  }, movements: Array<{
    movementType: 'ENTREE' | 'SORTIE' | 'INVENTAIRE' | 'AJUSTEMENT';
    quantity: number;
    movementDate: Date;
  }> = []): StockItemView {
    const stockStatus =
      item.currentQuantity <= 0
        ? 'OUT_OF_STOCK'
        : item.currentQuantity <= item.lowStockThreshold
          ? 'LOW'
          : 'AVAILABLE';

    const quantityGapToThreshold = Math.max(0, item.lowStockThreshold - item.currentQuantity);
    const recommendedReorderQuantity =
      stockStatus === 'OUT_OF_STOCK'
        ? Math.max(item.lowStockThreshold * 2, 1)
        : stockStatus === 'LOW'
          ? Math.max(quantityGapToThreshold, 1)
          : 0;

    const thirtyDayMovements = movements.filter((movement) => {
      const deltaDays = (Date.now() - movement.movementDate.getTime()) / (1000 * 60 * 60 * 24);
      return deltaDays <= 30;
    });
    const outgoingQuantity = thirtyDayMovements
      .filter((movement) => movement.movementType === 'SORTIE')
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const averageDailyConsumption = outgoingQuantity / 30;
    const daysOfAutonomy = averageDailyConsumption > 0 ? item.currentQuantity / averageDailyConsumption : null;
    const estimatedStockoutAt =
      daysOfAutonomy !== null && Number.isFinite(daysOfAutonomy)
        ? new Date(Date.now() + daysOfAutonomy * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const lastMovementAt =
      movements.length > 0 ? movements[0].movementDate.toISOString() : null;

    return {
      id: item.id,
      category: item.category,
      family: stockFamilyByCategory[item.category],
      categoryLabel: stockCategoryLabels[item.category],
      name: item.name,
      unit: item.unit,
      currentQuantity: item.currentQuantity,
      lowStockThreshold: item.lowStockThreshold,
      stockStatus,
      quantityGapToThreshold,
      recommendedReorderQuantity,
      averageDailyConsumption,
      daysOfAutonomy: daysOfAutonomy !== null && Number.isFinite(daysOfAutonomy) ? daysOfAutonomy : null,
      estimatedStockoutAt,
      lastMovementAt,
      movementCount30d: thirtyDayMovements.length
    };
  }

  private toMovementView(
    movement: {
      id: string;
      movementType: 'ENTREE' | 'SORTIE' | 'INVENTAIRE' | 'AJUSTEMENT';
      quantity: number;
      note: string | null;
      movementDate: Date;
      sourceModule: string | null;
      sourceEntityType: string | null;
      sourceEntityId: string | null;
      sourceEntityLabel: string | null;
      relatedLotId: string | null;
      relatedPlotId: string | null;
      relatedProductionRecordId: string | null;
      relatedSaleId: string | null;
      relatedTaskId: string | null;
      recordedByUser?: { fullName: string } | null;
    }
  ): StockMovementView {
    return {
      id: movement.id,
      movementType: movement.movementType,
      quantity: movement.quantity,
      note: movement.note,
      movementDate: movement.movementDate.toISOString(),
      sourceModule: movement.sourceModule,
      sourceEntityType: movement.sourceEntityType,
      sourceEntityId: movement.sourceEntityId,
      sourceEntityLabel: movement.sourceEntityLabel,
      relatedLotId: movement.relatedLotId,
      relatedPlotId: movement.relatedPlotId,
      relatedProductionRecordId: movement.relatedProductionRecordId,
      relatedSaleId: movement.relatedSaleId,
      relatedTaskId: movement.relatedTaskId,
      recordedByUserName: movement.recordedByUser?.fullName ?? null
    };
  }

  private async syncStockSignals(
    farmId: string,
    item: {
      id: string;
      category: StockItemView['category'];
      name: string;
      unit: string;
      currentQuantity: number;
      lowStockThreshold: number;
    }
  ) {
    const itemView = this.toStockItemView({
      id: item.id,
      category: item.category,
      name: item.name,
      unit: item.unit,
      currentQuantity: item.currentQuantity,
      lowStockThreshold: item.lowStockThreshold
    });

    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        farmId,
        sourceModule: 'STOCKS',
        sourceRecordId: item.id,
        status: {
          in: ['NEW', 'PENDING', 'ACKNOWLEDGED']
        }
      }
    });
    const existingTask = await this.prisma.agendaTask.findFirst({
      where: {
        farmId,
        sourceModule: 'STOCK_REPLENISHMENT',
        sourceRecordId: item.id
      }
    });

    if (itemView.stockStatus === 'AVAILABLE') {
      if (existingAlert) {
        await this.prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            readAt: existingAlert.readAt ?? new Date()
          }
        });
      }

      if (existingTask) {
        await this.prisma.agendaTask.update({
          where: { id: existingTask.id },
          data: {
            status: 'TERMINEE',
            scheduledLabel: 'Reapprovisionne'
          }
        });
        await this.reminderService.syncTaskReminders({
          ...existingTask,
          status: 'TERMINEE'
        });
      }

      return;
    }

    const severity = itemView.stockStatus === 'OUT_OF_STOCK' ? 'CRITICAL' : 'WARNING';
    const priority = itemView.stockStatus === 'OUT_OF_STOCK' ? 'URGENT' : 'HIGH';
    const title =
      itemView.stockStatus === 'OUT_OF_STOCK'
        ? `Rupture de stock: ${item.name}`
        : `Stock faible: ${item.name}`;
    const message =
      itemView.stockStatus === 'OUT_OF_STOCK'
        ? `Le stock de ${item.name} est a 0 ${item.unit}. Reapprovisionnement immediat recommande.`
        : `Le stock de ${item.name} est bas (${item.currentQuantity} ${item.unit}). Ajouter environ ${itemView.recommendedReorderQuantity} ${item.unit}.`;

    if (existingAlert) {
      await this.prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          type: 'OPERATIONAL',
          priority,
          status: existingAlert.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'PENDING',
          title,
          severity,
          message,
          dueAt: new Date()
        }
      });
    } else {
      await this.prisma.alert.create({
        data: {
          farmId,
          type: 'OPERATIONAL',
          priority,
          status: 'NEW',
          title,
          severity,
          message,
          sourceModule: 'STOCKS',
          sourceRecordId: item.id,
          dueAt: new Date()
        }
      });
    }

    const taskPayload = {
      title: `Reapprovisionner ${item.name}`,
      description: `Objectif recommande: ajouter ${itemView.recommendedReorderQuantity} ${item.unit} pour sortir de la zone ${itemView.stockStatus === 'OUT_OF_STOCK' ? 'de rupture' : 'de seuil faible'}.`,
      priority: itemView.stockStatus === 'OUT_OF_STOCK' ? 'HIGH' : 'MEDIUM',
      status: itemView.stockStatus === 'OUT_OF_STOCK' ? 'EN_RETARD' : 'A_FAIRE',
      scheduledFor: new Date(),
      scheduledLabel: itemView.stockStatus === 'OUT_OF_STOCK' ? 'Immediate' : "Aujourd'hui",
      sourceModule: 'STOCK_REPLENISHMENT',
      sourceRecordId: item.id
    } as const;

    const task = existingTask
      ? await this.prisma.agendaTask.update({
          where: { id: existingTask.id },
          data: taskPayload
        })
      : await this.prisma.agendaTask.create({
          data: {
            farmId,
            ...taskPayload
          }
        });

    await this.reminderService.syncTaskReminders(task);
  }
}
