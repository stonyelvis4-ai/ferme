import { describe, expect, it, vi } from 'vitest';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  it('returns computed stock statuses and summary stats', async () => {
    const service = new InventoryService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        stockItem: {
          findMany: vi.fn(async () => [
            {
              id: 'stock-ok',
              category: 'ALIMENTS',
              name: 'Mais',
              unit: 'kg',
              currentQuantity: 42,
              lowStockThreshold: 10
            },
            {
              id: 'stock-low',
              category: 'MEDICAMENTS',
              name: 'Vitamines',
              unit: 'flacons',
              currentQuantity: 4,
              lowStockThreshold: 8
            },
            {
              id: 'stock-out',
              category: 'SEMENCES',
              name: 'Semence riz',
              unit: 'sacs',
              currentQuantity: 0,
              lowStockThreshold: 5
            }
          ])
        }
      } as never,
      {
        syncTaskReminders: vi.fn()
      } as never
    );

    const response = await service.listStockItems(
      {
        id: 'user-1',
        email: 'admin@ferm.plus',
        fullName: 'Admin',
        role: 'ADMIN',
        assignedFarmIds: ['farm-1']
      },
      'farm-1'
    );

    expect(response.stats).toEqual({
      totalItems: 3,
      lowStockCount: 1,
      outOfStockCount: 1
    });
    expect(response.items.map((item) => item.stockStatus)).toEqual([
      'AVAILABLE',
      'LOW',
      'OUT_OF_STOCK'
    ]);
    expect(response.items[1]?.recommendedReorderQuantity).toBe(4);
    expect(response.items[2]?.recommendedReorderQuantity).toBe(10);
  });
});
