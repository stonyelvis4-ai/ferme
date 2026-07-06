import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FacilitiesService } from './facilities.service.js';

describe('FacilitiesService', () => {
  const sessionUser = {
    id: 'user-1',
    email: 'admin@ferm.plus',
    fullName: 'Admin',
    role: 'ADMIN' as const,
    assignedFarmIds: ['farm-1']
  };

  it('returns overview stats for buildings and enclosures', async () => {
    const service = new FacilitiesService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        building: {
          findMany: vi.fn(async () => [
            {
              id: 'b1',
              name: 'Poulailler Nord',
              buildingType: 'POULAILLER',
              capacity: 120,
              assignedTo: 'Pondeuses',
              conditionLabel: 'Bon etat',
              status: 'OPERATIONNEL',
              notes: null
            },
            {
              id: 'b2',
              name: 'Magasin central',
              buildingType: 'MAGASIN',
              capacity: 30,
              assignedTo: null,
              conditionLabel: 'Controle',
              status: 'MAINTENANCE',
              notes: null
            }
          ])
        },
        enclosure: {
          findMany: vi.fn(async () => [
            {
              id: 'e1',
              name: 'Parc 1',
              enclosureType: 'PATURAGE',
              capacity: 50,
              assignedTo: 'Ovins',
              conditionLabel: 'Clos',
              status: 'OPERATIONNEL',
              notes: null
            }
          ])
        }
      } as never
    );

    const response = await service.getFacilityOverview(sessionUser, 'farm-1');

    expect(response.stats).toEqual({
      totalBuildings: 2,
      totalEnclosures: 1,
      operationalCount: 2,
      maintenanceCount: 1,
      totalCapacity: 200
    });
  });

  it('trims fields when updating a building', async () => {
    const update = vi.fn(async ({ data }) => ({
      id: 'building-1',
      ...data
    }));

    const service = new FacilitiesService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        building: {
          findFirst: vi.fn(async () => ({ id: 'building-1', farmId: 'farm-1' })),
          update
        }
      } as never
    );

    await service.updateBuilding(sessionUser, 'farm-1', 'building-1', {
      name: '  Nouveau bassin  ',
      buildingType: 'BASSIN',
      capacity: 80,
      assignedTo: '  Pisciculture  ',
      conditionLabel: '  Controle eau  ',
      status: 'OPERATIONNEL',
      notes: '  suivi renforce  '
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Nouveau bassin',
          assignedTo: 'Pisciculture',
          conditionLabel: 'Controle eau',
          notes: 'suivi renforce'
        })
      })
    );
  });

  it('throws when deleting an unknown enclosure', async () => {
    const service = new FacilitiesService(
      {
        getFarm: vi.fn(async () => ({ id: 'farm-1' }))
      } as never,
      {
        enclosure: {
          findFirst: vi.fn(async () => null)
        }
      } as never
    );

    await expect(service.deleteEnclosure(sessionUser, 'farm-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
