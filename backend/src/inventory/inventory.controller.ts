import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { InventoryService } from './inventory.service.js';

class CreateStockItemDto {
  @IsIn(['ALIMENTS', 'MEDICAMENTS', 'SEMENCES', 'ENGRAIS', 'EQUIPEMENTS', 'MATERIELS'])
  category!: 'ALIMENTS' | 'MEDICAMENTS' | 'SEMENCES' | 'ENGRAIS' | 'EQUIPEMENTS' | 'MATERIELS';

  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  currentQuantity!: number;

  @IsNumber()
  @Min(0)
  lowStockThreshold!: number;
}

class CreateStockMovementDto {
  @IsString()
  stockItemId!: string;

  @IsIn(['ENTREE', 'SORTIE', 'INVENTAIRE', 'AJUSTEMENT'])
  movementType!: 'ENTREE' | 'SORTIE' | 'INVENTAIRE' | 'AJUSTEMENT';

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  async listItems(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.inventoryService.listStockItems(user, farmId);
  }

  @Post('items')
  @Roles('ADMIN')
  async createItem(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateStockItemDto
  ) {
    return this.inventoryService.createStockItem(user, farmId, body);
  }

  @Post('movements')
  @Roles('ADMIN')
  async createMovement(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateStockMovementDto
  ) {
    return this.inventoryService.createMovement(user, farmId, body);
  }
}
