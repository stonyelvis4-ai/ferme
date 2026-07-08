import { BadRequestException, Injectable } from '@nestjs/common';
import { mortalityAlert } from '@ferm-plus/domain-rules';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';
import { ReminderService } from '../notifications/reminder.service.js';

type ProductionType = 'EGGS' | 'FISH_GROWTH' | 'FISH_HARVEST' | 'CROP_HARVEST' | 'GENERAL';
type ProductionSourceType = 'ANIMAL_GROUP' | 'BUILDING' | 'ENCLOSURE' | 'CROP' | 'HARVEST' | 'GENERAL';
type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD' | 'CREDIT' | 'OTHER';

export interface SalePaymentView {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note: string | null;
}

export interface ProductionRecordView {
  id: string;
  uniqueCode: string;
  sourceType: ProductionSourceType;
  sourceId: string;
  productionType: ProductionType;
  productionLabel: string;
  quantityProduced: number;
  quantityLost: number;
  quantitySellable: number;
  unit: string;
  productionDate: string;
  totalRevenue: number | null;
  totalCost: number | null;
  margin: number | null;
  notes: string | null;
}

@Injectable()
export class ProductionService {
  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService,
    private readonly reminderService: ReminderService
  ) {}

  async getProductionOverview(user: SessionUser, farmId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);

    const [records, stocks, sales, traceability, animalGroups, crops, buildings, enclosures] = await Promise.all([
      this.prisma.productionRecord.findMany({
        where: { farmId: farm.id },
        include: {
          eggRecord: true,
          fishGrowthRecord: true,
          fishHarvest: true
        },
        orderBy: [{ productionDate: 'desc' }, { createdAt: 'desc' }],
        take: 50
      }),
      this.prisma.productStock.findMany({
        where: { farmId: farm.id },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
      }),
      this.prisma.productSale.findMany({
        where: { farmId: farm.id },
        include: {
          stock: {
            select: {
              productionType: true
            }
          }
        },
        orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
        take: 50
      }),
      this.prisma.traceabilityEvent.findMany({
        where: { farmId: farm.id },
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        take: 50
      }),
      this.prisma.animalGroup.findMany({
        where: { farmId: farm.id },
        select: {
          id: true,
          identificationNumber: true,
          species: true,
          subtype: true,
          currentCount: true,
          initialCount: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.crop.findMany({
        where: { farmId: farm.id },
        select: {
          id: true,
          name: true,
          variety: true,
          cultivatedArea: true,
          plot: { select: { name: true } }
        },
        orderBy: { plantedAt: 'desc' }
      }),
      this.prisma.building.findMany({
        where: { farmId: farm.id },
        select: { id: true, name: true, buildingType: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.enclosure.findMany({
        where: { farmId: farm.id },
        select: { id: true, name: true, enclosureType: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const todayIso = new Date().toISOString().slice(0, 10);
    const productionToday = records
      .filter((record) => record.productionDate.toISOString().slice(0, 10) === todayIso)
      .reduce((sum, record) => sum + record.quantityProduced, 0);
    const productionTotal = records.reduce((sum, record) => sum + record.quantityProduced, 0);
    const sellableTotal = records.reduce((sum, record) => sum + record.quantitySellable, 0);
    const lossesTotal = records.reduce((sum, record) => sum + record.quantityLost, 0);
    const stockAvailable = stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
    const salesRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const salesPaid = sales.reduce((sum, sale) => sum + sale.amountPaid, 0);
    const totalCost = records.reduce((sum, record) => sum + (record.totalCost ?? 0), 0);
    const margin = salesRevenue - totalCost;

    const eggRecords = records.filter((record) => record.productionType === 'EGGS');
    const fishGrowthRecords = records.filter((record) => record.productionType === 'FISH_GROWTH');
    const fishHarvestRecords = records.filter((record) => record.productionType === 'FISH_HARVEST');
    const cropHarvestRecords = records.filter((record) => record.productionType === 'CROP_HARVEST');
    const eggDetails = eggRecords
      .map((record) => record.eggRecord)
      .filter((record): record is NonNullable<typeof record> => Boolean(record));
    const fishGrowthDetails = fishGrowthRecords
      .map((record) => record.fishGrowthRecord)
      .filter((record): record is NonNullable<typeof record> => Boolean(record));
    const fishHarvestDetails = fishHarvestRecords
      .map((record) => record.fishHarvest)
      .filter((record): record is NonNullable<typeof record> => Boolean(record));
    const averageLayingRate =
      eggDetails.length > 0
        ? eggDetails.reduce((sum, item) => sum + item.layingRate, 0) / eggDetails.length
        : 0;
    const totalEggMortality = eggDetails.reduce((sum, item) => sum + item.mortalityToday, 0);
    const totalBrokenEggs = eggDetails.reduce((sum, item) => sum + item.eggsBroken, 0);
    const feedCostEggs = eggDetails.reduce((sum, item) => sum + (item.feedCost ?? 0), 0);
    const fishAverageGrowthRate =
      fishGrowthDetails.length > 0
        ? fishGrowthDetails.reduce((sum, item) => sum + (item.growthRate ?? 0), 0) / fishGrowthDetails.length
        : 0;
    const fishMortality = fishGrowthDetails.reduce((sum, item) => sum + item.mortality, 0);
    const fishFeedCost = fishGrowthDetails.reduce((sum, item) => sum + (item.feedCost ?? 0), 0);
    const averageOxygen =
      fishGrowthDetails.length > 0
        ? fishGrowthDetails.reduce((sum, item) => sum + (item.oxygen ?? 0), 0) / fishGrowthDetails.length
        : 0;
    const averagePh =
      fishGrowthDetails.length > 0
        ? fishGrowthDetails.reduce((sum, item) => sum + (item.ph ?? 0), 0) / fishGrowthDetails.length
        : 0;
    const totalFishHarvestSellable = fishHarvestDetails.reduce((sum, item) => sum + item.sellableQuantity, 0);
    const cropYieldPerHectare =
      crops.reduce((sum, crop) => sum + crop.cultivatedArea, 0) > 0
        ? cropHarvestRecords.reduce((sum, record) => sum + record.quantitySellable, 0) /
          crops.reduce((sum, crop) => sum + crop.cultivatedArea, 0)
        : 0;
    const cropLosses = cropHarvestRecords.reduce((sum, record) => sum + record.quantityLost, 0);
    const productionAlerts: string[] = [];

    if (averageLayingRate > 0 && averageLayingRate < 65) {
      productionAlerts.push(`Taux de ponte moyen faible (${averageLayingRate.toFixed(1)}%).`);
    }
    if (totalBrokenEggs > 0 && totalBrokenEggs >= Math.max(5, eggDetails.reduce((sum, item) => sum + item.eggsProduced, 0) * 0.08)) {
      productionAlerts.push(`Hausse des oeufs casses detectee (${totalBrokenEggs}).`);
    }
    if (fishMortality > 0 && fishMortality >= 10) {
      productionAlerts.push(`Mortalite piscicole elevee (${fishMortality}).`);
    }
    if (averageOxygen > 0 && averageOxygen < 4) {
      productionAlerts.push(`Oxygene moyen bas (${averageOxygen.toFixed(1)} mg/L).`);
    }
    if (averagePh > 0 && (averagePh < 5.5 || averagePh > 9)) {
      productionAlerts.push(`pH moyen hors plage (${averagePh.toFixed(1)}).`);
    }
    if (cropLosses > 0 && cropLosses >= cropHarvestRecords.reduce((sum, record) => sum + record.quantityProduced, 0) * 0.1) {
      productionAlerts.push(`Pertes cultures elevees (${cropLosses.toFixed(2)}).`);
    }

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        activityType: farm.activityType
      },
      stats: {
        productionToday,
        productionTotal,
        sellableTotal,
        lossesTotal,
        stockAvailable,
        salesRevenue,
        salesPaid,
        totalCost,
        margin,
        rendement: productionTotal > 0 ? (sellableTotal / productionTotal) * 100 : 0
      },
      breakdown: {
        eggs: {
          records: eggRecords.length,
          traysAvailable: stocks
            .filter((stock) => stock.productionType === 'EGGS')
            .reduce((sum, stock) => sum + stock.availableQuantity, 0),
          salesRevenue: sales
            .filter((sale) => sale.stock.productionType === 'EGGS')
            .reduce((sum, sale) => sum + sale.totalAmount, 0),
          averageLayingRate,
          mortality: totalEggMortality,
          brokenEggs: totalBrokenEggs,
          feedCost: feedCostEggs
        },
        fish: {
          growthRecords: fishGrowthRecords.length,
          harvestRecords: fishHarvestRecords.length,
          biomass: fishGrowthRecords.reduce(
            (sum, record) => sum + (record.fishGrowthRecord?.estimatedBiomass ?? 0),
            0
          ),
          averageGrowthRate: fishAverageGrowthRate,
          mortality: fishMortality,
          feedCost: fishFeedCost,
          averageOxygen,
          averagePh,
          sellableHarvest: totalFishHarvestSellable
        },
        crops: {
          harvestRecords: cropHarvestRecords.length,
          harvestedQuantity: cropHarvestRecords.reduce((sum, record) => sum + record.quantityProduced, 0),
          yieldPerHectare: cropYieldPerHectare,
          losses: cropLosses,
          cultivatedArea: crops.reduce((sum, crop) => sum + crop.cultivatedArea, 0)
        },
        alerts: productionAlerts
      },
      records: records.map((record) => ({
        id: record.id,
        uniqueCode: record.uniqueCode,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        productionType: record.productionType,
        productionLabel: record.productionLabel,
        quantityProduced: record.quantityProduced,
        quantityLost: record.quantityLost,
        quantitySellable: record.quantitySellable,
        unit: record.unit,
        productionDate: record.productionDate.toISOString(),
        totalRevenue: record.totalRevenue,
        totalCost: record.totalCost,
        margin: record.margin,
        notes: record.notes
      })),
      stocks: stocks.map((stock) => ({
        id: stock.id,
        productName: stock.productName,
        productionType: stock.productionType,
        unit: stock.unit,
        totalQuantity: stock.totalQuantity,
        availableQuantity: stock.availableQuantity,
        reservedQuantity: stock.reservedQuantity,
        lowStockThreshold: stock.lowStockThreshold,
        status: stock.status,
        notes: stock.notes
      })),
      sales: sales.map((sale) => ({
        id: sale.id,
        saleCode: sale.saleCode,
        stockId: sale.stockId,
        productionRecordId: sale.productionRecordId,
        productName: sale.productName,
        quantitySold: sale.quantitySold,
        unit: sale.unit,
        unitPrice: sale.unitPrice,
        totalAmount: sale.totalAmount,
        amountPaid: sale.amountPaid,
        remainingAmount: sale.remainingAmount,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName,
        saleDate: sale.saleDate.toISOString(),
        notes: sale.notes
      })),
      traceability: traceability.map((event) => ({
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        eventDate: event.eventDate.toISOString(),
        details: event.details,
        productionRecordId: event.productionRecordId,
        stockId: event.stockId,
        saleId: event.saleId
      })),
      options: {
        animalGroups: animalGroups.map((animal) => ({
          id: animal.id,
          label: `${animal.identificationNumber} - ${animal.species} ${animal.subtype}`.trim(),
          currentCount: animal.currentCount ?? animal.initialCount ?? 0,
          species: animal.species,
          subtype: animal.subtype
        })),
        crops: crops.map((crop) => ({
          id: crop.id,
          label: `${crop.name}${crop.variety ? ` / ${crop.variety}` : ''} - ${crop.plot.name}`,
          cultivatedArea: crop.cultivatedArea
        })),
        buildings,
        enclosures
      }
    };
  }

  async createEggProduction(
    user: SessionUser,
    farmId: string,
    input: {
      animalGroupId: string;
      productionDate: string;
      currentHeadcount: number;
      eggsProduced: number;
      eggsBroken?: number;
      eggsDirty?: number;
      eggsLost?: number;
      mortalityToday?: number;
      feedConsumed?: number;
      feedCost?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const animalGroup = await this.prisma.animalGroup.findFirstOrThrow({
      where: { id: input.animalGroupId, farmId: farm.id }
    });

    const productionDate = this.parseDate(input.productionDate, 'Date de production invalide');
    const eggsBroken = input.eggsBroken ?? 0;
    const eggsDirty = input.eggsDirty ?? 0;
    const eggsLost = input.eggsLost ?? 0;
    const sellableEggs = input.eggsProduced - eggsBroken - eggsDirty - eggsLost;
    if (sellableEggs < 0) {
      throw new BadRequestException('Les pertes d oeufs ne peuvent pas depasser la production');
    }

    const traysProduced = sellableEggs / 30;
    const layingRate = input.currentHeadcount > 0 ? (input.eggsProduced / input.currentHeadcount) * 100 : 0;
    const feedCost = input.feedCost ?? 0;
    const feedCostPerEgg = sellableEggs > 0 ? feedCost / sellableEggs : 0;
    const feedCostPerTray = traysProduced > 0 ? feedCost / traysProduced : 0;
    const uniqueCode = await this.generateCode(farm.id, 'PROD', productionDate);

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.productionRecord.create({
        data: {
          uniqueCode,
          farmId: farm.id,
          sourceType: 'ANIMAL_GROUP',
          sourceId: animalGroup.id,
          productionType: 'EGGS',
          productionLabel: `Production oeufs - ${animalGroup.identificationNumber}`,
          quantityProduced: input.eggsProduced,
          quantityLost: eggsBroken + eggsDirty + eggsLost,
          quantitySellable: traysProduced,
          unit: 'plateaux',
          productionDate,
          totalCost: feedCost,
          margin: -feedCost,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      });

      await tx.eggProductionRecord.create({
        data: {
          productionRecordId: record.id,
          animalGroupId: animalGroup.id,
          currentHeadcount: input.currentHeadcount,
          eggsProduced: input.eggsProduced,
          eggsBroken,
          eggsDirty,
          eggsLost,
          eggsSellable: sellableEggs,
          traysProduced,
          layingRate,
          mortalityToday: input.mortalityToday ?? 0,
          feedConsumed: input.feedConsumed ?? null,
          feedCost: feedCost || null,
          feedCostPerEgg,
          feedCostPerTray,
          observations: input.notes?.trim() || null
        }
      });

      const stock = await this.upsertProductStock(
        tx,
        farm.id,
        {
          productionRecordId: record.id,
          productName: `Oeufs / Plateaux - ${animalGroup.identificationNumber}`,
          productionType: 'EGGS',
          unit: 'plateaux',
          quantityDelta: traysProduced,
          lowStockThreshold: 5,
          notes: 'Stock automatique issu des productions pondeuses'
        }
      );

      await tx.traceabilityEvent.create({
        data: {
          farmId: farm.id,
          productionRecordId: record.id,
          stockId: stock.id,
          title: `Production enregistree ${uniqueCode}`,
          eventType: 'EGG_PRODUCTION',
          eventDate: productionDate,
          details: `${sellableEggs} oeuf(s) vendable(s), ${traysProduced.toFixed(2)} plateau(x).`,
          createdByUserId: user.id
        }
      });

      return record;
    });

    await this.createProductionFollowUpTask(farm.id, {
      title: `Saisir la production pondeuse suivante - ${animalGroup.identificationNumber}`,
      description: "Preparer la prochaine saisie d'oeufs, mortalite et alimentation.",
      scheduledFor: this.offsetDays(productionDate, 1),
      sourceModule: 'layers/production',
      sourceRecordId: created.id,
      linkedModule: 'layers/production',
      linkedEntityType: 'LOT',
      linkedEntityId: animalGroup.id,
      linkedEntityLabel: animalGroup.identificationNumber
    });

    if (layingRate < 65 || eggsBroken >= Math.max(5, input.eggsProduced * 0.1)) {
      await this.prisma.alert.create({
        data: {
          farmId: farm.id,
          priority: layingRate < 55 ? 'URGENT' : 'HIGH',
          title: 'Alerte production pondeuse',
          severity: layingRate < 55 ? 'CRITICAL' : 'WARNING',
          message: `Taux de ponte ${layingRate.toFixed(1)}%, surveiller les pertes et la performance du lot ${animalGroup.identificationNumber}.`,
          sourceModule: 'PRODUCTION',
          sourceRecordId: created.id
        }
      });
    }

    if ((input.mortalityToday ?? 0) > 0) {
      const mortalityProfile = mortalityAlert({
        species: animalGroup.species,
        quantity: input.mortalityToday ?? 0,
        baselineCount: input.currentHeadcount,
        label: animalGroup.identificationNumber
      });

      await this.prisma.alert.create({
        data: {
          farmId: farm.id,
          priority: mortalityProfile.type === 'CRITICAL' ? 'URGENT' : 'HIGH',
          title: mortalityProfile.title,
          severity: mortalityProfile.type,
          message: mortalityProfile.message,
          sourceModule: 'PRODUCTION',
          sourceRecordId: created.id
        }
      });
    }

    return created;
  }

  async createFishGrowthRecord(
    user: SessionUser,
    farmId: string,
    input: {
      animalGroupId?: string;
      buildingId?: string;
      enclosureId?: string;
      species: string;
      stockingDate: string;
      productionDate: string;
      initialFingerlings: number;
      initialAverageWeight: number;
      currentAverageWeight: number;
      mortality?: number;
      feedDistributed?: number;
      feedCost?: number;
      waterQuality?: string;
      temperature?: number;
      oxygen?: number;
      ph?: number;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const productionDate = this.parseDate(input.productionDate, 'Date de suivi invalide');
    const stockingDate = this.parseDate(input.stockingDate, "Date d'empoissonnement invalide");
    const mortality = input.mortality ?? 0;
    const currentHeadcount = Math.max(0, input.initialFingerlings - mortality);
    const estimatedBiomass = currentHeadcount * input.currentAverageWeight;
    const gainWeight = input.currentAverageWeight - input.initialAverageWeight;
    const growthRate =
      input.initialAverageWeight > 0 ? (gainWeight / input.initialAverageWeight) * 100 : 0;
    const feedConversionIndex =
      estimatedBiomass > 0 && (input.feedDistributed ?? 0) > 0
        ? (input.feedDistributed ?? 0) / estimatedBiomass
        : null;
    const uniqueCode = await this.generateCode(farm.id, 'PROD', productionDate);

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productionRecord.create({
        data: {
          uniqueCode,
          farmId: farm.id,
          sourceType: input.enclosureId ? 'ENCLOSURE' : input.buildingId ? 'BUILDING' : 'ANIMAL_GROUP',
          sourceId: input.enclosureId ?? input.buildingId ?? input.animalGroupId ?? 'GENERAL',
          productionType: 'FISH_GROWTH',
          productionLabel: `Suivi piscicole - ${input.species}`,
          quantityProduced: estimatedBiomass,
          quantityLost: mortality,
          quantitySellable: estimatedBiomass,
          unit: 'kg',
          productionDate,
          totalCost: input.feedCost ?? null,
          margin: input.feedCost ? -input.feedCost : null,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      });

      await tx.fishGrowthRecord.create({
        data: {
          productionRecordId: created.id,
          animalGroupId: input.animalGroupId ?? null,
          buildingId: input.buildingId ?? null,
          enclosureId: input.enclosureId ?? null,
          species: input.species,
          initialFingerlings: input.initialFingerlings,
          currentHeadcount,
          stockingDate,
          initialAverageWeight: input.initialAverageWeight,
          currentAverageWeight: input.currentAverageWeight,
          mortality,
          estimatedBiomass,
          feedDistributed: input.feedDistributed ?? null,
          feedCost: input.feedCost ?? null,
          feedConversionIndex,
          waterQuality: input.waterQuality?.trim() || null,
          temperature: input.temperature ?? null,
          oxygen: input.oxygen ?? null,
          ph: input.ph ?? null,
          growthRate,
          observations: input.notes?.trim() || null
        }
      });

      await tx.traceabilityEvent.create({
        data: {
          farmId: farm.id,
          productionRecordId: created.id,
          title: `Suivi piscicole ${uniqueCode}`,
          eventType: 'FISH_GROWTH',
          eventDate: productionDate,
          details: `Biomasse estimee ${estimatedBiomass.toFixed(2)} kg, mortalite ${mortality}.`,
          createdByUserId: user.id
        }
      });

      return created;
    });

    await this.createProductionFollowUpTask(farm.id, {
      title: `Controle eau et alimentation - ${input.species}`,
      description: 'Verifier oxygene, pH, alimentation et croissance du bassin.',
      scheduledFor: this.offsetDays(productionDate, 7),
      sourceModule: 'pisciculture',
      sourceRecordId: record.id,
      linkedModule: 'pisciculture',
      linkedEntityType: input.enclosureId ? 'BASSIN' : input.buildingId ? 'BATIMENT' : 'LOT',
      linkedEntityId: input.enclosureId ?? input.buildingId ?? input.animalGroupId ?? null,
      linkedEntityLabel: input.species
    });

    if ((input.oxygen ?? 10) < 4 || (input.ph ?? 7) < 5.5 || (input.ph ?? 7) > 9) {
      await this.prisma.alert.create({
        data: {
          farmId: farm.id,
          priority: 'URGENT',
          title: 'Alerte qualite eau',
          severity: 'CRITICAL',
          message: `Controle immediat recommande: oxygene ${input.oxygen ?? 'NC'}, pH ${input.ph ?? 'NC'}.`,
          sourceModule: 'PISCICULTURE',
          sourceRecordId: record.id
        }
      });
    }

    if (mortality > 0) {
      const mortalityProfile = mortalityAlert({
        species: input.species,
        quantity: mortality,
        baselineCount: input.initialFingerlings,
        label: input.species
      });

      await this.prisma.alert.create({
        data: {
          farmId: farm.id,
          priority: mortalityProfile.type === 'CRITICAL' ? 'URGENT' : 'HIGH',
          title: mortalityProfile.title,
          severity: mortalityProfile.type,
          message: mortalityProfile.message,
          sourceModule: 'PISCICULTURE',
          sourceRecordId: record.id
        }
      });
    }

    return record;
  }

  async createFishHarvest(
    user: SessionUser,
    farmId: string,
    input: {
      animalGroupId?: string;
      buildingId?: string;
      enclosureId?: string;
      harvestedAt: string;
      totalWeight: number;
      fishCount: number;
      losses?: number;
      sellableQuantity: number;
      destination?: string;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const harvestedAt = this.parseDate(input.harvestedAt, 'Date de recolte invalide');
    const averageWeight = input.fishCount > 0 ? input.totalWeight / input.fishCount : 0;
    const uniqueCode = await this.generateCode(farm.id, 'PROD', harvestedAt);

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productionRecord.create({
        data: {
          uniqueCode,
          farmId: farm.id,
          sourceType: input.enclosureId ? 'ENCLOSURE' : input.buildingId ? 'BUILDING' : 'ANIMAL_GROUP',
          sourceId: input.enclosureId ?? input.buildingId ?? input.animalGroupId ?? 'GENERAL',
          productionType: 'FISH_HARVEST',
          productionLabel: 'Recolte piscicole',
          quantityProduced: input.totalWeight,
          quantityLost: input.losses ?? 0,
          quantitySellable: input.sellableQuantity,
          unit: 'kg',
          productionDate: harvestedAt,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      });

      await tx.fishHarvest.create({
        data: {
          productionRecordId: created.id,
          farmId: farm.id,
          animalGroupId: input.animalGroupId ?? null,
          buildingId: input.buildingId ?? null,
          enclosureId: input.enclosureId ?? null,
          harvestedAt,
          totalWeight: input.totalWeight,
          fishCount: input.fishCount,
          averageWeight,
          losses: input.losses ?? 0,
          sellableQuantity: input.sellableQuantity,
          destination: input.destination?.trim() || null
        }
      });

      const stock = await this.upsertProductStock(
        tx,
        farm.id,
        {
          productionRecordId: created.id,
          productName: 'Poissons recoltes',
          productionType: 'FISH_HARVEST',
          unit: 'kg',
          quantityDelta: input.sellableQuantity,
          lowStockThreshold: 20,
          notes: 'Stock automatique issu des recoltes piscicoles'
        }
      );

      await tx.traceabilityEvent.create({
        data: {
          farmId: farm.id,
          productionRecordId: created.id,
          stockId: stock.id,
          title: `Recolte piscicole ${uniqueCode}`,
          eventType: 'FISH_HARVEST',
          eventDate: harvestedAt,
          details: `${input.sellableQuantity.toFixed(2)} kg vendables affectes au stock.`,
          createdByUserId: user.id
        }
      });

      return created;
    });

    return record;
  }

  async createCropHarvestProduction(
    user: SessionUser,
    farmId: string,
    input: {
      cropId: string;
      harvestedAt: string;
      quantity: number;
      losses?: number;
      unit: string;
      quality?: 'EXCELLENT' | 'BONNE' | 'MOYENNE' | 'FAIBLE';
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const crop = await this.prisma.crop.findFirstOrThrow({
      where: { id: input.cropId, farmId: farm.id },
      include: { plot: true }
    });

    const harvestedAt = this.parseDate(input.harvestedAt, 'Date de recolte invalide');
    const sellableQuantity = input.quantity - (input.losses ?? 0);
    if (sellableQuantity < 0) {
      throw new BadRequestException('Les pertes ne peuvent pas depasser la quantite recoltee');
    }

    const uniqueCode = await this.generateCode(farm.id, 'PROD', harvestedAt);

    const record = await this.prisma.$transaction(async (tx) => {
      await tx.harvest.create({
        data: {
          farmId: farm.id,
          cropId: crop.id,
          plotId: crop.plotId,
          harvestedAt,
          quantity: input.quantity,
          unit: input.unit,
          quality: input.quality ?? null,
          revenue: null,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      });

      const aggregate = await tx.harvest.aggregate({
        where: { farmId: farm.id, cropId: crop.id },
        _sum: { quantity: true }
      });

      await tx.crop.update({
        where: { id: crop.id },
        data: {
          actualYield: aggregate._sum.quantity ?? input.quantity,
          status: 'HARVESTED'
        }
      });

      const created = await tx.productionRecord.create({
        data: {
          uniqueCode,
          farmId: farm.id,
          sourceType: 'CROP',
          sourceId: crop.id,
          productionType: 'CROP_HARVEST',
          productionLabel: `Recolte culture - ${crop.name}`,
          quantityProduced: input.quantity,
          quantityLost: input.losses ?? 0,
          quantitySellable: sellableQuantity,
          unit: input.unit,
          productionDate: harvestedAt,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      });

      const stock = await this.upsertProductStock(
        tx,
        farm.id,
        {
          productionRecordId: created.id,
          productName: `${crop.name} recolte`,
          productionType: 'CROP_HARVEST',
          unit: input.unit,
          quantityDelta: sellableQuantity,
          lowStockThreshold: 50,
          notes: `Stock automatique issu de la parcelle ${crop.plot.name}`
        }
      );

      await tx.traceabilityEvent.create({
        data: {
          farmId: farm.id,
          productionRecordId: created.id,
          stockId: stock.id,
          title: `Recolte culture ${uniqueCode}`,
          eventType: 'CROP_HARVEST',
          eventDate: harvestedAt,
          details: `${sellableQuantity.toFixed(2)} ${input.unit} vendables pour ${crop.name}.`,
          createdByUserId: user.id
        }
      });

      return created;
    });

    await this.createProductionFollowUpTask(farm.id, {
      title: `Vendre ou stocker la recolte ${crop.name}`,
      description: `Suivre le stock recolte et la rentabilite de ${crop.name}.`,
      scheduledFor: this.offsetDays(harvestedAt, 1),
      sourceModule: 'crops',
      sourceRecordId: record.id,
      linkedModule: 'crops',
      linkedEntityType: 'CROP',
      linkedEntityId: crop.id,
      linkedEntityLabel: crop.name
    });

    return record;
  }

  async createSale(
    user: SessionUser,
    farmId: string,
    input: {
      stockId: string;
      quantitySold: number;
      unitPrice: number;
      amountPaid: number;
      paymentMethod: PaymentMethod;
      customerName: string;
      saleDate: string;
      notes?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const stock = await this.prisma.productStock.findFirstOrThrow({
      where: { id: input.stockId, farmId: farm.id }
    });

    if (input.quantitySold <= 0 || input.unitPrice <= 0) {
      throw new BadRequestException('Quantite et prix doivent etre strictement positifs');
    }

    if (input.quantitySold > stock.availableQuantity) {
      throw new BadRequestException('Stock produit insuffisant pour cette vente');
    }

    const saleDate = this.parseDate(input.saleDate, 'Date de vente invalide');
    const totalAmount = input.quantitySold * input.unitPrice;
    const amountPaid = Math.min(totalAmount, Math.max(0, input.amountPaid));
    const remainingAmount = totalAmount - amountPaid;
    const saleCode = await this.generateCode(farm.id, 'SALE', saleDate);

    const sale = await this.prisma.$transaction(async (tx) => {
      const updatedStock = await tx.productStock.update({
        where: { id: stock.id },
        data: {
          availableQuantity: stock.availableQuantity - input.quantitySold,
          status:
            stock.availableQuantity - input.quantitySold <= 0
              ? 'OUT_OF_STOCK'
              : stock.availableQuantity - input.quantitySold <= stock.lowStockThreshold
                ? 'LOW'
                : 'AVAILABLE'
        }
      });

      const created = await tx.productSale.create({
        data: {
          saleCode,
          farmId: farm.id,
          stockId: stock.id,
          productionRecordId: stock.productionRecordId,
          productName: stock.productName,
          quantitySold: input.quantitySold,
          unit: stock.unit,
          unitPrice: input.unitPrice,
          totalAmount,
          amountPaid,
          remainingAmount,
          paymentMethod: input.paymentMethod,
          customerName: input.customerName.trim(),
          saleDate,
          notes: input.notes?.trim() || null,
          createdByUserId: user.id
        }
      });

      if (amountPaid > 0) {
        await tx.salePayment.create({
          data: {
            saleId: created.id,
            paymentDate: saleDate,
            amount: amountPaid,
            paymentMethod: input.paymentMethod,
            note: remainingAmount > 0 ? 'Paiement partiel a la vente' : 'Paiement complet'
          }
        });
      }

      await tx.financialTransaction.create({
        data: {
          farmId: farm.id,
          transactionType: 'REVENU',
          category: `Vente ${stock.productName}`,
          amount: totalAmount,
          transactionDate: saleDate,
          referenceModule: 'PRODUCTION',
          notes:
            remainingAmount > 0
              ? `Vente ${saleCode} - client ${input.customerName} - reste a payer ${remainingAmount.toFixed(2)}`
              : `Vente ${saleCode} - client ${input.customerName}`,
          recordedByUserId: user.id
        }
      });

      await tx.traceabilityEvent.create({
        data: {
          farmId: farm.id,
          productionRecordId: stock.productionRecordId,
          stockId: updatedStock.id,
          saleId: created.id,
          title: `Vente ${saleCode}`,
          eventType: 'PRODUCT_SALE',
          eventDate: saleDate,
          details: `${input.quantitySold} ${stock.unit} vendu(s) a ${input.customerName}.`,
          createdByUserId: user.id
        }
      });

      return created;
    });

    return sale;
  }

  async addSalePayment(
    user: SessionUser,
    farmId: string,
    saleId: string,
    input: {
      paymentDate: string;
      amount: number;
      paymentMethod: PaymentMethod;
      note?: string;
    }
  ) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const sale = await this.prisma.productSale.findFirstOrThrow({
      where: { id: saleId, farmId: farm.id }
    });

    if (input.amount <= 0) {
      throw new BadRequestException('Le montant du paiement doit etre strictement positif');
    }

    if (sale.remainingAmount <= 0) {
      throw new BadRequestException('Cette vente est deja totalement reglee');
    }

    const paymentAmount = Math.min(input.amount, sale.remainingAmount);
    const paymentDate = this.parseDate(input.paymentDate, 'Date de paiement invalide');

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.salePayment.create({
        data: {
          saleId: sale.id,
          paymentDate,
          amount: paymentAmount,
          paymentMethod: input.paymentMethod,
          note: input.note?.trim() || null
        }
      });

      const updatedSale = await tx.productSale.update({
        where: { id: sale.id },
        data: {
          amountPaid: sale.amountPaid + paymentAmount,
          remainingAmount: Math.max(0, sale.remainingAmount - paymentAmount)
        }
      });

      await tx.traceabilityEvent.create({
        data: {
          farmId: farm.id,
          saleId: sale.id,
          stockId: sale.stockId,
          productionRecordId: sale.productionRecordId,
          title: `Paiement complementaire ${sale.saleCode}`,
          eventType: 'SALE_PAYMENT',
          eventDate: paymentDate,
          details: `${paymentAmount.toFixed(2)} recu pour ${sale.customerName}. Reste ${Math.max(0, sale.remainingAmount - paymentAmount).toFixed(2)}.`,
          createdByUserId: user.id
        }
      });

      return {
        payment,
        updatedSale
      };
    });

    return {
      id: result.payment.id,
      paymentDate: result.payment.paymentDate.toISOString(),
      amount: result.payment.amount,
      paymentMethod: result.payment.paymentMethod,
      note: result.payment.note,
      sale: {
        id: result.updatedSale.id,
        amountPaid: result.updatedSale.amountPaid,
        remainingAmount: result.updatedSale.remainingAmount
      }
    };
  }

  private async upsertProductStock(
    tx: any,
    farmId: string,
    input: {
      productionRecordId: string;
      productName: string;
      productionType: ProductionType;
      unit: string;
      quantityDelta: number;
      lowStockThreshold: number;
      notes?: string;
    }
  ) {
    const existing = await this.prisma.productStock.findFirst({
      where: {
        farmId,
        productName: input.productName,
        productionType: input.productionType,
        unit: input.unit
      }
    });

    const nextAvailable = (existing?.availableQuantity ?? 0) + input.quantityDelta;
    const nextTotal = (existing?.totalQuantity ?? 0) + input.quantityDelta;
    const nextStatus =
      nextAvailable <= 0 ? 'OUT_OF_STOCK' : nextAvailable <= input.lowStockThreshold ? 'LOW' : 'AVAILABLE';

    if (existing) {
      return tx.productStock.update({
        where: { id: existing.id },
        data: {
          productionRecordId: input.productionRecordId,
          totalQuantity: nextTotal,
          availableQuantity: nextAvailable,
          lowStockThreshold: input.lowStockThreshold,
          status: nextStatus,
          notes: input.notes ?? existing.notes
        }
      });
    }

    return tx.productStock.create({
      data: {
        farmId,
        productionRecordId: input.productionRecordId,
        productName: input.productName,
        productionType: input.productionType,
        unit: input.unit,
        totalQuantity: input.quantityDelta,
        availableQuantity: input.quantityDelta,
        lowStockThreshold: input.lowStockThreshold,
        status: nextStatus,
        notes: input.notes ?? null
      }
    });
  }

  private async generateCode(farmId: string, prefix: 'PROD' | 'SALE', date: Date) {
    const year = date.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const count =
      prefix === 'PROD'
        ? await this.prisma.productionRecord.count({
            where: {
              farmId,
              createdAt: {
                gte: start,
                lt: end
              }
            }
          })
        : await this.prisma.productSale.count({
            where: {
              farmId,
              createdAt: {
                gte: start,
                lt: end
              }
            }
          });

    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private parseDate(rawValue: string, message: string) {
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(message);
    }
    return parsed;
  }

  private offsetDays(base: Date, days: number) {
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return next;
  }

  private async createProductionFollowUpTask(
    farmId: string,
    input: {
      title: string;
      description: string;
      scheduledFor: Date;
      sourceModule?: string;
      sourceRecordId?: string;
      linkedModule?: string;
      linkedEntityType?: string;
      linkedEntityId?: string | null;
      linkedEntityLabel?: string | null;
    }
  ) {
    const task = await this.prisma.agendaTask.create({
      data: {
        farmId,
        title: input.title,
        description: input.description,
        priority: 'MEDIUM',
        status: input.scheduledFor.getTime() < Date.now() ? 'EN_RETARD' : 'A_FAIRE',
        scheduledFor: input.scheduledFor,
        scheduledLabel: input.scheduledFor.toISOString().slice(0, 10),
        sourceModule: input.sourceModule ?? 'PRODUCTION',
        sourceRecordId: input.sourceRecordId ?? null,
        linkedModule: input.linkedModule ?? input.sourceModule ?? 'PRODUCTION',
        linkedEntityType: input.linkedEntityType ?? null,
        linkedEntityId: input.linkedEntityId ?? null,
        linkedEntityLabel: input.linkedEntityLabel ?? null
      }
    });

    await this.reminderService.syncTaskReminders(task);
    return task;
  }
}
