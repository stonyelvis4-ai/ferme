import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SanitaryController } from './sanitary.controller.js';
import { SanitaryService } from './sanitary.service.js';

@Module({
  imports: [AuthModule, FarmsModule, NotificationsModule],
  controllers: [SanitaryController],
  providers: [SanitaryService],
  exports: [SanitaryService]
})
export class SanitaryModule {}
