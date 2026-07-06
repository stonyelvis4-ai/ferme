import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { FarmsService } from './farms.service.js';

class CreateFarmDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  location!: string;

  @IsNumber()
  @Min(0)
  surfaceArea!: number;

  @IsIn(['ACTIVE', 'EN_PREPARATION', 'SUSPENDUE', 'FERMEE'])
  status!: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';

  @IsIn(['ELEVAGE', 'CULTURE', 'MIXTE', 'PISCICULTURE'])
  activityType!: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';

  @IsOptional()
  @IsString()
  ownerUserId?: string;
}

class UpdateFarmDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  surfaceArea?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'EN_PREPARATION', 'SUSPENDUE', 'FERMEE'])
  status?: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';

  @IsOptional()
  @IsIn(['ELEVAGE', 'CULTURE', 'MIXTE', 'PISCICULTURE'])
  activityType?: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
}

class AssignFarmOwnerDto {
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}

class UpdateFarmStatusDto {
  @IsIn(['ACTIVE', 'EN_PREPARATION', 'SUSPENDUE', 'FERMEE'])
  status!: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get('owners/options')
  @Roles('ADMIN')
  async listOwnerOptions() {
    return { items: await this.farmsService.listAssignableOwners() };
  }

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    return { items: await this.farmsService.listVisibleFarms(user) };
  }

  @Get(':farmId')
  async detail(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.farmsService.getFarm(user, farmId);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() body: CreateFarmDto) {
    return this.farmsService.createFarm(body);
  }

  @Patch(':farmId')
  @Roles('ADMIN')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: UpdateFarmDto
  ) {
    return this.farmsService.updateFarm(user, farmId, body);
  }

  @Patch(':farmId/owner')
  @Roles('ADMIN')
  async assignOwner(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: AssignFarmOwnerDto
  ) {
    return this.farmsService.assignOwner(user, farmId, body.ownerUserId ?? null);
  }

  @Patch(':farmId/status')
  @Roles('ADMIN')
  async changeStatus(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: UpdateFarmStatusDto
  ) {
    return this.farmsService.changeStatus(user, farmId, body.status);
  }

  @Patch(':farmId/archive')
  @Roles('ADMIN')
  async archive(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.farmsService.archiveFarm(user, farmId);
  }

  @Patch(':farmId/deactivate')
  @Roles('ADMIN')
  async deactivate(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.farmsService.deactivateFarm(user, farmId);
  }

  @Patch(':farmId/restore')
  @Roles('ADMIN')
  async restore(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.farmsService.restoreFarm(user, farmId);
  }

  @Delete(':farmId')
  @Roles('ADMIN')
  async softDelete(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.farmsService.softDeleteFarm(user, farmId);
  }
}
