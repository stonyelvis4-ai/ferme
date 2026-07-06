import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface FinancialTransactionView {
  id: string;
  transactionType: 'DEPENSE' | 'REVENU';
  category: string;
  amount: number;
  transactionDate: string;
  referenceModule: string | null;
  notes: string;
  recordedByUserName: string;
}

interface ListTransactionsFilters {
  transactionType?: FinancialTransactionView['transactionType'];
  from?: string;
  to?: string;
  category?: string;
}

function buildSummary(
  items: Array<{
    transactionType: 'DEPENSE' | 'REVENU';
    amount: number;
    category: string;
    transactionDate: Date;
  }>
) {
  const revenues = items.filter((item) => item.transactionType === 'REVENU');
  const expenses = items.filter((item) => item.transactionType === 'DEPENSE');
  const totalRevenue = revenues.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const balance = totalRevenue - totalExpense;
  const marginRate = totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0;
  const averageRevenueTicket = revenues.length ? totalRevenue / revenues.length : 0;
  const averageExpenseTicket = expenses.length ? totalExpense / expenses.length : 0;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthItems = items.filter((item) => item.transactionDate >= currentMonthStart);
  const previousMonthItems = items.filter(
    (item) => item.transactionDate >= previousMonthStart && item.transactionDate < currentMonthStart
  );
  const currentMonthRevenue = currentMonthItems
    .filter((item) => item.transactionType === 'REVENU')
    .reduce((sum, item) => sum + item.amount, 0);
  const currentMonthExpense = currentMonthItems
    .filter((item) => item.transactionType === 'DEPENSE')
    .reduce((sum, item) => sum + item.amount, 0);
  const previousMonthRevenue = previousMonthItems
    .filter((item) => item.transactionType === 'REVENU')
    .reduce((sum, item) => sum + item.amount, 0);
  const previousMonthExpense = previousMonthItems
    .filter((item) => item.transactionType === 'DEPENSE')
    .reduce((sum, item) => sum + item.amount, 0);
  const currentMonthBalance = currentMonthRevenue - currentMonthExpense;
  const previousMonthBalance = previousMonthRevenue - previousMonthExpense;
  const balanceTrend =
    previousMonthBalance === 0
      ? currentMonthBalance === 0
        ? 0
        : 100
      : ((currentMonthBalance - previousMonthBalance) / Math.abs(previousMonthBalance)) * 100;

  const topExpenseCategory = aggregateTopCategory(expenses);
  const topRevenueCategory = aggregateTopCategory(revenues);

  return {
    totalRevenue,
    totalExpense,
    balance,
    marginRate,
    averageRevenueTicket,
    averageExpenseTicket,
    currentMonthRevenue,
    currentMonthExpense,
    currentMonthBalance,
    previousMonthBalance,
    balanceTrend,
    topExpenseCategory,
    topRevenueCategory
  };
}

