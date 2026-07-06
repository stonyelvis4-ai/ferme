import { Injectable, Logger } from '@nestjs/common';
import {
  type AgendaTask,
  type AlertSeverity,
  type NotificationChannel,
  type ReminderTriggerType
} from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service.js';
import { NotificationQueue } from './notification.queue.js';

const REMINDER_CHANNELS: NotificationChannel[] = ['IN_APP', 'WEB_PUSH', 'SOUND', 'EMAIL'];

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueue
  ) {}

  async scheduleTaskNotifications(task: AgendaTask) {
    if (task.status === 'TERMINEE' || task.status === 'ANNULEE') {
      await this.cancelTaskNotifications(task.id);
      return;
    }

    const now = new Date();
    const reminderWindows = [
      ...(task.sourceModule?.startsWith('SANITARY')
        ? [
            {
              triggerType: 'SEVEN_DAYS' as const,
              scheduledFor: new Date(task.scheduledFor.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          ]
        : []),
      {
        triggerType: 'TWENTY_FOUR_HOURS' as const,
        scheduledFor: new Date(task.scheduledFor.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        triggerType: 'SIX_HOURS' as const,
        scheduledFor: new Date(task.scheduledFor.getTime() - 6 * 60 * 60 * 1000)
      },
      {
        triggerType: 'ONE_HOUR' as const,
        scheduledFor: new Date(task.scheduledFor.getTime() - 1 * 60 * 60 * 1000)
      },
      {
        triggerType: 'AT_TIME' as const,
        scheduledFor: task.scheduledFor
      }
    ].filter((window) =>
      window.triggerType === 'AT_TIME'
        ? window.scheduledFor.getTime() >= now.getTime()
        : window.scheduledFor.getTime() > now.getTime()
    );

    for (const reminder of reminderWindows) {
      for (const channel of REMINDER_CHANNELS) {
        const notification = await this.prisma.notification.upsert({
          where: {
            agendaTaskId_channel_triggerType: {
              agendaTaskId: task.id,
              channel,
              triggerType: reminder.triggerType
            }
          },
          update: {
            title: this.buildTitle(reminder.triggerType, task.title),
            message: this.buildMessage(reminder.triggerType, task),
            scheduledFor: reminder.scheduledFor,
            status: this.notificationQueue.isAvailable() ? 'SCHEDULED' : 'PENDING',
            errorMessage: null,
            payload: {
              taskTitle: task.title,
              taskStatus: task.status,
              scheduledLabel: task.scheduledLabel,
              sourceModule: task.sourceModule
            }
          },
          create: {
            farmId: task.farmId,
            agendaTaskId: task.id,
            channel,
            triggerType: reminder.triggerType,
            title: this.buildTitle(reminder.triggerType, task.title),
            message: this.buildMessage(reminder.triggerType, task),
            scheduledFor: reminder.scheduledFor,
            status: this.notificationQueue.isAvailable() ? 'SCHEDULED' : 'PENDING',
            payload: {
              taskTitle: task.title,
              taskStatus: task.status,
              scheduledLabel: task.scheduledLabel,
              sourceModule: task.sourceModule
            }
          }
        });

        if (this.notificationQueue.isAvailable()) {
          await this.notificationQueue.scheduleNotification(notification.id, notification.scheduledFor);
        }
      }
    }
  }

  async createOverdueNotifications(task: AgendaTask) {
    if (task.status !== 'EN_RETARD') {
      return;
    }

    const overdueProfile = this.getOverdueProfile(task);

    for (const channel of REMINDER_CHANNELS) {
      const notification = await this.prisma.notification.upsert({
        where: {
          agendaTaskId_channel_triggerType: {
            agendaTaskId: task.id,
            channel,
            triggerType: 'OVERDUE'
          }
        },
        update: {
          title: overdueProfile.title,
          message: overdueProfile.message,
          scheduledFor: new Date(),
          status: this.notificationQueue.isAvailable() ? 'SCHEDULED' : 'PENDING',
          errorMessage: null,
          payload: {
            taskTitle: task.title,
            taskStatus: task.status,
            scheduledLabel: task.scheduledLabel,
            overdueHours: overdueProfile.overdueHours,
            severity: overdueProfile.severity
          }
        },
        create: {
          farmId: task.farmId,
          agendaTaskId: task.id,
          channel,
          triggerType: 'OVERDUE',
          title: overdueProfile.title,
          message: overdueProfile.message,
          scheduledFor: new Date(),
          status: this.notificationQueue.isAvailable() ? 'SCHEDULED' : 'PENDING',
          payload: {
            taskTitle: task.title,
            taskStatus: task.status,
            scheduledLabel: task.scheduledLabel,
            overdueHours: overdueProfile.overdueHours,
            severity: overdueProfile.severity
          }
        }
      });

      if (this.notificationQueue.isAvailable()) {
        await this.notificationQueue.scheduleNotification(notification.id, notification.scheduledFor);
      }
    }
  }

  async cancelTaskNotifications(taskId: string) {
    await this.prisma.notification.updateMany({
      where: {
        agendaTaskId: taskId,
        status: {
          in: ['PENDING', 'SCHEDULED']
        }
      },
      data: {
        status: 'CANCELED',
        errorMessage: null
      }
    });
  }

  async getDueNotifications(limit = 100) {
    return this.prisma.notification.findMany({
      where: {
        status: {
          in: ['PENDING', 'SCHEDULED']
        },
        scheduledFor: {
          lte: new Date()
        }
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: limit
    });
  }

  async dispatchNotification(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        agendaTask: true,
        alert: true
      }
    });

    if (!notification || notification.status === 'CANCELED' || notification.status === 'SENT') {
      return;
    }

    try {
      if (notification.channel === 'IN_APP' && !notification.alertId) {
        const alert = await this.prisma.alert.create({
          data: {
            farmId: notification.farmId,
            type: 'REMINDER',
            priority:
              notification.triggerType === 'OVERDUE'
                ? 'URGENT'
                : notification.triggerType === 'AT_TIME' || notification.triggerType === 'ONE_HOUR'
                  ? 'HIGH'
                : 'MEDIUM',
            title: notification.title,
            severity: this.toAlertSeverity(
              notification.triggerType,
              notification.payload as { severity?: AlertSeverity } | null
            ),
            message: notification.message,
            sourceModule: notification.agendaTask?.sourceModule ?? 'AGENDA',
            sourceRecordId: notification.agendaTaskId ?? null,
            dueAt: notification.scheduledFor
          }
        });

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { alertId: alert.id }
        });
      }

      await this.emitChannelNotification(notification.channel, notification.title, notification.message);

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          deliveredAt: new Date(),
          errorMessage: null
        }
      });
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Dispatch failed'
        }
      });
      throw error;
    }
  }

  private async emitChannelNotification(channel: NotificationChannel, title: string, message: string) {
    if (channel === 'IN_APP') {
      this.logger.log(`In-app reminder emitted: ${title}`);
      return;
    }

    if (channel === 'WEB_PUSH') {
      this.logger.log(`Web push reminder prepared: ${title} - ${message}`);
      return;
    }

    if (channel === 'SOUND') {
      this.logger.log(`Sound alarm triggered for reminder: ${title}`);
      return;
    }

    this.logger.log(`Email reminder queued for future provider integration: ${title}`);
  }

  private buildTitle(triggerType: ReminderTriggerType, taskTitle: string) {
    if (triggerType === 'SEVEN_DAYS') {
      return `Rappel J-7: ${taskTitle}`;
    }

    if (triggerType === 'TWENTY_FOUR_HOURS') {
      return `Rappel J-1: ${taskTitle}`;
    }

    if (triggerType === 'SIX_HOURS') {
      return `Rappel H-6: ${taskTitle}`;
    }

    if (triggerType === 'ONE_HOUR') {
      return `Rappel H-1: ${taskTitle}`;
    }

    if (triggerType === 'AT_TIME') {
      return `C'est l'heure: ${taskTitle}`;
    }

    return `Tache en retard: ${taskTitle}`;
  }

  private buildMessage(triggerType: ReminderTriggerType, task: AgendaTask) {
    if (triggerType === 'SEVEN_DAYS') {
      return `La tache "${task.title}" est planifiee dans 7 jours (${task.scheduledLabel}).`;
    }

    if (triggerType === 'TWENTY_FOUR_HOURS') {
      return `La tache "${task.title}" est planifiee dans 24 heures (${task.scheduledLabel}).`;
    }

    if (triggerType === 'SIX_HOURS') {
      return `La tache "${task.title}" est prevue dans 6 heures (${task.scheduledLabel}).`;
    }

    if (triggerType === 'ONE_HOUR') {
      return `La tache "${task.title}" doit etre preparee dans 1 heure (${task.scheduledLabel}).`;
    }

    if (triggerType === 'AT_TIME') {
      return `La tache "${task.title}" doit demarrer maintenant (${task.scheduledLabel}).`;
    }

    return `La tache "${task.title}" est maintenant en retard et requiert une action immediate.`;
  }

  private toAlertSeverity(
    triggerType: ReminderTriggerType,
    payload?: { severity?: AlertSeverity } | null
  ): 'INFO' | 'WARNING' | 'CRITICAL' {
    if (triggerType === 'SEVEN_DAYS' || triggerType === 'TWENTY_FOUR_HOURS') {
      return 'INFO';
    }

    if (triggerType === 'SIX_HOURS' || triggerType === 'ONE_HOUR' || triggerType === 'AT_TIME') {
      return 'WARNING';
    }

    return payload?.severity ?? 'CRITICAL';
  }

  private getOverdueProfile(task: AgendaTask) {
    const sanitaryProfile = this.getSanitaryOverdueProfile(task);
    if (sanitaryProfile) {
      return sanitaryProfile;
    }

    const overdueHours = Math.max(
      0,
      Math.floor((Date.now() - task.scheduledFor.getTime()) / (60 * 60 * 1000))
    );

    if (overdueHours >= 72) {
      return {
        overdueHours,
        severity: 'CRITICAL' as const,
        title: `Tache critique en retard: ${task.title}`,
        message: `La tache "${task.title}" est en retard depuis plus de 72 heures (${task.scheduledLabel}). Une action immediate est requise.`
      };
    }

    if (overdueHours >= 24) {
      return {
        overdueHours,
        severity: 'WARNING' as const,
        title: `Tache en retard a traiter: ${task.title}`,
        message: `La tache "${task.title}" est en retard depuis plus de 24 heures (${task.scheduledLabel}). Elle doit etre traitee rapidement.`
      };
    }

    return {
      overdueHours,
      severity: 'INFO' as const,
      title: `Tache en retard: ${task.title}`,
      message: `La tache "${task.title}" n'est pas terminee a l'heure prevue (${task.scheduledLabel}).`
    };
  }

  private getSanitaryOverdueProfile(task: AgendaTask) {
    if (!task.sourceModule?.startsWith('SANITARY')) {
      return null;
    }

    const overdueHours = Math.max(
      0,
      Math.floor((Date.now() - task.scheduledFor.getTime()) / (60 * 60 * 1000))
    );
    const lowerTitle = task.title.toLowerCase();
    const isVaccination = lowerTitle.includes('vaccination') || lowerTitle.includes('vaccinal');
    const isTreatment = lowerTitle.includes('traitement') || lowerTitle.includes('vermifug');

    if (isVaccination) {
      return {
        overdueHours,
        severity: 'CRITICAL' as const,
        title: `Vaccination en retard: ${task.title}`,
        message: `La vaccination "${task.title}" est en retard (${task.scheduledLabel}). Priorite sanitaire immediate.`
      };
    }

    if (isTreatment) {
      return {
        overdueHours,
        severity: overdueHours >= 24 ? 'CRITICAL' as const : 'WARNING' as const,
        title: `Traitement sanitaire en retard: ${task.title}`,
        message: `Le traitement "${task.title}" est en retard (${task.scheduledLabel}) et doit etre realise rapidement.`
      };
    }

    return {
      overdueHours,
      severity: overdueHours >= 24 ? 'WARNING' as const : 'INFO' as const,
      title: `Controle sanitaire en retard: ${task.title}`,
      message: `Le suivi sanitaire "${task.title}" depasse sa date prevue (${task.scheduledLabel}).`
    };
  }
}
