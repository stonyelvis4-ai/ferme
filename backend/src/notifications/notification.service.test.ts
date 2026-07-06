import type { AgendaTask } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service.js';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T08:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('adds a J-7 reminder for sanitary tasks', async () => {
    const upsert = vi.fn(async ({ create }) => ({
      id: `${create.channel}-${create.triggerType}`,
      scheduledFor: create.scheduledFor
    }));
    const scheduleNotification = vi.fn();

    const service = new NotificationService(
      {
        notification: {
          upsert
        }
      } as never,
      {
        isAvailable: () => false,
        scheduleNotification
      } as never
    );

    const task: AgendaTask = {
      id: 'task-1',
      farmId: 'farm-1',
      title: 'Vaccination Newcastle',
      description: 'Vaccination volailles',
      priority: 'HIGH',
      status: 'A_FAIRE',
      category: 'SANITAIRE',
      scheduledFor: new Date('2026-07-10T08:00:00.000Z'),
      scheduledLabel: '10/07/2026',
      sourceModule: 'SANITARY_AUTO',
      sourceRecordId: 'event-1',
      linkedModule: null,
      linkedEntityType: null,
      linkedEntityId: null,
      linkedEntityLabel: null,
      reminderPreset: null,
      repeatRule: 'NONE',
      repeatEvery: null,
      notes: null,
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
      updatedAt: new Date('2026-07-01T08:00:00.000Z')
    };

    await service.scheduleTaskNotifications(task);

    const triggerTypes = upsert.mock.calls.map(
      ([payload]) => payload.create.triggerType as string
    );

    expect(triggerTypes.filter((value) => value === 'SEVEN_DAYS')).toHaveLength(4);
    expect(triggerTypes.filter((value) => value === 'TWENTY_FOUR_HOURS')).toHaveLength(4);
    expect(scheduleNotification).not.toHaveBeenCalled();
  });

  it('escalates overdue sanitary vaccinations as critical', () => {
    const service = new NotificationService(
      {
        notification: {}
      } as never,
      {
        isAvailable: () => false
      } as never
    );

      const profile = (service as unknown as { getOverdueProfile: (task: AgendaTask) => { severity: string; title: string } })
      .getOverdueProfile({
        id: 'task-2',
        farmId: 'farm-1',
        title: 'Vaccination bovine de routine',
        description: 'Suivi sanitaire',
        priority: 'HIGH',
        status: 'EN_RETARD',
        category: 'SANITAIRE',
        scheduledFor: new Date('2026-06-30T07:00:00.000Z'),
        scheduledLabel: 'Hier',
        sourceModule: 'SANITARY_MANUAL',
        sourceRecordId: 'event-2',
        linkedModule: null,
        linkedEntityType: null,
        linkedEntityId: null,
        linkedEntityLabel: null,
        reminderPreset: null,
        repeatRule: 'NONE',
        repeatEvery: null,
        notes: null,
        createdAt: new Date('2026-06-29T08:00:00.000Z'),
        updatedAt: new Date('2026-07-01T08:00:00.000Z')
      });

    expect(profile.severity).toBe('CRITICAL');
    expect(profile.title).toContain('Vaccination en retard');
  });
});
