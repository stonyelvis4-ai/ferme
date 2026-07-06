import { Injectable, NotFoundException } from '@nestjs/common';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface BuildingView {
  id: string;
  name: string;
  buildingType: 'POULAILLER' | 'ETABLE' | 'BERGERIE' | 'PORCHERIE' | 'BASSIN' | 'HANGAR' | 'MAGASIN';
  capacity: number | null;
  assignedTo: string | null;
  conditionLabel: string | null;
  status: 'OPERATIONNEL' | 'MAINTENANCE' | 'INACTIF' | 'SATURATED';
  notes: string | null;
}

export interface EnclosureView {
  id: string;
  name: string;
  enclosureType: 'ENCLOS_GENERIC' | 'PATURAGE' | 'PARC_ISOLE' | 'BASSIN_OUVERT';
  capacity: number | null;
  assignedTo: string | null;
  conditionLabel: string | null;
  status: 'OPERATIONNEL' | 'MAINTENANCE' | 'INACTIF' | 'SATURATED';
  notes: string | null;
}

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async getFacilityOverview(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const [buildings, enclosures] = await Promise.all([
      this.prisma.building.findMany({
        where: { farmId: farm.id },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.enclosure.findMany({
        where: { farmId: farm.id },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      buildings: buildings.map((building) => ({
        id: building.id,
        name: building.name,
        buildingType: building.buildingType,
        capacity: building.capacity,
        assignedTo: building.assignedTo,
        conditionLabel: building.conditionLabel,
        status: building.status,
        notes: building.notes
      })),
      enclosures: enclosures.map((enclosure) => ({
        id: enclosure.id,
        name: enclosure.name,
        enclosureType: enclosure.enclosureType,
        capacity: enclosure.capacity,
        assignedTo: enclosure.assignedTo,
        conditionLabel: enclosure.conditionLabel,
        status: enclosure.status,
        notes: enclosure.notes
      })),
      stats: {
        totalBuildings: buildings.length,
        totalEnclosures: enclosures.length,
        operationalCount:
          buildings.filter((item) => item.status === 'OPERATIONNEL').length +
          enclosures.filter((item) => item.status === 'OPERATIONNEL').length,
        maintenanceCount:
          buildings.filter((item) => item.status === 'MAINTENANCE').length +
          enclosures.filter((item) => item.status === 'MAINTENANCE').length,
        totalCapacity:
          buildings.reduce((sum, item) => sum + (item.capacity ?? 0), 0) +
          enclosures.reduce((sum, item) => sum + (item.capacity ?? 0), 0)
      }
    };
  }

  async createBuilding(
    user: SessionUser,
    farmId: string,
    input: {
      name: string;
      buildingType: BuildingView['buildingType'];
      capacity?: number;
      assignedTo?: string;
      conditionLabel?: string;
      status: BuildingView['status'];
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);

    return this.prisma.building.create({
      data: this.toBuildingCreateData(farm.id, input)
    });
  }

  async updateBuilding(
    user: SessionUser,
    farmId: string,
    buildingId: string,
    input: {
      name: string;
      buildingType: BuildingView['buildingType'];
      capacity?: number;
      assignedTo?: string;
      conditionLabel?: string;
      status: BuildingView['status'];
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    await this.ensureBuilding(farm.id, buildingId);

    return this.prisma.building.update({
      where: { id: buildingId },
      data: this.toBuildingUpdateData(input)
    });
  }

  async deleteBuilding(user: SessionUser, farmId: string, buildingId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    await this.ensureBuilding(farm.id, buildingId);

    await this.prisma.building.delete({
      where: { id: buildingId }
    });

    return { success: true };
  }

  async createEnclosure(
    user: SessionUser,
    farmId: string,
    input: {
      name: string;
      enclosureType: EnclosureView['enclosureType'];
      capacity?: number;
      assignedTo?: string;
      conditionLabel?: string;
      status: EnclosureView['status'];
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);

    return this.prisma.enclosure.create({
      data: this.toEnclosureCreateData(farm.id, input)
    });
  }

  async updateEnclosure(
    user: SessionUser,
    farmId: string,
    enclosureId: string,
    input: {
      name: string;
      enclosureType: EnclosureView['enclosureType'];
      capacity?: number;
      assignedTo?: string;
      conditionLabel?: string;
      status: EnclosureView['status'];
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    await this.ensureEnclosure(farm.id, enclosureId);

    return this.prisma.enclosure.update({
      where: { id: enclosureId },
      data: this.toEnclosureUpdateData(input)
    });
  }

  async deleteEnclosure(user: SessionUser, farmId: string, enclosureId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    await this.ensureEnclosure(farm.id, enclosureId);

    await this.prisma.enclosure.delete({
      where: { id: enclosureId }
    });

    return { success: true };
  }

  private toBuildingCreateData(
    farmId: string,
    input: {
      name: string;
      buildingType: BuildingView['buildingType'];
      capacity?: number;
      assignedTo?: string;
      conditionLabel?: string;
      status: BuildingView['status'];
      notes?: string;
    }
  ) {
    return {
      farmId,
      ...this.toBuildingUpdateData(input)
    };
  }

  private toBuildingUpdateData(input: {
    name: string;
    buildingType: BuildingView['buildingType'];
    capacity?: number;
    assignedTo?: string;
    conditionLabel?: string;
    status: BuildingView['status'];
    notes?: string;
  }) {
    return {
      name: input.name.trim(),
      buildingType: input.buildingType,
      capacity: input.capacity ?? null,
      assignedTo: input.assignedTo?.trim() || null,
      conditionLabel: input.conditionLabel?.trim() || null,
      status: input.status,
      notes: input.notes?.trim() || null
    };
  }

  private toEnclosureCreateData(
    farmId: string,
    input: {
      name: string;
      enclosureType: EnclosureView['enclosureType'];
      capacity?: number;
      assignedTo?: string;
      conditionLabel?: string;
      status: EnclosureView['status'];
      notes?: string;
    }
  ) {
    return {
      farmId,
      ...this.toEnclosureUpdateData(input)
    };
  }

  private toEnclosureUpdateData(input: {
    name: string;
    enclosureType: EnclosureView['enclosureType'];
    capacity?: number;
    assignedTo?: string;
    conditionLabel?: string;
    status: EnclosureView['status'];
    notes?: string;
  }) {
    return {
      name: input.name.trim(),
      enclosureType: input.enclosureType,
      capacity: input.capacity ?? null,
      assignedTo: input.assignedTo?.trim() || null,
      conditionLabel: input.conditionLabel?.trim() || null,
      status: input.status,
      notes: input.notes?.trim() || null
    };
  }

  private async ensureBuilding(farmId: string, buildingId: string) {
    const building = await this.prisma.building.findFirst({
      where: {
        id: buildingId,
        farmId
      }
    });

    if (!building) {
      throw new NotFoundException('Batiment introuvable');
    }

    return building;
  }

  private async ensureEnclosure(farmId: string, enclosureId: string) {
    const enclosure = await this.prisma.enclosure.findFirst({
      where: {
        id: enclosureId,
        farmId
      }
    });

    if (!enclosure) {
      throw new NotFoundException('Enclos introuvable');
    }

    return enclosure;
  }
}
