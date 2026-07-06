import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';

@Module({
  imports: [AuthModule, FarmsModule],
  controllers: [AlertsController],
  providers: [AlertsService]
})
export class AlertsModule {}
