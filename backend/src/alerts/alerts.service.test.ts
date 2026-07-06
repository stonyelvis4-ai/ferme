import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AlertsService } from './alerts.service.js';

describe('AlertsService', () => {
  const sessionUser = {
    id: 'user-1',
    email: 'admin@ferm.plus',
    fullName: 'Admin',
    role: 'ADMIN' as const,
    assignedFarmIds: ['farm-1']
  };

  it('sorts alerts by workflow status priority', async () => {
    const service = new AlertsService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        alert: {
          findMany: vi.fn(async () => [
            {
              id: 'resolved',
              type: 'OPERATIONAL',
              priority: 'HIGH',
              status: 'RESOLVED',
              title: 'Resolved',
              severity: 'WARNING',
              message: 'done',
              sourceModule: 'STOCKS',
              sourceRecordId: '1',
              dueAt: null,
              readAt: new Date('2026-07-01T08:00:00.000Z'),
              acknowledgedAt: null,
              resolvedAt: new Date('2026-07-01T08:10:00.000Z'),
              ignoredAt: null,
              createdAt: new Date('2026-07-01T08:00:00.000Z')
            },
            {
              id: 'new',
              type: 'OPERATIONAL',
              priority: 'URGENT',
              status: 'NEW',
              title: 'New',
              severity: 'CRITICAL',
              message: 'todo',
              sourceModule: 'SANITAIRE',
              sourceRecordId: '2',
              dueAt: null,
              readAt: null,
              acknowledgedAt: null,
              resolvedAt: null,
              ignoredAt: null,
              createdAt: new Date('2026-07-01T09:00:00.000Z')
            },
            {
              id: 'ack',
              type: 'REMINDER',
              priority: 'MEDIUM',
              status: 'ACKNOWLEDGED',
              title: 'Ack',
              severity: 'INFO',
              message: 'tracked',
              sourceModule: 'AGENDA',
              sourceRecordId: '3',
              dueAt: null,
              readAt: new Date('2026-07-01T07:00:00.000Z'),
              acknowledgedAt: new Date('2026-07-01T07:05:00.000Z'),
              resolvedAt: null,
              ignoredAt: null,
              createdAt: new Date('2026-07-01T07:00:00.000Z')
            }
          ])
        }
      } as never
    );

    const response = await service.listFarmAlerts(sessionUser, 'farm-1');

    expect(response.items.map((item) => item.id)).toEqual(['new', 'ack', 'resolved']);
  });

  it('moves a new alert to pending when marked as read', async () => {
    const update = vi.fn(async ({ data }) => ({
      id: 'alert-1',
      type: 'OPERATIONAL',
      priority: 'HIGH',
      status: data.status,
      title: 'Stock faible',
      severity: 'WARNING',
      message: 'restock',
      sourceModule: 'STOCKS',
      sourceRecordId: 'stock-1',
      dueAt: null,
      readAt: data.readAt,
      acknowledgedAt: null,
      resolvedAt: null,
      ignoredAt: null,
      createdAt: new Date('2026-07-01T08:00:00.000Z')
    }));

    const service = new AlertsService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        alert: {
          findFirst: vi.fn(async () => ({
            id: 'alert-1',
            farmId: 'farm-1',
            type: 'OPERATIONAL',
            priority: 'HIGH',
            status: 'NEW',
            title: 'Stock faible',
            severity: 'WARNING',
            message: 'restock',
            sourceModule: 'STOCKS',
            sourceRecordId: 'stock-1',
            dueAt: null,
            readAt: null,
            acknowledgedAt: null,
            resolvedAt: null,
            ignoredAt: null,
            createdAt: new Date('2026-07-01T08:00:00.000Z'),
            updatedAt: new Date('2026-07-01T08:00:00.000Z')
          })),
          update
        }
      } as never
    );

    const response = await service.markAlertAsRead(sessionUser, 'farm-1', 'alert-1');

    expect(response.status).toBe('PENDING');
    expect(response.readAt).not.toBeNull();
    expect(update).toHaveBeenCalled();
  });

  it('throws when updating an unknown alert', async () => {
    const service = new AlertsService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        alert: {
          findFirst: vi.fn(async () => null)
        }
      } as never
    );

    await expect(service.resolveAlert(sessionUser, 'farm-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
