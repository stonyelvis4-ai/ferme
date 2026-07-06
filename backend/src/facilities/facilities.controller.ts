import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { FacilitiesService } from './facilities.service.js';

class CreateBuildingDto {
  @IsString()
  name!: string;

  @IsIn(['POULAILLER', 'ETABLE', 'BERGERIE', 'PORCHERIE', 'BASSIN', 'HANGAR', 'MAGASIN'])
  buildingType!: 'POULAILLER' | 'ETABLE' | 'BERGERIE' | 'PORCHERIE' | 'BASSIN' | 'HANGAR' | 'MAGASIN';

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  conditionLabel?: string;

  @IsIn(['OPERATIONNEL', 'MAINTENANCE', 'INACTIF', 'SATURATED'])
  status!: 'OPERATIONNEL' | 'MAINTENANCE' | 'INACTIF' | 'SATURATED';

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateEnclosureDto {
  @IsString()
  name!: string;

  @IsIn(['ENCLOS_GENERIC', 'PATURAGE', 'PARC_ISOLE', 'BASSIN_OUVERT'])
  enclosureType!: 'ENCLOS_GENERIC' | 'PATURAGE' | 'PARC_ISOLE' | 'BASSIN_OUVERT';

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  conditionLabel?: string;

  @IsIn(['OPERATIONNEL', 'MAINTENANCE', 'INACTIF', 'SATURATED'])
  status!: 'OPERATIONNEL' | 'MAINTENANCE' | 'INACTIF' | 'SATURATED';

  @IsOptional()
  @IsString()
  notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  async overview(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.facilitiesService.getFacilityOverview(user, farmId);
  }

  @Post('buildings')
  @Roles('ADMIN')
  async createBuilding(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateBuildingDto
  ) {
    return this.facilitiesService.createBuilding(user, farmId, body);
  }

  @Patch('buildings/:buildingId')
  @Roles('ADMIN')
  async updateBuilding(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('buildingId') buildingId: string,
    @Body() body: CreateBuildingDto
  ) {
    return this.facilitiesService.updateBuilding(user, farmId, buildingId, body);
  }

  @Delete('buildings/:buildingId')
  @Roles('ADMIN')
  async deleteBuilding(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('buildingId') buildingId: string
  ) {
    return this.facilitiesService.deleteBuilding(user, farmId, buildingId);
  }

  @Post('enclosures')
  @Roles('ADMIN')
  async createEnclosure(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateEnclosureDto
  ) {
    return this.facilitiesService.createEnclosure(user, farmId, body);
  }

  @Patch('enclosures/:enclosureId')
  @Roles('ADMIN')
  async updateEnclosure(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('enclosureId') enclosureId: string,
    @Body() body: CreateEnclosureDto
  ) {
    return this.facilitiesService.updateEnclosure(user, farmId, enclosureId, body);
  }

  @Delete('enclosures/:enclosureId')
  @Roles('ADMIN')
  async deleteEnclosure(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('enclosureId') enclosureId: string
  ) {
    return this.facilitiesService.deleteEnclosure(user, farmId, enclosureId);
  }
}
