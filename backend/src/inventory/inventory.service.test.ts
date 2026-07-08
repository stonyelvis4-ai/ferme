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
        },
        stockMovement: {
          findMany: vi.fn(async () => [
            {
              id: 'movement-1',
              stockItemId: 'stock-low',
              movementType: 'SORTIE',
              quantity: 2,
              note: null,
              movementDate: new Date('2026-07-01T10:00:00.000Z'),
              sourceModule: 'INVENTORY',
              sourceEntityType: 'STOCK_ITEM',
              sourceEntityId: 'stock-low',
              sourceEntityLabel: 'Vitamines',
              relatedLotId: null,
              relatedPlotId: null,
              relatedProductionRecordId: null,
              relatedSaleId: null,
              relatedTaskId: null,
              recordedByUser: { fullName: 'Admin' },
              farmId: 'farm-1',
              createdAt: new Date('2026-07-01T10:00:00.000Z')
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
      outOfStockCount: 1,
      criticalItemsCount: 2,
      averageAutonomyDays: expect.any(Number),
      recentMovementsCount: 1,
      outgoingQuantity30d: 2,
      incomingQuantity30d: 0
    });
    expect(response.items.map((item) => item.stockStatus)).toEqual([
      'AVAILABLE',
      'LOW',
      'OUT_OF_STOCK'
    ]);
    expect(response.items[1]?.recommendedReorderQuantity).toBe(4);
    expect(response.items[2]?.recommendedReorderQuantity).toBe(10);
    expect(response.items[1]?.categoryLabel).toBe('Medicaments');
    expect(response.movements[0]?.sourceEntityLabel).toBe('Vitamines');
  });
});
