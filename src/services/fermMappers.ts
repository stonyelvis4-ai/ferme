/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Alert,
  AuditLog,
  Building,
  Campaign,
  CultureParcelle,
  EggProduction,
  FarmSettings,
  FinanceTransaction,
  FishBassin,
  Lot,
  SanitaryTreatment,
  StockArticle,
  StockCategoryOption,
  StockMovement,
  StockRelationOption,
  SupplierOption,
  Task,
} from '../types';
import { AuthUser } from './fermApi';

const toText = (value: unknown, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toDate = (value: unknown, fallback = new Date().toISOString().split('T')[0]) => {
  if (!value) return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().split('T')[0];
};

const toDateTime = (value: unknown) => {
  if (!value) return new Date().toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const labelOrFallback = (value: unknown, fallback: string) => {
  const text = toText(value, '');
  return text || fallback;
};

export function mapAuthUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') return null;
  const item = data as Record<string, unknown>;

  return {
    id: item.id as string | number,
    name: toText(item.name, 'Utilisateur'),
    email: toText(item.email, ''),
    role: (toText(item.role, 'owner') as AuthUser['role']) || 'owner',
    account_status: toText(item.account_status, 'active'),
    is_active: Boolean(item.is_active ?? true),
    farm_id: (item.farm_id as string | number | null | undefined) ?? null,
    last_login_at: item.last_login_at ? toText(item.last_login_at, null as unknown as string) : null,
    last_activity_at: item.last_activity_at ? toText(item.last_activity_at, null as unknown as string) : null,
  };
}

export function mapSettings(data: unknown): FarmSettings {
  const settings = (data ?? {}) as Record<string, unknown>;
  const alertRules = Array.isArray(settings.alert_rules ?? settings.alertRules)
    ? ((settings.alert_rules ?? settings.alertRules) as unknown[])
    : [];
  const alarmPreferences =
    (alertRules.find((rule) => {
      if (!rule || typeof rule !== 'object') return false;
      return (rule as Record<string, unknown>).type === 'alarm_preferences';
    }) as Record<string, unknown> | undefined) ?? {};

  return {
    name: labelOrFallback(settings.name, 'FERM+'),
    logoUrl: toText(settings.logo_url ?? settings.logoUrl, ''),
    location: labelOrFallback(settings.location, 'Non renseignée'),
    managerName: labelOrFallback(settings.manager_name ?? settings.managerName, 'Admin FERM+'),
    contactEmail: labelOrFallback(settings.contact_email ?? settings.contactEmail, 'contact@ferm.plus'),
    contactPhone: labelOrFallback(settings.contact_phone ?? settings.contactPhone, ''),
    currency: labelOrFallback(settings.currency, 'FCFA'),
    areaUnit: labelOrFallback(settings.area_unit ?? settings.areaUnit, 'ha'),
    weightUnit: labelOrFallback(settings.weight_unit ?? settings.weightUnit, 'kg'),
    eggTrayDefaultPrice: toNumber(settings.egg_tray_default_price ?? settings.eggTrayDefaultPrice, 0),
    fishKgDefaultPrice: toNumber(settings.fish_kg_default_price ?? settings.fishKgDefaultPrice, 0),
    cropKgDefaultPrice: toNumber(settings.crop_kg_default_price ?? settings.cropKgDefaultPrice, 0),
    lowStockThreshold: toNumber(settings.low_stock_threshold ?? settings.lowStockThreshold, 0),
    mortailiteThresholdLayers: toNumber(settings.mortalite_threshold_layers ?? settings.mortailiteThresholdLayers, 0),
    mortailiteThresholdFish: toNumber(settings.mortalite_threshold_fish ?? settings.mortailiteThresholdFish, 0),
    eggBreakageThreshold: toNumber(settings.egg_breakage_threshold ?? settings.eggBreakageThreshold, 0),
    layingRateLowThreshold: toNumber(settings.laying_rate_low_threshold ?? settings.layingRateLowThreshold, 0),
    fishPhMin: toNumber(settings.fish_ph_min ?? settings.fishPhMin, 0),
    fishPhMax: toNumber(settings.fish_ph_max ?? settings.fishPhMax, 0),
    fishOxygenMin: toNumber(settings.fish_oxygen_min ?? settings.fishOxygenMin, 0),
    fishTemperatureMin: toNumber(settings.fish_temperature_min ?? settings.fishTemperatureMin, 0),
    fishTemperatureMax: toNumber(settings.fish_temperature_max ?? settings.fishTemperatureMax, 0),
    cropYieldLowThreshold: toNumber(settings.crop_yield_low_threshold ?? settings.cropYieldLowThreshold, 0),
    defaultReminder24h: Boolean(settings.default_reminder_24h ?? settings.defaultReminder24h ?? true),
    defaultReminder6h: Boolean(settings.default_reminder_6h ?? settings.defaultReminder6h ?? true),
    defaultReminder1h: Boolean(settings.default_reminder_1h ?? settings.defaultReminder1h ?? true),
    alarmSoundEnabled: Boolean(settings.alarm_sound_enabled ?? settings.alarmSoundEnabled ?? alarmPreferences.sound_enabled ?? true),
    alarmLoopEnabled: Boolean(settings.alarm_loop_enabled ?? settings.alarmLoopEnabled ?? alarmPreferences.loop_enabled ?? true),
    alarmForWarnings: Boolean(settings.alarm_for_warnings ?? settings.alarmForWarnings ?? alarmPreferences.for_warnings ?? true),
    alarmForCriticals: Boolean(settings.alarm_for_criticals ?? settings.alarmForCriticals ?? alarmPreferences.for_criticals ?? true),
    alarmVolume: toNumber(settings.alarm_volume ?? settings.alarmVolume ?? alarmPreferences.volume ?? 100, 100),
    alarmSoundKey: toText(settings.alarm_sound_key ?? settings.alarmSoundKey ?? alarmPreferences.sound_key, 'ferm-plus-default'),
    taskCategories: Array.isArray(settings.task_categories ?? settings.taskCategories)
      ? ((settings.task_categories ?? settings.taskCategories) as string[])
      : [],
    taskPriorities: Array.isArray(settings.task_priorities ?? settings.taskPriorities)
      ? ((settings.task_priorities ?? settings.taskPriorities) as string[])
      : [],
    alertRules,
  };
}

export function mapLots(data: unknown[]): Lot[] {
  return data.map((item, index) => {
    const lot = item as Record<string, unknown>;
    const initialCount = toNumber(lot.initial_count ?? lot.initialCount, 0);
    const mortalityCount = toNumber(lot.mortality_total ?? lot.mortalityCount, 0);
    const reformCount = toNumber(lot.reform_total ?? lot.reformCount, 0);
    return {
      id: toText(lot.id, `lot-${index + 1}`),
      name: labelOrFallback(lot.name, 'Lot'),
      species: labelOrFallback(lot.species, 'Volaille'),
      breed: labelOrFallback(lot.breed, ''),
      buildingId: toText(lot.building_id ?? lot.buildingId, ''),
      initialCount,
      currentCount: toNumber(lot.current_count ?? lot.currentCount, Math.max(initialCount - mortalityCount - reformCount, 0)),
      mortalityCount,
      entryDate: toDate(lot.entry_date ?? lot.entryDate),
      exitDate: lot.exit_date ? toDate(lot.exit_date) : lot.exitDate ? toDate(lot.exitDate) : undefined,
      status: (toText(lot.status, 'active') as Lot['status']) || 'active',
      notes: toText(lot.notes, ''),
      unitCost: toNumber(lot.unit_cost ?? lot.unitCost, 0),
      acquisitionCost: toNumber(lot.acquisition_cost ?? lot.acquisitionCost, 0),
    };
  });
}

export function mapEggProductions(data: unknown[]): EggProduction[] {
  let stock = 0;
  return data
    .slice()
    .sort((a, b) => new Date(String((a as Record<string, unknown>).production_date ?? (a as Record<string, unknown>).date ?? '')).getTime()
      - new Date(String((b as Record<string, unknown>).production_date ?? (b as Record<string, unknown>).date ?? '')).getTime())
    .map((item, index) => {
      const prod = item as Record<string, unknown>;
      const produced = toNumber(prod.eggs_produced ?? prod.collectedCount, 0);
      const compliant = toNumber(prod.vendable_eggs ?? prod.compliantCount, Math.max(produced - toNumber(prod.broken_eggs ?? prod.brokenCount, 0) - toNumber(prod.dirty_eggs ?? prod.lossesCount, 0) - toNumber(prod.lost_eggs ?? 0, 0), 0));
      stock += compliant;
      return {
        id: toText(prod.id, `egg-${index + 1}`),
        date: toDate(prod.production_date ?? prod.date),
        lotId: toText(prod.layer_batch_id ?? prod.lotId, ''),
        collectedCount: produced,
        compliantCount: compliant,
        brokenCount: toNumber(prod.broken_eggs ?? prod.brokenCount, 0),
        lossesCount: toNumber(prod.dirty_eggs ?? prod.lossesCount, toNumber(prod.lost_eggs ?? 0, 0)),
        soldCount: toNumber(prod.sold_count ?? prod.soldCount, 0),
        stockCount: stock,
      };
    });
}

export function mapFishBassins(data: unknown[]): FishBassin[] {
  return data.map((item, index) => {
    const pond = item as Record<string, unknown>;
    return {
      id: toText(pond.id, `pond-${index + 1}`),
      name: labelOrFallback(pond.name, 'Bassin'),
      species: labelOrFallback(pond.species, 'Poisson'),
      initialCount: toNumber(pond.initial_fish_count ?? pond.initialCount, 0),
      currentCount: toNumber(pond.current_estimated_count ?? pond.currentCount, 0),
      mortalityCount: toNumber(pond.mortality_total ?? pond.mortalityCount, 0),
      stockingDate: toDate(pond.stocking_date ?? pond.stockingDate),
      harvestDate: pond.harvest_date ? toDate(pond.harvest_date) : pond.harvestDate ? toDate(pond.harvestDate) : undefined,
      status: (toText(pond.status, 'active') as FishBassin['status']) || 'active',
      waterTemperature: pond.water_temperature ?? pond.waterTemperature ? toNumber(pond.water_temperature ?? pond.waterTemperature, 0) : undefined,
      waterPh: pond.ph ?? pond.water_ph ?? pond.waterPh ? toNumber(pond.ph ?? pond.water_ph ?? pond.waterPh, 0) : undefined,
      unitCost: toNumber(pond.unit_cost ?? pond.unitCost, 0),
      acquisitionCost: toNumber(pond.acquisition_cost ?? pond.acquisitionCost, 0),
    };
  });
}

export function mapParcelles(data: unknown[]): CultureParcelle[] {
  return data.map((item, index) => {
    const plot = item as Record<string, unknown>;
    return {
      id: toText(plot.id, `plot-${index + 1}`),
      name: labelOrFallback(plot.name, 'Parcelle'),
      area: toNumber(plot.area, 0),
      soilType: labelOrFallback(plot.soil_type ?? plot.soilType, 'Inconnu'),
      status: (toText(plot.status, 'fallow') as CultureParcelle['status']) || 'fallow',
      cropId: toText(plot.crop_id ?? plot.cropId, ''),
    };
  });
}

export function mapCampaigns(data: unknown[], plots: unknown[] = []): Campaign[] {
  return data.map((item, index) => {
    const crop = item as Record<string, unknown>;
    const linkedPlot = plots.find((plot) => {
      if (!plot || typeof plot !== 'object') return false;
      const plotRecord = plot as Record<string, unknown>;
      return String(plotRecord.crop_id ?? plotRecord.cropId ?? '') === String(crop.id ?? '');
    }) as Record<string, unknown> | undefined;

    return {
      id: toText(crop.id, `crop-${index + 1}`),
      parcelleId: toText(crop.plot_id ?? crop.parcelleId ?? linkedPlot?.id, ''),
      cropType: labelOrFallback(crop.name, 'Culture'),
      variety: labelOrFallback(crop.variety, ''),
      startDate: toDate(crop.planting_date ?? crop.startDate),
      endDate: crop.estimated_harvest_date ? toDate(crop.estimated_harvest_date) : crop.endDate ? toDate(crop.endDate) : undefined,
      status: (toText(crop.status, 'preparing') as Campaign['status']) || 'preparing',
      expectedYield: toNumber(crop.expected_yield_kg ?? crop.expectedYield, 0),
      actualYield: toNumber(crop.total_harvest_kg ?? crop.actualYield, 0),
      expenses: toNumber(crop.total_operations_cost ?? crop.expenses, 0),
      revenues: toNumber(crop.revenues, 0),
    };
  });
}

export function mapArticles(data: unknown[]): StockArticle[] {
  return data.map((item, index) => {
    const stock = item as Record<string, unknown>;
    const categoryRelation = (stock.category_relation ?? stock.categoryRelation) as Record<string, unknown> | undefined;
    const supplier = stock.supplier as Record<string, unknown> | undefined;
    const storageLocation = toText(stock.storage_location ?? stock.storageLocation ?? stock.location ?? stock.locationId, '');
    const minimumStock = toNumber(stock.minimum_threshold ?? stock.minimumStock ?? stock.minThreshold, 0);
    return {
      id: toText(stock.id, `stock-${index + 1}`),
      name: labelOrFallback(stock.name, 'Stock'),
      reference: toText(stock.reference, ''),
      category: toText(stock.category, 'other'),
      categoryId: toText(stock.category_id ?? stock.categoryId ?? categoryRelation?.id, ''),
      categoryLabel: toText(categoryRelation?.name, toText(stock.category, 'Autre')),
      description: toText(stock.description, ''),
      brand: toText(stock.brand, ''),
      supplierId: toText(stock.supplier_id ?? stock.supplierId ?? supplier?.id, ''),
      supplierName: toText(supplier?.name, ''),
      batchNumber: toText(stock.batch_number ?? stock.batchNumber, ''),
      purchaseDate: stock.purchase_date ? toDate(stock.purchase_date) : stock.purchaseDate ? toDate(stock.purchaseDate) : undefined,
      manufacturingDate: stock.manufacturing_date ? toDate(stock.manufacturing_date) : stock.manufacturingDate ? toDate(stock.manufacturingDate) : undefined,
      expirationDate: stock.expiration_date ? toDate(stock.expiration_date) : stock.expirationDate ? toDate(stock.expirationDate) : undefined,
      quantity: toNumber(stock.current_quantity ?? stock.quantity, 0),
      unitCost: toNumber(stock.unit_cost ?? stock.unitCost, 0),
      totalPurchasePrice: toNumber(stock.purchase_total_cost ?? stock.totalPurchasePrice, 0),
      unit: labelOrFallback(stock.unit, 'u'),
      minThreshold: minimumStock,
      minimumStock,
      maximumStock: stock.maximum_stock ?? stock.maximumStock ? toNumber(stock.maximum_stock ?? stock.maximumStock, 0) : undefined,
      locationId: storageLocation,
      storageLocation,
      currency: toText(stock.currency, 'XOF'),
      imageUrl: toText(stock.image_path ?? stock.imageUrl, ''),
      notes: toText(stock.notes, ''),
      isActive: Boolean(stock.is_active ?? stock.isActive ?? true),
      businessModule: (toText(stock.business_module ?? stock.businessModule, 'general') as StockArticle['businessModule']) || 'general',
      relatedType: toText(stock.related_type ?? stock.relatedType, ''),
      relatedId: toText(stock.related_id ?? stock.relatedId, ''),
    };
  });
}

export function mapStockCategories(data: unknown[]): StockCategoryOption[] {
  return data.map((item, index) => {
    const category = item as Record<string, unknown>;
    return {
      id: toText(category.id, `category-${index + 1}`),
      name: labelOrFallback(category.name, 'Catégorie'),
      slug: toText(category.slug, 'other'),
      description: toText(category.description, ''),
      isActive: Boolean(category.is_active ?? category.isActive ?? true),
    };
  });
}

export function mapSuppliers(data: unknown[]): SupplierOption[] {
  return data.map((item, index) => {
    const supplier = item as Record<string, unknown>;
    return {
      id: toText(supplier.id, `supplier-${index + 1}`),
      name: labelOrFallback(supplier.name, 'Fournisseur'),
      contactName: toText(supplier.contact_name ?? supplier.contactName, ''),
      phone: toText(supplier.phone, ''),
      email: toText(supplier.email, ''),
      isActive: Boolean(supplier.is_active ?? supplier.isActive ?? true),
    };
  });
}

export function mapStockRelations(data: unknown[]): StockRelationOption[] {
  return data.map((item, index) => {
    const relation = item as Record<string, unknown>;
    return {
      id: toText(relation.id, `relation-${index + 1}`),
      label: labelOrFallback(relation.label, 'Élément'),
      type: toText(relation.type, 'general'),
      businessModule: (toText(relation.business_module ?? relation.businessModule, 'general') as StockRelationOption['businessModule']) || 'general',
    };
  });
}

export function mapMovements(data: unknown[]): StockMovement[] {
  return data.map((item, index) => {
    const movement = item as Record<string, unknown>;
    return {
      id: toText(movement.id, `mov-${index + 1}`),
      articleId: toText(movement.stock_item_id ?? movement.articleId, ''),
      type: (toText(movement.type, 'adjustment') as StockMovement['type']) || 'adjustment',
      quantity: toNumber(movement.quantity, 0),
      unitCost: movement.unit_cost === null ? null : toNumber(movement.unit_cost ?? movement.unitCost, 0),
      date: toDate(movement.created_at ?? movement.date),
      reason: labelOrFallback(movement.source_module ?? movement.reason, ''),
      sourceModule: toText(movement.source_module ?? movement.sourceModule, ''),
      sourceElementId: toText(movement.source_entity_id ?? movement.sourceElementId, ''),
    };
  });
}

export function mapTransactions(data: unknown[]): FinanceTransaction[] {
  return data.map((item, index) => {
    const tx = item as Record<string, unknown>;
    return {
      id: toText(tx.id, `tx-${index + 1}`),
      type: (toText(tx.type, 'expense') as FinanceTransaction['type']) || 'expense',
      category: labelOrFallback(tx.category, 'Autre'),
      amount: toNumber(tx.amount, 0),
      date: toDate(tx.occurred_at ?? tx.date),
      description: labelOrFallback(tx.description, ''),
      sourceModule: labelOrFallback(tx.source_module ?? tx.sourceModule, 'Finances'),
      sourceElementId: toText(tx.source_entity_id ?? tx.sourceElementId, ''),
    };
  });
}

export function mapTreatments(data: unknown[]): SanitaryTreatment[] {
  return data.map((item, index) => {
    const treatment = item as Record<string, unknown>;
    return {
      id: toText(treatment.id, `treatment-${index + 1}`),
      lotId: toText(treatment.layer_batch_id ?? treatment.lotId, ''),
      type: (toText(treatment.type, 'treatment') as SanitaryTreatment['type']) || 'treatment',
      name: labelOrFallback(treatment.name, 'Traitement'),
      date: toDate(treatment.planned_date ?? treatment.date),
      dosage: labelOrFallback(treatment.dosage, ''),
      productId: toText(treatment.product_id ?? treatment.productId, ''),
      quantityUsed: toNumber(treatment.quantity_used ?? treatment.quantityUsed, 0),
      status: (toText(treatment.status, 'planned') as SanitaryTreatment['status']) || 'planned',
      cost: toNumber(treatment.cost, 0),
    };
  });
}

export function mapBuildings(data: unknown[]): Building[] {
  return data.map((item, index) => {
    const building = item as Record<string, unknown>;
    return {
      id: toText(building.id, `building-${index + 1}`),
      name: labelOrFallback(building.name, 'Bâtiment'),
      type: (toText(building.type, 'autre') as Building['type']) || 'autre',
      capacity: toNumber(building.capacity, 0),
      notes: toText(building.notes, ''),
    };
  });
}

export function mapEnclosureCount(data: unknown[]) {
  return data.length;
}

export function mapTasks(data: unknown[], users: AuthUser[] = []): Task[] {
  return data.map((item, index) => {
    const task = item as Record<string, unknown>;
    const assigneeId = task.assigned_to ?? task.assignedTo;
    const assignee = users.find((user) => String(user.id) === String(assigneeId));
    const dueAt = task.due_at ?? task.dueAt;
    const reminderAt = task.reminder_at ?? task.reminderAt;
    const rawFarmId = task.farm_id ?? task.farmId;

    return {
      id: toText(task.id, `task-${index + 1}`),
      title: labelOrFallback(task.title, 'Tâche'),
      description: labelOrFallback(task.description, ''),
      sourceModule: labelOrFallback(task.source_module ?? task.sourceModule, 'Ferme'),
      sourceElementId: toText(task.source_entity_id ?? task.sourceElementId, ''),
      sourceEntityType: toText(task.source_entity_type ?? task.sourceEntityType, ''),
      farmId: rawFarmId === null || rawFarmId === undefined ? undefined : (rawFarmId as string | number),
      startDate: toDate(task.created_at ?? task.startDate ?? dueAt),
      dueDate: toDate(dueAt),
      dueAt: dueAt ? toDateTime(dueAt) : undefined,
      reminderAt: reminderAt ? toDateTime(reminderAt) : undefined,
      priority: (toText(task.priority, 'normal') as Task['priority']) || 'normal',
      status: (toText(task.status, 'todo') as Task['status']) || 'todo',
      assignedTo: assignee?.name ?? (assigneeId !== undefined && assigneeId !== null ? String(assigneeId) : undefined),
      reminderTime: reminderAt
        ? new Date(String(reminderAt)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : undefined,
    };
  });
}

export function mapAlerts(data: unknown[]): Alert[] {
  return data.map((item, index) => {
    const alert = item as Record<string, unknown>;
    const status = toText(alert.status, 'open');
    return {
      id: toText(alert.id, `alert-${index + 1}`),
      title: labelOrFallback(alert.title, 'Alerte'),
      description: labelOrFallback(alert.description, ''),
      severity: (toText(alert.severity, 'info') as Alert['severity']) || 'info',
      date: toDateTime(alert.created_at ?? alert.date ?? alert.updated_at),
      read: status === 'resolved' || status === 'closed' || Boolean(alert.resolved_at),
      sourceModule: toText(alert.source_module ?? alert.sourceModule, ''),
      sourceElementId: toText(alert.source_entity_id ?? alert.sourceElementId, ''),
      status,
      type: toText(alert.type, ''),
    };
  });
}

export function mapAuditLogs(data: unknown[]): AuditLog[] {
  return data.map((item, index) => {
    const log = item as Record<string, unknown>;
    const user = log.user as Record<string, unknown> | undefined;
    return {
      id: toText(log.id, `audit-${index + 1}`),
      user:
        toText(log.user_name, '') ||
        toText(user?.name, '') ||
        toText(log.actor_name, '') ||
        `Utilisateur ${toText(log.user_id, '')}`,
      module: labelOrFallback(log.module, 'Système'),
      action: labelOrFallback(log.action, ''),
      oldValue: toText(log.old_value ?? log.oldValue, ''),
      newValue: toText(log.new_value ?? log.newValue, ''),
      timestamp: toDateTime(log.created_at ?? log.timestamp),
      device: toText(log.source ?? log.device, 'web'),
      syncStatus: 'synced',
    };
  });
}
