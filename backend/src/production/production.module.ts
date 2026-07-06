import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PrismaModule } from '../shared/database/prisma.module.js';
import { ProductionController } from './production.controller.js';
import { ProductionService } from './production.service.js';

@Module({
  imports: [PrismaModule, FarmsModule, NotificationsModule, AuthModule],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService]
})
export class ProductionModule {}
