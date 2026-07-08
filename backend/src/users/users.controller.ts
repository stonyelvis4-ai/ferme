import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { SessionUser } from '../auth/auth.service.js';
import { UsersService } from './users.service.js';

class UsersQueryDto {
  @IsOptional()
  @IsString()
  farmId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', 'ADMIN', 'PROPRIETAIRE'])
  role?: string;

  @IsOptional()
  @IsIn(['ALL', 'PENDING', 'ACTIVE', 'DISABLED'])
  status?: string;
}

class CreateOwnerDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsString()
  @MinLength(3)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsArray()
  farmIds?: string[];
}

class SetUserStatusDto {
  @IsIn(['ACTIVE', 'DISABLED', 'PENDING'])
  status!: 'ACTIVE' | 'DISABLED' | 'PENDING';

  @IsOptional()
  @IsString()
  reason?: string;
}

class AssignFarmsDto {
  @IsArray()
  farmIds!: string[];
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  async listUsers(@CurrentUser() user: SessionUser, @Query() query: UsersQueryDto) {
    return this.usersService.listUsers(user, query);
  }

  @Get('users/:userId')
  async getUser(@CurrentUser() user: SessionUser, @Param('userId') userId: string) {
    return this.usersService.getUser(user, userId);
  }

  @Post('users/owners')
  async createOwner(@CurrentUser() user: SessionUser, @Body() body: CreateOwnerDto) {
    return this.usersService.createOwner(user, body);
  }

  @Patch('users/:userId/status')
  async setStatus(
    @CurrentUser() user: SessionUser,
    @Param('userId') userId: string,
    @Body() body: SetUserStatusDto
  ) {
    return this.usersService.setStatus(user, userId, body);
  }

  @Patch('users/:userId/farms')
  async assignFarms(
    @CurrentUser() user: SessionUser,
    @Param('userId') userId: string,
    @Body() body: AssignFarmsDto
  ) {
    return this.usersService.assignFarms(user, userId, body);
  }

  @Post('users/:userId/password/reset')
  async resetPassword(@CurrentUser() user: SessionUser, @Param('userId') userId: string) {
    return this.usersService.resetPassword(user, userId);
  }

  @Get('users/:userId/history')
  async getHistory(@CurrentUser() user: SessionUser, @Param('userId') userId: string) {
    return this.usersService.getLoginHistory(user, userId);
  }
}
