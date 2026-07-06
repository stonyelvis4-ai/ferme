import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { LivestockService } from './livestock.service.js';

class CreateAnimalGroupDto {
  @IsIn(['INDIVIDUAL', 'LOT'])
  trackingMode!: 'INDIVIDUAL' | 'LOT';

  @IsString()
  identificationNumber!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  species!: string;

  @IsString()
  subtype!: string;

  @IsString()
  breed!: string;

  @IsIn(['MALE', 'FEMALE', 'MIXTE', 'INCONNU'])
  sex!: 'MALE' | 'FEMALE' | 'MIXTE' | 'INCONNU';

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  initialCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  currentCount?: number;
}

class CreateAnimalEventDto {
  @IsString()
  animalGroupId!: string;

  @IsArray()
  @IsIn(['NAISSANCE', 'ACHAT', 'VENTE', 'DECES', 'REPRODUCTION', 'VACCINATION', 'TRAITEMENT', 'PESEE', 'PRODUCTION'], {
    each: true
  })
  eventTypes!: Array<
    'NAISSANCE' | 'ACHAT' | 'VENTE' | 'DECES' | 'REPRODUCTION' | 'VACCINATION' | 'TRAITEMENT' | 'PESEE' | 'PRODUCTION'
  >;

  @IsDateString()
  eventDate!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/livestock')
export class LivestockController {
  constructor(private readonly livestockService: LivestockService) {}

  @Get('animals')
  async listAnimals(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.livestockService.listAnimalGroups(user, farmId);
  }

  @Post('animals')
  @Roles('ADMIN')
  async createAnimal(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateAnimalGroupDto
  ) {
    return this.livestockService.createAnimalGroup(user, farmId, body);
  }

  @Get('events')
  async listEvents(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.livestockService.listAnimalEvents(user, farmId);
  }

  @Post('events')
  @Roles('ADMIN')
  async createEvent(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateAnimalEventDto
  ) {
    return this.livestockService.createAnimalEvent(user, farmId, body);
  }
}
