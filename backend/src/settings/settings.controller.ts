import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { SessionUser } from '../auth/auth.service.js';
import { SettingsService } from './settings.service.js';

class BusinessSettingsDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  stockRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  livestockRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  fishRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  cropRules?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  reminderDefaults?: number[];

  @IsOptional()
  @IsArray()
  units?: string[];

  @IsOptional()
  @IsObject()
  defaultPrices?: Record<string, number>;

  @IsOptional()
  @IsObject()
  taskCatalog?: {
    categories?: string[];
    priorities?: string[];
  };

  @IsOptional()
  @IsObject()
  alertRules?: Record<string, unknown>;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('farms/:farmId/business-settings')
  async getBusinessSettings(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.settingsService.getFarmBusinessSettings(user, farmId);
  }

  @Put('farms/:farmId/business-settings')
  @Roles('ADMIN')
  async updateBusinessSettings(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: BusinessSettingsDto
  ) {
    return this.settingsService.updateFarmBusinessSettings(user, farmId, body);
  }
}
