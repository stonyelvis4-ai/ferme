import { BadRequestException, Injectable } from '@nestjs/common';
import { mortalityAlert } from '@ferm-plus/domain-rules';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { SanitaryService } from '../sanitary/sanitary.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface AnimalGroupView {
  id: string;
  trackingMode: 'INDIVIDUAL' | 'LOT';
  identificationNumber: string;
  name: string | null;
  species: string;
  subtype: string;
  breed: string;
  sex: 'MALE' | 'FEMALE' | 'MIXTE' | 'INCONNU';
  birthDate: string;
  currentAgeDays: number;
  currentWeight: number | null;
  status: 'ACTIF' | 'VENDU' | 'DECEDE';
  initialCount: number | null;
  currentCount: number | null;
}

export interface AnimalEventView {
  id: string;
  animalGroupId: string;
  eventType: 'NAISSANCE' | 'ACHAT' | 'VENTE' | 'DECES' | 'REPRODUCTION' | 'VACCINATION' | 'TRAITEMENT' | 'PESEE' | 'PRODUCTION';
  eventDate: string;
  quantity: number | null;
  weight: number | null;
  notes: string;
  recordedByUserName: string;
}

function mapAnimalGroup(group: {
  id: string;
  trackingMode: 'INDIVIDUAL' | 'LOT';
  identificationNumber: string;
  name: string | null;
  species: string;
  subtype: string;
  breed: string;
  sex: 'MALE' | 'FEMALE' | 'MIXTE' | 'INCONNU';
  birthDate: Date;
  currentAgeDays: number;
  currentWeight: number | null;
  status: 'ACTIF' | 'VENDU' | 'DECEDE';
  initialCount: number | null;
  currentCount: number | null;
}): AnimalGroupView {
  return {
    ...group,
    birthDate: group.birthDate.toISOString()
  };
}

