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
import { ProductionService } from './production.service.js';

class CreateEggProductionDto {
  @IsString()
  animalGroupId!: string;

  @IsDateString()
  productionDate!: string;

  @IsNumber()
  @Min(1)
  currentHeadcount!: number;

  @IsNumber()
  @Min(0)
  eggsProduced!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eggsBroken?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eggsDirty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eggsLost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mortalityToday?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feedConsumed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feedCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateFishGrowthDto {
  @IsOptional()
  @IsString()
  animalGroupId?: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  enclosureId?: string;

  @IsString()
  species!: string;

  @IsDateString()
  stockingDate!: string;

  @IsDateString()
  productionDate!: string;

  @IsNumber()
  @Min(1)
  initialFingerlings!: number;

  @IsNumber()
  @Min(0)
  initialAverageWeight!: number;

  @IsNumber()
  @Min(0)
  currentAverageWeight!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mortality?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feedDistributed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feedCost?: number;

  @IsOptional()
  @IsString()
  waterQuality?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  oxygen?: number;

  @IsOptional()
  @IsNumber()
  ph?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateFishHarvestDto {
  @IsOptional()
  @IsString()
  animalGroupId?: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  enclosureId?: string;

  @IsDateString()
  harvestedAt!: string;

  @IsNumber()
  @Min(0.01)
  totalWeight!: number;

  @IsNumber()
  @Min(1)
  fishCount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  losses?: number;

  @IsNumber()
  @Min(0)
  sellableQuantity!: number;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateCropHarvestProductionDto {
  @IsString()
  cropId!: string;

  @IsDateString()
  harvestedAt!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  losses?: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsIn(['EXCELLENT', 'BONNE', 'MOYENNE', 'FAIBLE'])
  quality?: 'EXCELLENT' | 'BONNE' | 'MOYENNE' | 'FAIBLE';

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateProductSaleDto {
  @IsString()
  stockId!: string;

  @IsNumber()
  @Min(0.01)
  quantitySold!: number;

  @IsNumber()
  @Min(0.01)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  amountPaid!: number;

  @IsIn(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'CREDIT', 'OTHER'])
  paymentMethod!: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD' | 'CREDIT' | 'OTHER';

  @IsString()
  customerName!: string;

  @IsDateString()
  saleDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class AddSalePaymentDto {
  @IsDateString()
  paymentDate!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'CREDIT', 'OTHER'])
  paymentMethod!: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD' | 'CREDIT' | 'OTHER';

  @IsOptional()
  @IsString()
  note?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  async getOverview(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.productionService.getProductionOverview(user, farmId);
  }

  @Post('eggs')
  @Roles('ADMIN')
  async createEggProduction(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateEggProductionDto
  ) {
    return this.productionService.createEggProduction(user, farmId, body);
  }

  @Post('fish-growth')
  @Roles('ADMIN')
  async createFishGrowth(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateFishGrowthDto
  ) {
    return this.productionService.createFishGrowthRecord(user, farmId, body);
  }

  @Post('fish-harvests')
  @Roles('ADMIN')
  async createFishHarvest(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateFishHarvestDto
  ) {
    return this.productionService.createFishHarvest(user, farmId, body);
  }

  @Post('crop-harvests')
  @Roles('ADMIN')
  async createCropHarvest(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateCropHarvestProductionDto
  ) {
    return this.productionService.createCropHarvestProduction(user, farmId, body);
  }

  @Post('sales')
  @Roles('ADMIN')
  async createSale(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateProductSaleDto
  ) {
    return this.productionService.createSale(user, farmId, body);
  }

  @Post('sales/:saleId/payments')
  @Roles('ADMIN')
  async addSalePayment(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('saleId') saleId: string,
    @Body() body: AddSalePaymentDto
  ) {
    return this.productionService.addSalePayment(user, farmId, saleId, body);
  }
}
