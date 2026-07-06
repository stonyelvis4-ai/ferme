import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SanitaryService } from './sanitary.service.js';

class CreateSanitaryEventDto {
  @IsOptional()
  @IsString()
  animalGroupId?: string;

  @IsIn(['MALADIE', 'VACCINATION', 'TRAITEMENT', 'CONSULTATION', 'MORTALITE', 'CONTROLE'])
  eventType!: 'MALADIE' | 'VACCINATION' | 'TRAITEMENT' | 'CONSULTATION' | 'MORTALITE' | 'CONTROLE';

  @IsDateString()
  eventDate!: string;

  @IsIn(['PLANIFIE', 'EN_COURS', 'TERMINE', 'CRITIQUE'])
  status!: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'CRITIQUE';

  @IsOptional()
  @IsString()
  notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/sanitary')
export class SanitaryController {
  constructor(private readonly sanitaryService: SanitaryService) {}

  @Get('events')
  async listEvents(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.sanitaryService.listEvents(user, farmId);
  }

  @Post('events')
  @Roles('ADMIN')
  async createEvent(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateSanitaryEventDto
  ) {
    return this.sanitaryService.createEvent(user, farmId, body);
  }

  @Post('calendar/sync')
  @Roles('ADMIN')
  async syncCalendar(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    await this.sanitaryService.ensureAutomaticCalendarForFarm(farmId, user.id);
    return { success: true };
  }
}
