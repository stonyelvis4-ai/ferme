import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../../notifications/reminder.service.js';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(private readonly reminderService: ReminderService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncDueReminderWindows() {
    this.logger.debug('Scanning due reminder windows.');
    await this.reminderService.dispatchDueNotificationsFallback();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async markOverdueTasks() {
    await this.reminderService.markOverdueTasks();
  }

  async scheduleBootstrapReminder(taskTitle: string) {
    this.logger.log(`Reminder workflow initialized for task: ${taskTitle}`);
  }
}
