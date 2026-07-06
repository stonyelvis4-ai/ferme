import { BadRequestException, Injectable } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface PlotView {
  id: string;
  name: string;
  location: string | null;
  surfaceArea: number;
  soilType: string | null;
  irrigationType: string | null;
  status: 'AVAILABLE' | 'CULTIVATED' | 'RESTING' | 'MAINTENANCE';
  notes: string | null;
  activeCropCount: number;
}

export interface CropView {
  id: string;
  plotId: string;
  plotName: string;
  name: string;
  variety: string | null;
  cultivatedArea: number;
  cycleLabel: string | null;
  plantedAt: string;
  expectedHarvestAt: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
  expectedYield: number | null;
  actualYield: number | null;
  notes: string | null;
}

export interface CropOperationView {
  id: string;
  cropId: string;
  cropName: string;
  plotName: string | null;
  operationType: 'PREPARATION_SOL' | 'SEMIS' | 'IRRIGATION' | 'FERTILISATION' | 'TRAITEMENT' | 'DESHERBAGE' | 'ENTRETIEN' | 'RECOLTE';
  status: 'PLANNED' | 'COMPLETED' | 'CANCELED';
  performedAt: string;
  quantity: number | null;
  unit: string | null;
  cost: number | null;
  notes: string | null;
  createdByUserName: string;
}

export interface HarvestView {
  id: string;
  cropId: string;
  cropName: string;
  plotName: string | null;
  harvestedAt: string;
  quantity: number;
  unit: string;
  quality: 'EXCELLENT' | 'BONNE' | 'MOYENNE' | 'FAIBLE' | null;
  revenue: number | null;
  notes: string | null;
  createdByUserName: string;
}

