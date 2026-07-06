import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [AuthModule, FarmsModule],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
