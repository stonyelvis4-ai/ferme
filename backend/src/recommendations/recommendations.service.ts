import { Injectable } from '@nestjs/common';
import { generateFarmRecommendations, type RecommendationRuleResult } from '@ferm-plus/domain-rules';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export type FarmRecommendationView = RecommendationRuleResult;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async getFarmRecommendations(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);

    const [animalGroups, stockItems, sanitaryEvents, transactions, agendaTasks, alerts] = await Promise.all([
      this.prisma.animalGroup.findMany({
        where: { farmId: farm.id },
        select: { status: true }
      }),
      this.prisma.stockItem.findMany({
        where: { farmId: farm.id },
        select: { currentQuantity: true, lowStockThreshold: true }
      }),
      this.prisma.sanitaryEvent.findMany({
        where: { farmId: farm.id },
        select: { status: true }
      }),
      this.prisma.financialTransaction.findMany({
        where: { farmId: farm.id },
        select: { transactionType: true, amount: true, transactionDate: true }
      }),
      this.prisma.agendaTask.findMany({
        where: { farmId: farm.id },
        select: { status: true }
      }),
      this.prisma.alert.findMany({
        where: { farmId: farm.id },
        select: { severity: true, status: true }
      })
    ]);

    const balance =
      transactions
        .filter((item) => item.transactionType === 'REVENU')
        .reduce((sum, item) => sum + item.amount, 0) -
      transactions
        .filter((item) => item.transactionType === 'DEPENSE')
        .reduce((sum, item) => sum + item.amount, 0);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthBalance =
      transactions
        .filter((item) => item.transactionDate >= currentMonthStart && item.transactionType === 'REVENU')
        .reduce((sum, item) => sum + item.amount, 0) -
      transactions
        .filter((item) => item.transactionDate >= currentMonthStart && item.transactionType === 'DEPENSE')
        .reduce((sum, item) => sum + item.amount, 0);
    const previousMonthBalance =
      transactions
        .filter(
          (item) =>
            item.transactionDate >= previousMonthStart &&
            item.transactionDate < currentMonthStart &&
            item.transactionType === 'REVENU'
        )
        .reduce((sum, item) => sum + item.amount, 0) -
      transactions
        .filter(
          (item) =>
            item.transactionDate >= previousMonthStart &&
            item.transactionDate < currentMonthStart &&
            item.transactionType === 'DEPENSE'
        )
        .reduce((sum, item) => sum + item.amount, 0);
    const balanceTrend =
      previousMonthBalance === 0
        ? currentMonthBalance === 0
          ? 0
          : 100
        : ((currentMonthBalance - previousMonthBalance) / Math.abs(previousMonthBalance)) * 100;

    const items = generateFarmRecommendations({
      activityType: farm.activityType,
      lowStockItems: stockItems.filter((item) => item.currentQuantity <= item.lowStockThreshold).length,
      outOfStockItems: stockItems.filter((item) => item.currentQuantity <= 0).length,
      criticalSanitaryEvents: sanitaryEvents.filter((item) => item.status === 'CRITIQUE').length,
      overdueTasks: agendaTasks.filter((item) => item.status === 'EN_RETARD').length,
      unreadCriticalAlerts: alerts.filter(
        (item) =>
          item.severity === 'CRITICAL' && item.status !== 'RESOLVED' && item.status !== 'IGNORED'
      ).length,
      balance,
      balanceTrend,
      currentMonthBalance,
      previousMonthBalance,
      activeAnimals: animalGroups.filter((item) => item.status === 'ACTIF').length,
      hasLivestock:
        farm.activityType === 'ELEVAGE' ||
        farm.activityType === 'MIXTE' ||
        farm.activityType === 'PISCICULTURE',
      hasCrops: farm.activityType === 'CULTURE' || farm.activityType === 'MIXTE'
    });

    return { items };
  }
}
