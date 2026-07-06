import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { DashboardService } from './dashboard.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.dashboardService.getFarmDashboard(user, farmId);
  }
}
