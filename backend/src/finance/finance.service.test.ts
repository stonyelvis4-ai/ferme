import { describe, expect, it, vi } from 'vitest';
import { FinanceService } from './finance.service.js';

describe('FinanceService', () => {
  it('computes trend and dominant categories in the finance summary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T08:00:00.000Z'));

    const service = new FinanceService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        financialTransaction: {
          findMany: vi.fn(async () => [
            {
              id: '1',
              transactionType: 'REVENU',
              category: 'Vente oeufs',
              amount: 1200,
              transactionDate: new Date('2026-07-10T08:00:00.000Z'),
              referenceModule: null,
              notes: '',
              recordedByUser: { fullName: 'Admin' }
            },
            {
              id: '2',
              transactionType: 'DEPENSE',
              category: 'Aliment',
              amount: 300,
              transactionDate: new Date('2026-07-11T08:00:00.000Z'),
              referenceModule: null,
              notes: '',
              recordedByUser: { fullName: 'Admin' }
            },
            {
              id: '3',
              transactionType: 'DEPENSE',
              category: 'Aliment',
              amount: 150,
              transactionDate: new Date('2026-06-05T08:00:00.000Z'),
              referenceModule: null,
              notes: '',
              recordedByUser: { fullName: 'Admin' }
            }
          ])
        }
      } as never
    );

    const response = await service.listTransactions(
      {
        id: 'user-1',
        email: 'admin@ferm.plus',
        fullName: 'Admin',
        role: 'ADMIN',
        assignedFarmIds: ['farm-1']
      },
      'farm-1'
    );

    expect(response.summary.currentMonthBalance).toBe(900);
    expect(response.summary.previousMonthBalance).toBe(-150);
    expect(response.summary.topExpenseCategory).toEqual({ category: 'Aliment', amount: 450 });
    expect(response.summary.topRevenueCategory).toEqual({ category: 'Vente oeufs', amount: 1200 });

    vi.useRealTimers();
  });
});
