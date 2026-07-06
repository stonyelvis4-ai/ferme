import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../../notifications/notifications.module.js';
import { ReminderScheduler } from './reminder.scheduler.js';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [ReminderScheduler],
  exports: [ReminderScheduler]
})
export class JobsModule {}
