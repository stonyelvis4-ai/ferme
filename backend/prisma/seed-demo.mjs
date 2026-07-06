import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_ADMIN = {
  fullName: 'Administrateur Demo FERM+',
  email: 'demo.admin@ferm.plus',
  password: 'DemoAdmin123!'
};

const DEMO_OWNER = {
  fullName: 'Proprietaire Demo FERM+',
  email: 'demo.owner@ferm.plus',
  password: 'DemoOwner123!'
};

function startOfToday(offsetDays = 0) {
  const date = new Date();
  date.setHours(8, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

async function upsertUser({ fullName, email, password, role }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      passwordHash: await hash(password, 10),
      role,
      isActive: true
    },
    create: {
      fullName,
      email,
      passwordHash: await hash(password, 10),
      role,
      isActive: true
    }
  });
}

async function main() {
  const admin = await upsertUser({
    ...DEMO_ADMIN,
    role: 'ADMIN'
  });

  const owner = await upsertUser({
    ...DEMO_OWNER,
    role: 'PROPRIETAIRE'
  });

  const farm = await prisma.farm.upsert({
    where: {
      id: 'demo-ferme-mixte-pisciculture'
    },
    update: {
      name: 'Ferme Demo - Culture, Pisciculture & Oeufs',
      description:
        "Ferme de demonstration pour explorer les cultures, la pisciculture, les pondeuses et la vente de produits.",
      location: 'Abidjan - Zone periurbaine',
      surfaceArea: 42.5,
      status: 'ACTIVE',
      activityType: 'MIXTE',
      ownerUserId: owner.id
    },
    create: {
      id: 'demo-ferme-mixte-pisciculture',
      name: 'Ferme Demo - Culture, Pisciculture & Oeufs',
      description:
        "Ferme de demonstration pour explorer les cultures, la pisciculture, les pondeuses et la vente de produits.",
      location: 'Abidjan - Zone periurbaine',
      surfaceArea: 42.5,
      status: 'ACTIVE',
      activityType: 'MIXTE',
      ownerUserId: owner.id
    }
  });

  await prisma.$transaction(async (tx) => {
    await tx.plot.upsert({
      where: { id: 'demo-plot-riz' },
      update: {
        name: 'Parcelle Riz',
        location: 'Nord-est',
        surfaceArea: 12.5,
        soilType: 'Limoneux',
        irrigationType: 'Goutte a goutte',
        status: 'CULTIVATED',
        notes: 'Parcelle demo pour suivre culture et rendement.'
      },
      create: {
        id: 'demo-plot-riz',
        farmId: farm.id,
        name: 'Parcelle Riz',
        location: 'Nord-est',
        surfaceArea: 12.5,
        soilType: 'Limoneux',
        irrigationType: 'Goutte a goutte',
        status: 'CULTIVATED',
        notes: 'Parcelle demo pour suivre culture et rendement.'
      }
    });

    await tx.plot.upsert({
      where: { id: 'demo-plot-marachage' },
      update: {
        name: 'Parcelle Maraichage',
        location: 'Sud',
        surfaceArea: 8.2,
        soilType: 'Sablo-limoneux',
        irrigationType: 'Aspersion',
        status: 'CULTIVATED',
        notes: 'Parcelle demo pour legumes et rotations.'
      },
      create: {
        id: 'demo-plot-marachage',
        farmId: farm.id,
        name: 'Parcelle Maraichage',
        location: 'Sud',
        surfaceArea: 8.2,
        soilType: 'Sablo-limoneux',
        irrigationType: 'Aspersion',
        status: 'CULTIVATED',
        notes: 'Parcelle demo pour legumes et rotations.'
      }
    });

    await tx.crop.upsert({
      where: { id: 'demo-crop-riz' },
      update: {
        plotId: 'demo-plot-riz',
        name: 'Riz Nerica',
        variety: 'Nerica 4',
        cultivatedArea: 10.5,
        cycleLabel: 'Saison chaude',
        plantedAt: startOfToday(-18),
        expectedHarvestAt: startOfToday(42),
        status: 'ACTIVE',
        expectedYield: 34,
        actualYield: null,
        notes: 'Suivi de culture pour la demo.'
      },
      create: {
        id: 'demo-crop-riz',
        farmId: farm.id,
        plotId: 'demo-plot-riz',
        name: 'Riz Nerica',
        variety: 'Nerica 4',
        cultivatedArea: 10.5,
        cycleLabel: 'Saison chaude',
        plantedAt: startOfToday(-18),
        expectedHarvestAt: startOfToday(42),
        status: 'ACTIVE',
        expectedYield: 34,
        notes: 'Suivi de culture pour la demo.'
      }
    });

    await tx.crop.upsert({
      where: { id: 'demo-crop-tomate' },
      update: {
        plotId: 'demo-plot-marachage',
        name: 'Tomate Roma',
        variety: 'Roma',
        cultivatedArea: 4.6,
        cycleLabel: 'Cycle court',
        plantedAt: startOfToday(-12),
        expectedHarvestAt: startOfToday(18),
        status: 'ACTIVE',
        expectedYield: 12,
        actualYield: null,
        notes: 'Parcelle legumiere demo.'
      },
      create: {
        id: 'demo-crop-tomate',
        farmId: farm.id,
        plotId: 'demo-plot-marachage',
        name: 'Tomate Roma',
        variety: 'Roma',
        cultivatedArea: 4.6,
        cycleLabel: 'Cycle court',
        plantedAt: startOfToday(-12),
        expectedHarvestAt: startOfToday(18),
        status: 'ACTIVE',
        expectedYield: 12,
        notes: 'Parcelle legumiere demo.'
      }
    });

    await tx.building.upsert({
      where: { id: 'demo-building-poulailler' },
      update: {
        name: 'Poulailler Principal',
        buildingType: 'POULAILLER',
        capacity: 900,
        assignedTo: 'Pondeuses demo',
        conditionLabel: 'Bon etat',
        status: 'OPERATIONNEL',
        notes: 'Infrastructure de demonstration.'
      },
      create: {
        id: 'demo-building-poulailler',
        farmId: farm.id,
        name: 'Poulailler Principal',
        buildingType: 'POULAILLER',
        capacity: 900,
        assignedTo: 'Pondeuses demo',
        conditionLabel: 'Bon etat',
        status: 'OPERATIONNEL',
        notes: 'Infrastructure de demonstration.'
      }
    });

    await tx.enclosure.upsert({
      where: { id: 'demo-enclosure-bassin' },
      update: {
        name: 'Bassin Piscicole',
        enclosureType: 'BASSIN_OUVERT',
        capacity: 1800,
        assignedTo: 'Tilapia demo',
        conditionLabel: 'Bonne circulation',
        status: 'OPERATIONNEL',
        notes: 'Zone de suivi de la pisciculture.'
      },
      create: {
        id: 'demo-enclosure-bassin',
        farmId: farm.id,
        name: 'Bassin Piscicole',
        enclosureType: 'BASSIN_OUVERT',
        capacity: 1800,
        assignedTo: 'Tilapia demo',
        conditionLabel: 'Bonne circulation',
        status: 'OPERATIONNEL',
        notes: 'Zone de suivi de la pisciculture.'
      }
    });

    await tx.animalGroup.upsert({
      where: { id: 'demo-animal-pondeuses' },
      update: {
        trackingMode: 'LOT',
        identificationNumber: 'PONDEUSES-01',
        name: 'Pondeuses Demo',
        species: 'Gallus gallus domesticus',
        subtype: 'Volailles',
        breed: 'Hy-Line Brown',
        sex: 'FEMALE',
        birthDate: startOfToday(-140),
        currentAgeDays: 140,
        currentWeight: 1.8,
        status: 'ACTIF',
        initialCount: 320,
        currentCount: 308
      },
      create: {
        id: 'demo-animal-pondeuses',
        farmId: farm.id,
        trackingMode: 'LOT',
        identificationNumber: 'PONDEUSES-01',
        name: 'Pondeuses Demo',
        species: 'Gallus gallus domesticus',
        subtype: 'Volailles',
        breed: 'Hy-Line Brown',
        sex: 'FEMALE',
        birthDate: startOfToday(-140),
        currentAgeDays: 140,
        currentWeight: 1.8,
        status: 'ACTIF',
        initialCount: 320,
        currentCount: 308
      }
    });

    await tx.animalGroup.upsert({
      where: { id: 'demo-animal-poissons' },
      update: {
        trackingMode: 'LOT',
        identificationNumber: 'TILAPIA-01',
        name: 'Lot Tilapia Demo',
        species: 'Oreochromis niloticus',
        subtype: 'Poissons',
        breed: 'Tilapia',
        sex: 'INCONNU',
        birthDate: startOfToday(-90),
        currentAgeDays: 90,
        currentWeight: 0.82,
        status: 'ACTIF',
        initialCount: 1200,
        currentCount: 1145
      },
      create: {
        id: 'demo-animal-poissons',
        farmId: farm.id,
        trackingMode: 'LOT',
        identificationNumber: 'TILAPIA-01',
        name: 'Lot Tilapia Demo',
        species: 'Oreochromis niloticus',
        subtype: 'Poissons',
        breed: 'Tilapia',
        sex: 'INCONNU',
        birthDate: startOfToday(-90),
        currentAgeDays: 90,
        currentWeight: 0.82,
        status: 'ACTIF',
        initialCount: 1200,
        currentCount: 1145
      }
    });

    const eggRecord = await tx.productionRecord.upsert({
      where: { uniqueCode: 'PROD-2026-0001' },
      update: {
        farmId: farm.id,
        sourceType: 'ANIMAL_GROUP',
        sourceId: 'demo-animal-pondeuses',
        productionType: 'EGGS',
        productionLabel: 'Production oeufs - Demo',
        quantityProduced: 214,
        quantityLost: 12,
        quantitySellable: 202,
        unit: 'plateaux',
        productionDate: startOfToday(-1),
        totalRevenue: 12120,
        totalCost: 3200,
        margin: 8920,
        notes: 'Production d oeufs de demonstration.',
        createdByUserId: admin.id
      },
      create: {
        uniqueCode: 'PROD-2026-0001',
        farmId: farm.id,
        sourceType: 'ANIMAL_GROUP',
        sourceId: 'demo-animal-pondeuses',
        productionType: 'EGGS',
        productionLabel: 'Production oeufs - Demo',
        quantityProduced: 214,
        quantityLost: 12,
        quantitySellable: 202,
        unit: 'plateaux',
        productionDate: startOfToday(-1),
        totalRevenue: 12120,
        totalCost: 3200,
        margin: 8920,
        notes: 'Production d oeufs de demonstration.',
        createdByUserId: admin.id
      }
    });

    await tx.eggProductionRecord.upsert({
      where: { productionRecordId: eggRecord.id },
      update: {
        animalGroupId: 'demo-animal-pondeuses',
        currentHeadcount: 308,
        eggsProduced: 214,
        eggsBroken: 8,
        eggsDirty: 4,
        eggsLost: 0,
        eggsSellable: 202,
        traysProduced: 6.73,
        layingRate: 69.5,
        mortalityToday: 1,
        feedConsumed: 48,
        feedCost: 3200,
        feedCostPerEgg: 15.84,
        feedCostPerTray: 475.11,
        observations: 'Bonne production de ponte.'
      },
      create: {
        productionRecordId: eggRecord.id,
        animalGroupId: 'demo-animal-pondeuses',
        currentHeadcount: 308,
        eggsProduced: 214,
        eggsBroken: 8,
        eggsDirty: 4,
        eggsLost: 0,
        eggsSellable: 202,
        traysProduced: 6.73,
        layingRate: 69.5,
        mortalityToday: 1,
        feedConsumed: 48,
        feedCost: 3200,
        feedCostPerEgg: 15.84,
        feedCostPerTray: 475.11,
        observations: 'Bonne production de ponte.'
      }
    });

    const fishGrowthRecord = await tx.productionRecord.upsert({
      where: { uniqueCode: 'PROD-2026-0002' },
      update: {
        farmId: farm.id,
        sourceType: 'ENCLOSURE',
        sourceId: 'demo-enclosure-bassin',
        productionType: 'FISH_GROWTH',
        productionLabel: 'Suivi piscicole - Demo',
        quantityProduced: 980,
        quantityLost: 18,
        quantitySellable: 980,
        unit: 'kg',
        productionDate: startOfToday(-2),
        totalRevenue: null,
        totalCost: 5600,
        margin: -5600,
        notes: 'Suivi de croissance demo.',
        createdByUserId: admin.id
      },
      create: {
        uniqueCode: 'PROD-2026-0002',
        farmId: farm.id,
        sourceType: 'ENCLOSURE',
        sourceId: 'demo-enclosure-bassin',
        productionType: 'FISH_GROWTH',
        productionLabel: 'Suivi piscicole - Demo',
        quantityProduced: 980,
        quantityLost: 18,
        quantitySellable: 980,
        unit: 'kg',
        productionDate: startOfToday(-2),
        totalRevenue: null,
        totalCost: 5600,
        margin: -5600,
        notes: 'Suivi de croissance demo.',
        createdByUserId: admin.id
      }
    });

    await tx.fishGrowthRecord.upsert({
      where: { productionRecordId: fishGrowthRecord.id },
      update: {
        animalGroupId: 'demo-animal-poissons',
        enclosureId: 'demo-enclosure-bassin',
        species: 'Tilapia',
        initialFingerlings: 1200,
        currentHeadcount: 1145,
        stockingDate: startOfToday(-90),
        initialAverageWeight: 0.35,
        currentAverageWeight: 0.86,
        mortality: 18,
        estimatedBiomass: 985.7,
        feedDistributed: 520,
        feedCost: 5600,
        feedConversionIndex: 0.53,
        waterQuality: 'Bonne',
        temperature: 27.4,
        oxygen: 5.8,
        ph: 7.3,
        growthRate: 145.7,
        observations: 'Croissance stable et biomasse en progression.'
      },
      create: {
        productionRecordId: fishGrowthRecord.id,
        animalGroupId: 'demo-animal-poissons',
        enclosureId: 'demo-enclosure-bassin',
        species: 'Tilapia',
        initialFingerlings: 1200,
        currentHeadcount: 1145,
        stockingDate: startOfToday(-90),
        initialAverageWeight: 0.35,
        currentAverageWeight: 0.86,
        mortality: 18,
        estimatedBiomass: 985.7,
        feedDistributed: 520,
        feedCost: 5600,
        feedConversionIndex: 0.53,
        waterQuality: 'Bonne',
        temperature: 27.4,
        oxygen: 5.8,
        ph: 7.3,
        growthRate: 145.7,
        observations: 'Croissance stable et biomasse en progression.'
      }
    });

    const fishHarvestRecord = await tx.productionRecord.upsert({
      where: { uniqueCode: 'PROD-2026-0003' },
      update: {
        farmId: farm.id,
        sourceType: 'HARVEST',
        sourceId: 'demo-enclosure-bassin',
        productionType: 'FISH_HARVEST',
        productionLabel: 'Recolte piscicole - Demo',
        quantityProduced: 420,
        quantityLost: 12,
        quantitySellable: 408,
        unit: 'kg',
        productionDate: startOfToday(-1),
        notes: 'Recolte piscicole de demonstration.',
        createdByUserId: admin.id
      },
      create: {
        uniqueCode: 'PROD-2026-0003',
        farmId: farm.id,
        sourceType: 'HARVEST',
        sourceId: 'demo-enclosure-bassin',
        productionType: 'FISH_HARVEST',
        productionLabel: 'Recolte piscicole - Demo',
        quantityProduced: 420,
        quantityLost: 12,
        quantitySellable: 408,
        unit: 'kg',
        productionDate: startOfToday(-1),
        notes: 'Recolte piscicole de demonstration.',
        createdByUserId: admin.id
      }
    });

    await tx.fishHarvest.upsert({
      where: { productionRecordId: fishHarvestRecord.id },
      update: {
        farmId: farm.id,
        enclosureId: 'demo-enclosure-bassin',
        harvestedAt: startOfToday(-1),
        totalWeight: 420,
        fishCount: 488,
        averageWeight: 0.86,
        losses: 12,
        sellableQuantity: 408,
        destination: 'Vente locale'
      },
      create: {
        productionRecordId: fishHarvestRecord.id,
        farmId: farm.id,
        enclosureId: 'demo-enclosure-bassin',
        harvestedAt: startOfToday(-1),
        totalWeight: 420,
        fishCount: 488,
        averageWeight: 0.86,
        losses: 12,
        sellableQuantity: 408,
        destination: 'Vente locale'
      }
    });

    const eggStock = await tx.productStock.upsert({
      where: { id: 'demo-stock-eggs' },
      update: {
        farmId: farm.id,
        productionRecordId: eggRecord.id,
        productName: 'Oeufs frais',
        productionType: 'EGGS',
        unit: 'plateaux',
        totalQuantity: 202,
        availableQuantity: 166,
        reservedQuantity: 12,
        lowStockThreshold: 25,
        status: 'AVAILABLE',
        notes: 'Stock demo des produits d oeufs.'
      },
      create: {
        id: 'demo-stock-eggs',
        farmId: farm.id,
        productionRecordId: eggRecord.id,
        productName: 'Oeufs frais',
        productionType: 'EGGS',
        unit: 'plateaux',
        totalQuantity: 202,
        availableQuantity: 166,
        reservedQuantity: 12,
        lowStockThreshold: 25,
        status: 'AVAILABLE',
        notes: 'Stock demo des produits d oeufs.'
      }
    });

    const fishStock = await tx.productStock.upsert({
      where: { id: 'demo-stock-fish' },
      update: {
        farmId: farm.id,
        productionRecordId: fishHarvestRecord.id,
        productName: 'Poissons frais',
        productionType: 'FISH_HARVEST',
        unit: 'kg',
        totalQuantity: 408,
        availableQuantity: 360,
        reservedQuantity: 18,
        lowStockThreshold: 40,
        status: 'AVAILABLE',
        notes: 'Stock demo piscicole.'
      },
      create: {
        id: 'demo-stock-fish',
        farmId: farm.id,
        productionRecordId: fishHarvestRecord.id,
        productName: 'Poissons frais',
        productionType: 'FISH_HARVEST',
        unit: 'kg',
        totalQuantity: 408,
        availableQuantity: 360,
        reservedQuantity: 18,
        lowStockThreshold: 40,
        status: 'AVAILABLE',
        notes: 'Stock demo piscicole.'
      }
    });

    await tx.productSale.upsert({
      where: { saleCode: 'SALE-2026-0001' },
      update: {
        farmId: farm.id,
        stockId: eggStock.id,
        productionRecordId: eggRecord.id,
        productName: 'Oeufs frais',
        quantitySold: 36,
        unit: 'plateaux',
        unitPrice: 6000,
        totalAmount: 216000,
        amountPaid: 150000,
        remainingAmount: 66000,
        paymentMethod: 'MOBILE_MONEY',
        customerName: 'Boutique Locale Demo',
        saleDate: startOfToday(-1),
        notes: 'Vente de demonstration des produits d oeufs.',
        createdByUserId: admin.id
      },
      create: {
        saleCode: 'SALE-2026-0001',
        farmId: farm.id,
        stockId: eggStock.id,
        productionRecordId: eggRecord.id,
        productName: 'Oeufs frais',
        quantitySold: 36,
        unit: 'plateaux',
        unitPrice: 6000,
        totalAmount: 216000,
        amountPaid: 150000,
        remainingAmount: 66000,
        paymentMethod: 'MOBILE_MONEY',
        customerName: 'Boutique Locale Demo',
        saleDate: startOfToday(-1),
        notes: 'Vente de demonstration des produits d oeufs.',
        createdByUserId: admin.id
      }
    });

    await tx.financialTransaction.upsert({
      where: { id: 'demo-finance-eggs' },
      update: {
        farmId: farm.id,
        transactionType: 'REVENU',
        category: 'Vente oeufs',
        amount: 216000,
        transactionDate: startOfToday(-1),
        referenceModule: 'PRODUCTION',
        notes: 'Vente demo des oeufs.',
        recordedByUserId: admin.id
      },
      create: {
        id: 'demo-finance-eggs',
        farmId: farm.id,
        transactionType: 'REVENU',
        category: 'Vente oeufs',
        amount: 216000,
        transactionDate: startOfToday(-1),
        referenceModule: 'PRODUCTION',
        notes: 'Vente demo des oeufs.',
        recordedByUserId: admin.id
      }
    });

    await tx.financialTransaction.upsert({
      where: { id: 'demo-finance-fish-feed' },
      update: {
        farmId: farm.id,
        transactionType: 'DEPENSE',
        category: 'Aliment pisciculture',
        amount: 5600,
        transactionDate: startOfToday(-2),
        referenceModule: 'PISCICULTURE',
        notes: 'Aliment pour le bassin demo.',
        recordedByUserId: admin.id
      },
      create: {
        id: 'demo-finance-fish-feed',
        farmId: farm.id,
        transactionType: 'DEPENSE',
        category: 'Aliment pisciculture',
        amount: 5600,
        transactionDate: startOfToday(-2),
        referenceModule: 'PISCICULTURE',
        notes: 'Aliment pour le bassin demo.',
        recordedByUserId: admin.id
      }
    });
  });

  console.log('Demo seed created:', {
    adminEmail: DEMO_ADMIN.email,
    adminPassword: DEMO_ADMIN.password,
    ownerEmail: DEMO_OWNER.email,
    ownerPassword: DEMO_OWNER.password,
    farmId: farm.id
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
