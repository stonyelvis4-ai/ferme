import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CropsController } from './crops.controller.js';
import { CropsService } from './crops.service.js';

@Module({
  imports: [AuthModule, FarmsModule, NotificationsModule],
  controllers: [CropsController],
  providers: [CropsService]
})
export class CropsModule {}
