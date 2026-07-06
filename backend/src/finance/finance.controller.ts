import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { FinanceService } from './finance.service.js';

class CreateFinancialTransactionDto {
  @IsIn(['DEPENSE', 'REVENU'])
  transactionType!: 'DEPENSE' | 'REVENU';

  @IsString()
  category!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  referenceModule?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ListFinancialTransactionsQueryDto {
  @IsOptional()
  @IsIn(['DEPENSE', 'REVENU'])
  transactionType?: 'DEPENSE' | 'REVENU';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('transactions')
  async listTransactions(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Query() query: ListFinancialTransactionsQueryDto
  ) {
    return this.financeService.listTransactions(user, farmId, query);
  }

  @Post('transactions')
  @Roles('ADMIN')
  async createTransaction(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateFinancialTransactionDto
  ) {
    return this.financeService.createTransaction(user, farmId, body);
  }

  @Patch('transactions/:transactionId')
  @Roles('ADMIN')
  async updateTransaction(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('transactionId') transactionId: string,
    @Body() body: CreateFinancialTransactionDto
  ) {
    return this.financeService.updateTransaction(user, farmId, transactionId, body);
  }

  @Delete('transactions/:transactionId')
  @Roles('ADMIN')
  async deleteTransaction(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('transactionId') transactionId: string
  ) {
    return this.financeService.deleteTransaction(user, farmId, transactionId);
  }
}
