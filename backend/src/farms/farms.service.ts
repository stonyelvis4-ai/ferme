import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService, SessionUser } from '../auth/auth.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

const DEMO_FARM_IDS = new Set(['demo-ferme-mixte-pisciculture']);

export interface FarmRecord {
  id: string;
  name: string;
  description: string;
  location: string;
  surfaceArea: number;
  status: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';
  activityType: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
  ownerUserId: string | null;
  archivedAt: string | null;
  deactivatedAt: string | null;
  deletedAt: string | null;
}

export interface CreateFarmInput {
  name: string;
  description: string;
  location: string;
  surfaceArea: number;
  status: FarmRecord['status'];
  activityType: FarmRecord['activityType'];
  ownerUserId?: string;
}

export interface UpdateFarmInput {
  name?: string;
  description?: string;
  location?: string;
  surfaceArea?: number;
  status?: FarmRecord['status'];
  activityType?: FarmRecord['activityType'];
}

export interface FarmOwnerOption {
  id: string;
  fullName: string;
  email: string;
}

@Injectable()
export class FarmsService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  async listVisibleFarms(user: SessionUser) {
    if (user.role === 'ADMIN') {
      const farms = await this.prisma.farm.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return farms
        .filter((farm) => farm.deletedAt === null && !DEMO_FARM_IDS.has(farm.id))
        .map((farm) => this.toFarmRecord(farm));
    }

    const farms = await this.prisma.farm.findMany({
      where: {
        id: { in: user.assignedFarmIds },
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    return farms.map((farm) => this.toFarmRecord(farm));
  }

  async getFarm(user: SessionUser, farmId: string) {
    const visibleFarms = await this.listVisibleFarms(user);
    const farm = visibleFarms.find((entry) => entry.id === farmId);
    if (!farm) {
      throw new NotFoundException('Ferme introuvable');
    }

    return farm;
  }

  async createFarm(input: CreateFarmInput) {
    const resolvedOwnerId = input.ownerUserId ? input.ownerUserId : null;

    const farm = await this.prisma.farm.create({
      data: {
        name: input.name,
        description: input.description,
        location: input.location,
        surfaceArea: input.surfaceArea,
        status: input.status,
        activityType: input.activityType,
        ownerUserId: resolvedOwnerId
      }
    });

    if (farm.ownerUserId) {
      await this.authService.assignFarmToOwner(farm.ownerUserId, farm.id);
    }

    return this.toFarmRecord(farm);
  }

  async updateFarm(user: SessionUser, farmId: string, input: UpdateFarmInput) {
    await this.getFarm(user, farmId);

    const farm = await this.prisma.farm.update({
      where: { id: farmId },
      data: input
    });

    return this.toFarmRecord(farm);
  }

  async assignOwner(user: SessionUser, farmId: string, ownerUserId: string | null) {
    await this.getFarm(user, farmId);

    if (ownerUserId) {
      await this.authService.assignFarmToOwner(ownerUserId, farmId);
    } else {
      await this.prisma.farm.update({
        where: { id: farmId },
        data: { ownerUserId: null }
      });
    }

    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId }
    });

    if (!farm) {
      throw new NotFoundException('Ferme introuvable');
    }

    return this.toFarmRecord(farm);
  }

  async archiveFarm(user: SessionUser, farmId: string) {
    await this.getFarm(user, farmId);
    const farm = await this.prisma.farm.update({
      where: { id: farmId },
      data: {
        archivedAt: new Date()
      }
    });

    return this.toFarmRecord(farm);
  }

  async deactivateFarm(user: SessionUser, farmId: string) {
    await this.getFarm(user, farmId);
    const farm = await this.prisma.farm.update({
      where: { id: farmId },
      data: {
        deactivatedAt: new Date(),
        status: 'SUSPENDUE'
      }
    });

    return this.toFarmRecord(farm);
  }

  async restoreFarm(user: SessionUser, farmId: string) {
    await this.getFarm(user, farmId);
    const farm = await this.prisma.farm.update({
      where: { id: farmId },
      data: {
        archivedAt: null,
        deactivatedAt: null,
        deletedAt: null
      }
    });

    return this.toFarmRecord(farm);
  }

  async softDeleteFarm(user: SessionUser, farmId: string) {
    await this.getFarm(user, farmId);
    const farm = await this.prisma.farm.update({
      where: { id: farmId },
      data: {
        deletedAt: new Date()
      }
    });

    return this.toFarmRecord(farm);
  }

  async changeStatus(user: SessionUser, farmId: string, status: FarmRecord['status']) {
    await this.getFarm(user, farmId);
    const farm = await this.prisma.farm.update({
      where: { id: farmId },
      data: {
        status,
        deactivatedAt: status === 'SUSPENDUE' ? new Date() : null
      }
    });

    return this.toFarmRecord(farm);
  }

  async listAssignableOwners(): Promise<FarmOwnerOption[]> {
    const owners = await this.prisma.user.findMany({
      where: {
        role: 'PROPRIETAIRE',
        isActive: true
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true
      }
    });

    return owners;
  }

  private toFarmRecord(farm: {
    id: string;
    name: string;
    description: string;
    location: string;
    surfaceArea: number;
    status: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';
    activityType: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
    ownerUserId: string | null;
    archivedAt: Date | null;
    deactivatedAt: Date | null;
    deletedAt: Date | null;
  }): FarmRecord {
    return {
      id: farm.id,
      name: farm.name,
      description: farm.description,
      location: farm.location,
      surfaceArea: farm.surfaceArea,
      status: farm.status,
      activityType: farm.activityType,
      ownerUserId: farm.ownerUserId,
      archivedAt: farm.archivedAt ? farm.archivedAt.toISOString() : null,
      deactivatedAt: farm.deactivatedAt ? farm.deactivatedAt.toISOString() : null,
      deletedAt: farm.deletedAt ? farm.deletedAt.toISOString() : null
    };
  }
}
