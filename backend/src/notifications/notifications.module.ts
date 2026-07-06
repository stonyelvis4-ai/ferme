import { Module } from '@nestjs/common';
import { NotificationQueue } from './notification.queue.js';
import { NotificationService } from './notification.service.js';
import { ReminderService } from './reminder.service.js';

@Module({
  providers: [NotificationQueue, NotificationService, ReminderService],
  exports: [NotificationQueue, NotificationService, ReminderService]
})
export class NotificationsModule {}
