import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CropsService } from './crops.service.js';

class CreatePlotDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNumber()
  @Min(0.1)
  surfaceArea!: number;

  @IsOptional()
  @IsString()
  soilType?: string;

  @IsOptional()
  @IsString()
  irrigationType?: string;

  @IsIn(['AVAILABLE', 'CULTIVATED', 'RESTING', 'MAINTENANCE'])
  status!: 'AVAILABLE' | 'CULTIVATED' | 'RESTING' | 'MAINTENANCE';

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateCropDto {
  @IsString()
  plotId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsNumber()
  @Min(0.1)
  cultivatedArea!: number;

  @IsOptional()
  @IsString()
  cycleLabel?: string;

  @IsDateString()
  plantedAt!: string;

  @IsOptional()
  @IsDateString()
  expectedHarvestAt?: string;

  @IsIn(['PLANNED', 'ACTIVE', 'HARVESTED', 'ARCHIVED'])
  status!: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedYield?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateCropOperationDto {
  @IsString()
  cropId!: string;

  @IsIn(['PREPARATION_SOL', 'SEMIS', 'IRRIGATION', 'FERTILISATION', 'TRAITEMENT', 'DESHERBAGE', 'ENTRETIEN', 'RECOLTE'])
  operationType!: 'PREPARATION_SOL' | 'SEMIS' | 'IRRIGATION' | 'FERTILISATION' | 'TRAITEMENT' | 'DESHERBAGE' | 'ENTRETIEN' | 'RECOLTE';

  @IsIn(['PLANNED', 'COMPLETED', 'CANCELED'])
  status!: 'PLANNED' | 'COMPLETED' | 'CANCELED';

  @IsDateString()
  performedAt!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateHarvestDto {
  @IsString()
  cropId!: string;

  @IsDateString()
  harvestedAt!: string;

  @IsNumber()
  @Min(0.1)
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsIn(['EXCELLENT', 'BONNE', 'MOYENNE', 'FAIBLE'])
  quality?: 'EXCELLENT' | 'BONNE' | 'MOYENNE' | 'FAIBLE';

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get('plots')
  async listPlots(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.cropsService.listPlots(user, farmId);
  }

  @Post('plots')
  @Roles('ADMIN')
  async createPlot(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreatePlotDto
  ) {
    return this.cropsService.createPlot(user, farmId, body);
  }

  @Get('crops')
  async listCrops(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.cropsService.listCrops(user, farmId);
  }

  @Post('crops')
  @Roles('ADMIN')
  async createCrop(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateCropDto
  ) {
    return this.cropsService.createCrop(user, farmId, body);
  }

  @Post('crops/operations')
  @Roles('ADMIN')
  async createOperation(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateCropOperationDto
  ) {
    return this.cropsService.createOperation(user, farmId, body);
  }

  @Post('crops/harvests')
  @Roles('ADMIN')
  async createHarvest(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateHarvestDto
  ) {
    return this.cropsService.createHarvest(user, farmId, body);
  }
}
