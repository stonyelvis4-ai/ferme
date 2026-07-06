import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AlertsService } from './alerts.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async listAlerts(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.alertsService.listFarmAlerts(user, farmId);
  }

  @Patch(':alertId/read')
  async markRead(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('alertId') alertId: string
  ) {
    return this.alertsService.markAlertAsRead(user, farmId, alertId);
  }

  @Patch(':alertId/acknowledge')
  async acknowledge(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('alertId') alertId: string
  ) {
    return this.alertsService.acknowledgeAlert(user, farmId, alertId);
  }

  @Patch(':alertId/resolve')
  async resolve(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('alertId') alertId: string
  ) {
    return this.alertsService.resolveAlert(user, farmId, alertId);
  }

  @Patch(':alertId/ignore')
  async ignore(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('alertId') alertId: string
  ) {
    return this.alertsService.ignoreAlert(user, farmId, alertId);
  }
}