@Injectable()
export class LivestockService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService,
    private readonly sanitaryService: SanitaryService
  ) {}

  async listAnimalGroups(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const items = await this.prisma.animalGroup.findMany({
      where: { farmId: farm.id },
      orderBy: { createdAt: 'desc' }
    });

    return {
      items: items.map(mapAnimalGroup)
    };
  }

  async createAnimalGroup(
    user: SessionUser,
    farmId: string,
    input: {
      trackingMode: AnimalGroupView['trackingMode'];
      identificationNumber: string;
      name?: string;
      species: string;
      subtype: string;
      breed: string;
      sex: AnimalGroupView['sex'];
      birthDate: string;
      currentWeight?: number;
      initialCount?: number;
      currentCount?: number;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const birthDate = new Date(input.birthDate);

    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('Date de naissance invalide');
    }

    const ageDays = Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24)));
    const defaultCount = input.trackingMode === 'LOT' ? Math.max(1, input.currentCount ?? input.initialCount ?? 1) : 1;

    const created = await this.prisma.animalGroup.create({
      data: {
        farmId: farm.id,
        trackingMode: input.trackingMode,
        identificationNumber: input.identificationNumber,
        name: input.name || null,
        species: input.species,
        subtype: input.subtype,
        breed: input.breed,
        sex: input.sex,
        birthDate,
        currentAgeDays: ageDays,
        currentWeight: input.currentWeight ?? null,
        initialCount: input.trackingMode === 'LOT' ? Math.max(1, input.initialCount ?? defaultCount) : 1,
        currentCount: input.trackingMode === 'LOT' ? defaultCount : 1
      }
    });

    await this.sanitaryService.ensureAutomaticCalendarForAnimalGroup(
      {
        farmId: farm.id,
        animalGroupId: created.id,
        identificationNumber: created.identificationNumber,
        species: created.species,
        subtype: created.subtype,
        breed: created.breed,
        birthDate: created.birthDate,
        currentAgeDays: created.currentAgeDays
      },
      user.id
    );

    return mapAnimalGroup(created);
  }

  async listAnimalEvents(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const items = await this.prisma.animalEvent.findMany({
      where: { farmId: farm.id },
      include: {
        recordedByUser: {
          select: { fullName: true }
        }
      },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
      take: 50
    });

    return {
      items: items.map((event) => ({
        id: event.id,
        animalGroupId: event.animalGroupId,
        eventType: event.eventType,
        eventDate: event.eventDate.toISOString(),
        quantity: event.quantity,
        weight: event.weight,
        notes: event.notes,
        recordedByUserName: event.recordedByUser.fullName
      }))
    };
  }

  async createAnimalEvent(
    user: SessionUser,
    farmId: string,
    input: {
      animalGroupId: string;
      eventTypes: AnimalEventView['eventType'][];
      eventDate: string;
      quantity?: number;
      weight?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const animalGroup = await this.prisma.animalGroup.findFirstOrThrow({
      where: {
        id: input.animalGroupId,
        farmId: farm.id
      }
    });
    const eventDate = new Date(input.eventDate);

    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException("Date d'evenement invalide");
    }

    if (!input.eventTypes.length) {
      throw new BadRequestException('Au moins un type est requis');
    }

    const quantity = input.quantity ?? null;
    const weight = input.weight ?? null;

    if (quantity !== null && quantity < 0) {
      throw new BadRequestException('La quantite doit etre positive');
    }

    if (weight !== null && weight < 0) {
      throw new BadRequestException('Le poids doit etre positif');
    }

    let nextCount = animalGroup.currentCount;
    let nextStatus = animalGroup.status;
    for (const eventType of input.eventTypes) {
      nextCount = this.resolveNextCount(nextCount, eventType, quantity);
      nextStatus = this.resolveNextStatus(nextStatus, eventType, nextCount);
    }
    const ageDays = Math.max(0, Math.floor((Date.now() - animalGroup.birthDate.getTime()) / (1000 * 60 * 60 * 24)));

    const events = await this.prisma.$transaction([
      ...input.eventTypes.map((eventType) =>
        this.prisma.animalEvent.create({
          data: {
            farmId: farm.id,
            animalGroupId: animalGroup.id,
            eventType,
            eventDate,
            quantity,
            weight,
            notes: input.notes?.trim() || '',
            recordedByUserId: user.id
          }
        })
      ),
      this.prisma.animalGroup.update({
        where: { id: animalGroup.id },
        data: {
          currentCount: nextCount,
          currentWeight: weight ?? animalGroup.currentWeight,
          currentAgeDays: ageDays,
          status: nextStatus
        }
      })
    ]);

    const [event] = events;

    if (input.eventTypes.includes('DECES')) {
      const alertProfile = mortalityAlert({
        species: animalGroup.species,
        quantity: quantity ?? 1,
        baselineCount: animalGroup.currentCount ?? animalGroup.initialCount ?? null,
        label: animalGroup.identificationNumber
      });

      await this.prisma.alert.create({
        data: {
          farmId: farm.id,
          priority: alertProfile.type === 'CRITICAL' ? 'URGENT' : 'HIGH',
          title: alertProfile.title,
          severity: alertProfile.type,
          message:
            animalGroup.trackingMode === 'LOT'
              ? alertProfile.message
              : `Un deces a ete enregistre pour ${animalGroup.identificationNumber}.`,
          sourceModule: 'ELEVAGE',
          sourceRecordId: event.id
        }
      });
    }

    return event;
  }

  private resolveNextCount(
    currentCount: number | null,
    eventType: AnimalEventView['eventType'],
    quantity: number | null
  ) {
    const safeCurrentCount = currentCount ?? 1;
    const delta = quantity ?? 1;

    if (eventType === 'ACHAT' || eventType === 'NAISSANCE') {
      return safeCurrentCount + delta;
    }

    if (eventType === 'VENTE' || eventType === 'DECES') {
      const nextCount = safeCurrentCount - delta;
      if (nextCount < 0) {
        throw new BadRequestException("L'evenement reduit l'effectif sous zero");
      }
      return nextCount;
    }

    return safeCurrentCount;
  }

  private resolveNextStatus(
    currentStatus: 'ACTIF' | 'VENDU' | 'DECEDE',
    eventType: AnimalEventView['eventType'],
    nextCount: number | null
  ) {
    if (eventType === 'DECES' && (nextCount ?? 0) === 0) {
      return 'DECEDE';
    }

    if (eventType === 'VENTE' && (nextCount ?? 0) === 0) {
      return 'VENDU';
    }

    if ((nextCount ?? 0) > 0) {
      return 'ACTIF';
    }

    return currentStatus;
  }
}