function aggregateTopCategory(items: Array<{ category: string; amount: number }>) {
  if (!items.length) {
    return null;
  }

  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  }

  const [category, amount] =
    [...totals.entries()].sort((left, right) => right[1] - left[1])[0] ?? [null, null];

  if (!category || amount === null) {
    return null;
  }

  return { category, amount };
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async listTransactions(user: SessionUser, farmId: string, filters: ListTransactionsFilters = {}) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const where = this.buildTransactionWhereClause(farm.id, filters);
    const items = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        recordedByUser: {
          select: { fullName: true }
        }
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
    });

    return {
      items: items.map((item) => this.toFinancialTransactionView(item)),
      summary: buildSummary(items)
    };
  }

  async createTransaction(
    user: SessionUser,
    farmId: string,
    input: {
      transactionType: FinancialTransactionView['transactionType'];
      category: string;
      amount: number;
      transactionDate: string;
      referenceModule?: string;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const normalizedInput = this.normalizeTransactionInput(input);

    const created = await this.prisma.financialTransaction.create({
      data: {
        farmId: farm.id,
        transactionType: normalizedInput.transactionType,
        category: normalizedInput.category,
        amount: normalizedInput.amount,
        transactionDate: normalizedInput.transactionDate,
        referenceModule: normalizedInput.referenceModule,
        notes: normalizedInput.notes,
        recordedByUserId: user.id
      },
      include: {
        recordedByUser: {
          select: { fullName: true }
        }
      }
    });

    const summary = await this.listTransactions(user, farmId);
    await this.syncBalanceAlert(farm.id, summary.summary.balance);

    return this.toFinancialTransactionView(created);
  }

  async updateTransaction(
    user: SessionUser,
    farmId: string,
    transactionId: string,
    input: {
      transactionType: FinancialTransactionView['transactionType'];
      category: string;
      amount: number;
      transactionDate: string;
      referenceModule?: string;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const existing = await this.prisma.financialTransaction.findFirst({
      where: {
        id: transactionId,
        farmId: farm.id
      }
    });

    if (!existing) {
      throw new NotFoundException('Transaction introuvable');
    }

    const normalizedInput = this.normalizeTransactionInput(input);
    const updated = await this.prisma.financialTransaction.update({
      where: { id: existing.id },
      data: {
        transactionType: normalizedInput.transactionType,
        category: normalizedInput.category,
        amount: normalizedInput.amount,
        transactionDate: normalizedInput.transactionDate,
        referenceModule: normalizedInput.referenceModule,
        notes: normalizedInput.notes
      },
      include: {
        recordedByUser: {
          select: { fullName: true }
        }
      }
    });

    const summary = await this.listTransactions(user, farmId);
    await this.syncBalanceAlert(farm.id, summary.summary.balance);

    return this.toFinancialTransactionView(updated);
  }

  async deleteTransaction(user: SessionUser, farmId: string, transactionId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const existing = await this.prisma.financialTransaction.findFirst({
      where: {
        id: transactionId,
        farmId: farm.id
      }
    });

    if (!existing) {
      throw new NotFoundException('Transaction introuvable');
    }

    await this.prisma.financialTransaction.delete({
      where: { id: existing.id }
    });

    const summary = await this.listTransactions(user, farmId);
    await this.syncBalanceAlert(farm.id, summary.summary.balance);

    return { success: true as const };
  }

  private buildTransactionWhereClause(farmId: string, filters: ListTransactionsFilters) {
    const where: {
      farmId: string;
      transactionType?: FinancialTransactionView['transactionType'];
      category?: { contains: string; mode: 'insensitive' };
      transactionDate?: { gte?: Date; lte?: Date };
    } = { farmId };

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.category?.trim()) {
      where.category = {
        contains: filters.category.trim(),
        mode: 'insensitive'
      };
    }

    const dateRange: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      const from = new Date(filters.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('Date de debut invalide');
      }
      dateRange.gte = from;
    }

    if (filters.to) {
      const to = new Date(filters.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('Date de fin invalide');
      }
      to.setHours(23, 59, 59, 999);
      dateRange.lte = to;
    }

    if (dateRange.gte || dateRange.lte) {
      where.transactionDate = dateRange;
    }

    return where;
  }

  private normalizeTransactionInput(input: {
    transactionType: FinancialTransactionView['transactionType'];
    category: string;
    amount: number;
    transactionDate: string;
    referenceModule?: string;
    notes?: string;
  }) {
    const transactionDate = new Date(input.transactionDate);

    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException('Date de transaction invalide');
    }

    if (input.amount <= 0) {
      throw new BadRequestException('Le montant doit etre strictement positif');
    }

    const category = input.category.trim();
    if (!category) {
      throw new BadRequestException('La categorie est obligatoire');
    }

    return {
      transactionType: input.transactionType,
      category,
      amount: input.amount,
      transactionDate,
      referenceModule: input.referenceModule?.trim() || null,
      notes: input.notes?.trim() || ''
    };
  }

  private async syncBalanceAlert(farmId: string, balance: number) {
    const existingAlert = await this.prisma.alert.findFirst({
      where: {
        farmId,
        sourceModule: 'FINANCES',
        sourceRecordId: 'BALANCE'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (balance < 0) {
      const priority: 'URGENT' | 'HIGH' = balance < -1000 ? 'URGENT' : 'HIGH';
      const severity: 'CRITICAL' | 'WARNING' = balance < -1000 ? 'CRITICAL' : 'WARNING';
      const data = {
        priority,
        status: 'NEW' as const,
        title: 'Perte financiere detectee',
        severity,
        message: `Le solde financier actuel est de ${balance.toFixed(2)}.`,
        dueAt: new Date(),
        resolvedAt: null,
        ignoredAt: null,
        acknowledgedAt: null,
        readAt: null
      };

      if (existingAlert) {
        await this.prisma.alert.update({
          where: { id: existingAlert.id },
          data
        });
        return;
      }

      await this.prisma.alert.create({
        data: {
          farmId,
          sourceModule: 'FINANCES',
          sourceRecordId: 'BALANCE',
          ...data
        }
      });
      return;
    }

    if (existingAlert && existingAlert.status !== 'RESOLVED') {
      await this.prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      });
    }
  }

  private toFinancialTransactionView(item: {
    id: string;
    transactionType: FinancialTransactionView['transactionType'];
    category: string;
    amount: number;
    transactionDate: Date;
    referenceModule: string | null;
    notes: string;
    recordedByUser: { fullName: string };
  }): FinancialTransactionView {
    return {
      id: item.id,
      transactionType: item.transactionType,
      category: item.category,
      amount: item.amount,
      transactionDate: item.transactionDate.toISOString(),
      referenceModule: item.referenceModule,
      notes: item.notes,
      recordedByUserName: item.recordedByUser.fullName
    };
  }
}
