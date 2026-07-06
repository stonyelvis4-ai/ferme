import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [AuthModule, FarmsModule, NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService]
})
export class InventoryModule {}