@Injectable()
export class CropsService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async listPlots(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const items = await this.prisma.plot.findMany({
      where: { farmId: farm.id },
      include: {
        crops: {
          where: {
            status: {
              in: ['PLANNED', 'ACTIVE']
            }
          },
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      items: items.map((plot) => ({
        id: plot.id,
        name: plot.name,
        location: plot.location,
        surfaceArea: plot.surfaceArea,
        soilType: plot.soilType,
        irrigationType: plot.irrigationType,
        status: plot.status,
        notes: plot.notes,
        activeCropCount: plot.crops.length
      })),
      stats: {
        totalPlots: items.length,
        totalSurfaceArea: items.reduce((sum, plot) => sum + plot.surfaceArea, 0),
        cultivatedPlots: items.filter((plot) => plot.status === 'CULTIVATED').length,
        restingPlots: items.filter((plot) => plot.status === 'RESTING').length
      }
    };
  }

  async createPlot(
    user: SessionUser,
    farmId: string,
    input: {
      name: string;
      location?: string;
      surfaceArea: number;
      soilType?: string;
      irrigationType?: string;
      status: PlotView['status'];
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);

    return this.prisma.plot.create({
      data: {
        farmId: farm.id,
        name: input.name,
        location: input.location?.trim() || null,
        surfaceArea: input.surfaceArea,
        soilType: input.soilType?.trim() || null,
        irrigationType: input.irrigationType?.trim() || null,
        status: input.status,
        notes: input.notes?.trim() || null
      }
    });
  }

  async listCrops(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const [crops, operations, harvests] = await Promise.all([
      this.prisma.crop.findMany({
        where: { farmId: farm.id },
        include: {
          plot: {
            select: { name: true }
          }
        },
        orderBy: [{ status: 'asc' }, { plantedAt: 'desc' }]
      }),
      this.prisma.cropOperation.findMany({
        where: { farmId: farm.id },
        include: {
          crop: { select: { name: true } },
          plot: { select: { name: true } },
          createdByUser: { select: { fullName: true } }
        },
        orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
        take: 25
      }),
      this.prisma.harvest.findMany({
        where: { farmId: farm.id },
        include: {
          crop: { select: { name: true } },
          plot: { select: { name: true } },
          createdByUser: { select: { fullName: true } }
        },
        orderBy: [{ harvestedAt: 'desc' }, { createdAt: 'desc' }],
        take: 25
      })
    ]);

    return {
      items: crops.map((crop) => ({
        id: crop.id,
        plotId: crop.plotId,
        plotName: crop.plot.name,
        name: crop.name,
        variety: crop.variety,
        cultivatedArea: crop.cultivatedArea,
        cycleLabel: crop.cycleLabel,
        plantedAt: crop.plantedAt.toISOString(),
        expectedHarvestAt: crop.expectedHarvestAt ? crop.expectedHarvestAt.toISOString() : null,
        status: crop.status,
        expectedYield: crop.expectedYield,
        actualYield: crop.actualYield,
        notes: crop.notes
      })),
      operations: operations.map((operation) => ({
        id: operation.id,
        cropId: operation.cropId,
        cropName: operation.crop.name,
        plotName: operation.plot?.name ?? null,
        operationType: operation.operationType,
        status: operation.status,
        performedAt: operation.performedAt.toISOString(),
        quantity: operation.quantity,
        unit: operation.unit,
        cost: operation.cost,
        notes: operation.notes,
        createdByUserName: operation.createdByUser.fullName
      })),
      harvests: harvests.map((harvest) => ({
        id: harvest.id,
        cropId: harvest.cropId,
        cropName: harvest.crop.name,
        plotName: harvest.plot?.name ?? null,
        harvestedAt: harvest.harvestedAt.toISOString(),
        quantity: harvest.quantity,
        unit: harvest.unit,
        quality: harvest.quality,
        revenue: harvest.revenue,
        notes: harvest.notes,
        createdByUserName: harvest.createdByUser.fullName
      })),
      stats: {
        totalCrops: crops.length,
        activeCrops: crops.filter((crop) => crop.status === 'ACTIVE').length,
        plannedCrops: crops.filter((crop) => crop.status === 'PLANNED').length,
        harvestedCrops: crops.filter((crop) => crop.status === 'HARVESTED').length,
        cultivatedArea: crops.reduce((sum, crop) => sum + crop.cultivatedArea, 0),
        expectedYield: crops.reduce((sum, crop) => sum + (crop.expectedYield ?? 0), 0),
        actualYield: crops.reduce((sum, crop) => sum + (crop.actualYield ?? 0), 0),
        totalHarvestRevenue: harvests.reduce((sum, harvest) => sum + (harvest.revenue ?? 0), 0)
      }
    };
  }

  async createCrop(
    user: SessionUser,
    farmId: string,
    input: {
      plotId: string;
      name: string;
      variety?: string;
      cultivatedArea: number;
      cycleLabel?: string;
      plantedAt: string;
      expectedHarvestAt?: string;
      status: CropView['status'];
      expectedYield?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const plot = await this.prisma.plot.findFirstOrThrow({
      where: {
        id: input.plotId,
        farmId: farm.id
      }
    });

    const plantedAt = new Date(input.plantedAt);
    const expectedHarvestAt = input.expectedHarvestAt ? new Date(input.expectedHarvestAt) : null;

    if (Number.isNaN(plantedAt.getTime())) {
      throw new BadRequestException('Date de plantation invalide');
    }

    if (expectedHarvestAt && Number.isNaN(expectedHarvestAt.getTime())) {
      throw new BadRequestException('Date de recolte prevue invalide');
    }

    if (input.cultivatedArea > plot.surfaceArea) {
      throw new BadRequestException('La superficie cultivee depasse la taille de la parcelle');
    }

    const [crop] = await this.prisma.$transaction([
      this.prisma.crop.create({
        data: {
          farmId: farm.id,
          plotId: plot.id,
          name: input.name,
          variety: input.variety?.trim() || null,
          cultivatedArea: input.cultivatedArea,
          cycleLabel: input.cycleLabel?.trim() || null,
          plantedAt,
          expectedHarvestAt,
          status: input.status,
          expectedYield: input.expectedYield ?? null,
          notes: input.notes?.trim() || null
        }
      }),
      this.prisma.plot.update({
        where: { id: plot.id },
        data: {
          status: 'CULTIVATED'
        }
      })
    ]);

    return crop;
  }

  async createOperation(
    user: SessionUser,
    farmId: string,
    input: {
      cropId: string;
      operationType: CropOperationView['operationType'];
      status: CropOperationView['status'];
      performedAt: string;
      quantity?: number;
      unit?: string;
      cost?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const crop = await this.prisma.crop.findFirstOrThrow({
      where: {
        id: input.cropId,
        farmId: farm.id
      }
    });

    const performedAt = new Date(input.performedAt);
    if (Number.isNaN(performedAt.getTime())) {
      throw new BadRequestException("Date d'operation invalide");
    }

    return this.prisma.cropOperation.create({
      data: {
        farmId: farm.id,
        cropId: crop.id,
        plotId: crop.plotId,
        operationType: input.operationType,
        status: input.status,
        performedAt,
        quantity: input.quantity ?? null,
        unit: input.unit?.trim() || null,
        cost: input.cost ?? null,
        notes: input.notes?.trim() || null,
        createdByUserId: user.id
      }
    });
  }

  async createHarvest(
    user: SessionUser,
    farmId: string,
    input: {
      cropId: string;
      harvestedAt: string;
      quantity: number;
      unit: string;
      quality?: HarvestView['quality'];
      revenue?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const crop = await this.prisma.crop.findFirstOrThrow({
      where: {
        id: input.cropId,
        farmId: farm.id
      }
    });

    const harvestedAt = new Date(input.harvestedAt);
    if (Number.isNaN(harvestedAt.getTime())) {
      throw new BadRequestException('Date de recolte invalide');
    }

    const totalHarvestedQuantity = await this.prisma.harvest.aggregate({
      where: {
        farmId: farm.id,
        cropId: crop.id
      },
      _sum: {
        quantity: true
      }
    });

    const nextYield = (totalHarvestedQuantity._sum.quantity ?? 0) + input.quantity;

    const [harvest] = await this.prisma.$transaction([
      this.prisma.harvest.create({
        data: {
          farmId: farm.id,
          cropId: crop.id,
          plotId: crop.plotId,
          harvestedAt,
          quantity: input.quantity,
          unit: input.unit,
          quality: input.quality ?? null,
          revenue: input.revenue ?? null,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      }),
      this.prisma.crop.update({
        where: { id: crop.id },
        data: {
          actualYield: nextYield,
          status: nextYield > 0 ? 'HARVESTED' : crop.status
        }
      })
    ]);

    return harvest;
  }
}
