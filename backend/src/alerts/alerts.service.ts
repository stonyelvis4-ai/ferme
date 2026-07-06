import type { Alert as PersistedAlert, AlertStatus, Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface AlertView {
  id: string;
  type: 'REMINDER' | 'OPERATIONAL' | 'SYSTEM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
  title: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  sourceModule: string | null;
  sourceRecordId: string | null;
  dueAt: string | null;
  readAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  ignoredAt: string | null;
  createdAt: string;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async listFarmAlerts(user: SessionUser, farmId: string): Promise<{ items: AlertView[] }> {
    const farm = await this.farmsService.getFarm(user, farmId);
    const alerts = await this.prisma.alert.findMany({
      where: { farmId: farm.id },
      orderBy: [{ createdAt: 'desc' }]
    });

    return {
      items: alerts
        .map((alert) => this.toView(alert))
        .sort((left, right) => this.getStatusRank(left.status) - this.getStatusRank(right.status))
    };
  }

  async markAlertAsRead(user: SessionUser, farmId: string, alertId: string): Promise<AlertView> {
    return this.updateAlert(user, farmId, alertId, 'read');
  }

  async acknowledgeAlert(user: SessionUser, farmId: string, alertId: string): Promise<AlertView> {
    return this.updateAlert(user, farmId, alertId, 'acknowledge');
  }

  async resolveAlert(user: SessionUser, farmId: string, alertId: string): Promise<AlertView> {
    return this.updateAlert(user, farmId, alertId, 'resolve');
  }

  async ignoreAlert(user: SessionUser, farmId: string, alertId: string): Promise<AlertView> {
    return this.updateAlert(user, farmId, alertId, 'ignore');
  }

  private async updateAlert(
    user: SessionUser,
    farmId: string,
    alertId: string,
    transition: 'read' | 'acknowledge' | 'resolve' | 'ignore'
  ): Promise<AlertView> {
    const farm = await this.farmsService.getFarm(user, farmId);
    const alert = await this.prisma.alert.findFirst({
      where: {
        id: alertId,
        farmId: farm.id
      }
    });

    if (!alert) {
      throw new NotFoundException('Alerte introuvable');
    }

    const now = new Date();
    const updated = await this.prisma.alert.update({
      where: { id: alert.id },
      data: this.getAlertUpdatePayload(alert, transition, now)
    });

    return this.toView(updated);
  }

  private getAlertUpdatePayload(
    alert: PersistedAlert,
    transition: 'read' | 'acknowledge' | 'resolve' | 'ignore',
    now: Date
  ): Prisma.AlertUpdateInput {
    if (transition === 'read') {
      const status: AlertStatus = alert.status === 'NEW' ? 'PENDING' : alert.status;

      return {
        readAt: alert.readAt ?? now,
        status
      };
    }

    if (transition === 'acknowledge') {
      return {
        readAt: alert.readAt ?? now,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: alert.acknowledgedAt ?? now,
        ignoredAt: null
      };
    }

    if (transition === 'resolve') {
      return {
        readAt: alert.readAt ?? now,
        status: 'RESOLVED',
        resolvedAt: alert.resolvedAt ?? now,
        ignoredAt: null
      };
    }

    return {
      readAt: alert.readAt ?? now,
      status: 'IGNORED',
      ignoredAt: alert.ignoredAt ?? now
    };
  }

  private toView(alert: {
    id: string;
    type: 'REMINDER' | 'OPERATIONAL' | 'SYSTEM';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: 'NEW' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    sourceModule: string | null;
    sourceRecordId: string | null;
    dueAt: Date | null;
    readAt: Date | null;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    ignoredAt: Date | null;
    createdAt: Date;
  }): AlertView {
    return {
      id: alert.id,
      type: alert.type,
      priority: alert.priority,
      status: alert.status,
      title: alert.title,
      severity: alert.severity,
      message: alert.message,
      sourceModule: alert.sourceModule,
      sourceRecordId: alert.sourceRecordId,
      dueAt: alert.dueAt ? alert.dueAt.toISOString() : null,
      readAt: alert.readAt ? alert.readAt.toISOString() : null,
      acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
      resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
      ignoredAt: alert.ignoredAt ? alert.ignoredAt.toISOString() : null,
      createdAt: alert.createdAt.toISOString()
    };
  }

  private getStatusRank(status: AlertView['status']) {
    switch (status) {
      case 'NEW':
        return 0;
      case 'PENDING':
        return 1;
      case 'ACKNOWLEDGED':
        return 2;
      case 'RESOLVED':
        return 3;
      case 'IGNORED':
        return 4;
      default:
        return 5;
    }
  }
}
