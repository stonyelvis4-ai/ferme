import { Injectable, Logger } from '@nestjs/common';
import { type AgendaTask } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service.js';
import { NotificationService } from './notification.service.js';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async syncFarmReminders(farmId: string) {
    const tasks = await this.prisma.agendaTask.findMany({
      where: {
        farmId,
        status: {
          in: ['A_FAIRE', 'EN_COURS', 'EN_RETARD']
        }
      }
    });

    for (const task of tasks) {
      await this.syncTaskReminders(task);
    }
  }

  async syncTaskReminders(task: AgendaTask) {
    if (task.status === 'TERMINEE' || task.status === 'ANNULEE') {
      await this.notificationService.cancelTaskNotifications(task.id);
      return;
    }

    await this.notificationService.scheduleTaskNotifications(task);

    if (task.status === 'EN_RETARD') {
      await this.notificationService.createOverdueNotifications(task);
    }
  }

  async markOverdueTasks() {
    const tasksToFlag = await this.prisma.agendaTask.findMany({
      where: {
        status: {
          in: ['A_FAIRE', 'EN_COURS']
        },
        scheduledFor: {
          lt: new Date()
        }
      }
    });

    for (const task of tasksToFlag) {
      const updated = await this.prisma.agendaTask.update({
        where: { id: task.id },
        data: { status: 'EN_RETARD' }
      });

      await this.notificationService.createOverdueNotifications(updated);
    }

    const alreadyOverdueTasks = await this.prisma.agendaTask.findMany({
      where: {
        status: 'EN_RETARD'
      }
    });

    for (const task of alreadyOverdueTasks) {
      await this.notificationService.createOverdueNotifications(task);
    }

    if (tasksToFlag.length || alreadyOverdueTasks.length) {
      this.logger.log(
        `${tasksToFlag.length} overdue agenda task(s) flagged and ${alreadyOverdueTasks.length} overdue task(s) resynchronized.`
      );
    }
  }

  async dispatchDueNotificationsFallback() {
    const dueNotifications = await this.notificationService.getDueNotifications();

    for (const notification of dueNotifications) {
      await this.notificationService.dispatchNotification(notification.id);
    }

    if (dueNotifications.length) {
      this.logger.log(`${dueNotifications.length} notification(s) dispatched by cron fallback.`);
    }
  }
}
