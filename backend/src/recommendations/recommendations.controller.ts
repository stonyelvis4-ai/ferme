import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RecommendationsService } from './recommendations.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  async listRecommendations(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.recommendationsService.getFarmRecommendations(user, farmId);
  }
}
