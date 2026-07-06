import { BadRequestException, Injectable } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { ReminderService } from '../notifications/reminder.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface StockItemView {
  id: string;
  category: 'ALIMENTS' | 'MEDICAMENTS' | 'SEMENCES' | 'ENGRAIS' | 'EQUIPEMENTS' | 'MATERIELS';
  name: string;
  unit: string;
  currentQuantity: number;
  lowStockThreshold: number;
  stockStatus: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK';
  quantityGapToThreshold: number;
  recommendedReorderQuantity: number;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService,
    private readonly reminderService: ReminderService
  ) {}

  async listStockItems(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const items = await this.prisma.stockItem.findMany({
      where: { farmId: farm.id },
      orderBy: { createdAt: 'desc' }
    });

    return {
      items: items.map((item) => ({
        ...this.toStockItemView(item)
      })),
      stats: {
        totalItems: items.length,
        lowStockCount: items.filter((item) => item.currentQuantity > 0 && item.currentQuantity <= item.lowStockThreshold)
          .length,
        outOfStockCount: items.filter((item) => item.currentQuantity <= 0).length
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
          note: input.note
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

    return movement;
  }

  private toStockItemView(item: {
    id: string;
    category: StockItemView['category'];
    name: string;
    unit: string;
    currentQuantity: number;
    lowStockThreshold: number;
  }): StockItemView {
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

    return {
      id: item.id,
      category: item.category,
      name: item.name,
      unit: item.unit,
      currentQuantity: item.currentQuantity,
      lowStockThreshold: item.lowStockThreshold,
      stockStatus,
      quantityGapToThreshold,
      recommendedReorderQuantity
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
