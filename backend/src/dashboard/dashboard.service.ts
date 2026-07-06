import { Injectable } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface FarmDashboardView {
  farm: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';
    activityType: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
    location: string;
  };
  metrics: {
    animals: number;
    activeAnimals: number;
    stockItems: number;
    lowStockItems: number;
    sanitaryEvents: number;
    criticalSanitaryEvents: number;
    revenue: number;
    expenses: number;
    balance: number;
    agendaToday: number;
    overdueTasks: number;
    unreadAlerts: number;
  };
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    createdAt: string;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async getFarmDashboard(user: SessionUser, farmId: string): Promise<FarmDashboardView> {
    const farm = await this.farmsService.getFarm(user, farmId);

    const [
      animalGroups,
      stockItems,
      sanitaryEvents,
      transactions,
      agendaTasks,
      alerts
    ] = await Promise.all([
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
        select: { transactionType: true, amount: true }
      }),
      this.prisma.agendaTask.findMany({
        where: { farmId: farm.id },
        select: { scheduledLabel: true, status: true }
      }),
      this.prisma.alert.findMany({
        where: { farmId: farm.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          severity: true,
          readAt: true,
          createdAt: true
        }
      })
    ]);

    const revenue = transactions
      .filter((item) => item.transactionType === 'REVENU')
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions
      .filter((item) => item.transactionType === 'DEPENSE')
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        status: farm.status,
        activityType: farm.activityType,
        location: farm.location
      },
      metrics: {
        animals: animalGroups.length,
        activeAnimals: animalGroups.filter((item) => item.status === 'ACTIF').length,
        stockItems: stockItems.length,
        lowStockItems: stockItems.filter((item) => item.currentQuantity <= item.lowStockThreshold).length,
        sanitaryEvents: sanitaryEvents.length,
        criticalSanitaryEvents: sanitaryEvents.filter((item) => item.status === 'CRITIQUE').length,
        revenue,
        expenses,
        balance: revenue - expenses,
        agendaToday: agendaTasks.filter((item) => item.scheduledLabel.includes("Aujourd'hui")).length,
        overdueTasks: agendaTasks.filter((item) => item.status === 'EN_RETARD').length,
        unreadAlerts: alerts.filter((item) => item.readAt === null).length
      },
      recentAlerts: alerts.map((item) => ({
        id: item.id,
        title: item.title,
        severity: item.severity,
        createdAt: item.createdAt.toISOString()
      }))
    };
  }
}
