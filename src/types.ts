/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'owner';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'conflict';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type LotStatus = 'active' | 'archived' | 'sold';

export interface Lot {
  id: string;
  name: string; // e.g. "Poulets Chair Lot A"
  species: string; // e.g. "Volaille", "Bovin", "Porcin"
  breed: string; // e.g. "Cobb 500", "Charolais"
  buildingId: string; // building location
  initialCount: number;
  currentCount: number;
  mortalityCount: number;
  entryDate: string;
  exitDate?: string;
  status: LotStatus;
  notes?: string;
  unitCost?: number;
  acquisitionCost?: number;
}

export interface EggProduction {
  id: string;
  date: string;
  lotId: string;
  collectedCount: number;
  compliantCount: number;
  brokenCount: number;
  lossesCount: number;
  soldCount: number;
  stockCount: number; // remaining in stock
}

export interface FishBassin {
  id: string;
  name: string; // e.g. "Bassin Tilapia A"
  species: string; // e.g. "Tilapia", "Silure"
  initialCount: number;
  currentCount: number;
  mortalityCount: number;
  stockingDate: string;
  harvestDate?: string;
  status: 'active' | 'harvested' | 'inactive';
  waterTemperature?: number; // °C
  waterPh?: number;
  unitCost?: number;
  acquisitionCost?: number;
}

export interface CultureParcelle {
  id: string;
  name: string; // e.g. "Champ Sud Parcelle 1"
  area: number; // in hectares (ha)
  soilType: string; // e.g. "Argileux", "Sableux"
  status: 'cultivated' | 'fallow' | 'preparing';
  cropId?: string;
}

export interface Campaign {
  id: string;
  parcelleId: string;
  cropType: string; // e.g. "Maïs", "Soja", "Tomates"
  variety: string; // e.g. "Pioneer 30F53"
  startDate: string;
  endDate?: string;
  status: 'preparing' | 'sown' | 'growing' | 'harvested' | 'cancelled';
  expectedYield?: number; // tons/ha
  actualYield?: number; // tons
  expenses: number;
  revenues: number;
}

export interface StockArticle {
  id: string;
  name: string; // e.g. "Aliment Pondeuses Démarrage"
  category: 'feed' | 'vaccine' | 'medicine' | 'seed' | 'fertilizer' | 'tool' | 'other';
  quantity: number;
  unit: string; // e.g. "kg", "litres", "doses", "unités"
  minThreshold: number; // alert trigger
  locationId: string; // building / warehouse
}

export interface StockMovement {
  id: string;
  articleId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  date: string;
  reason: string; // e.g. "Achat stock", "Alimentation Lot A", "Ajustement inventaire"
  sourceModule?: string; // e.g. "Elevage", "Pisciculture", "Sanitaire", "Cultures"
  sourceElementId?: string;
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string; // e.g. "Achat Aliment", "Vente Oeufs", "Salarial", "Vaccination"
  amount: number;
  date: string;
  description: string;
  sourceModule: string; // e.g. "Pondeuses", "Elevage", "Stocks", "Sanitaire"
  sourceElementId?: string; // ID of the referenced object
}

export interface SanitaryTreatment {
  id: string;
  lotId: string;
  type: 'vaccine' | 'treatment';
  name: string; // e.g. "Vaccin Newcastle"
  date: string;
  dosage: string; // e.g. "0.5 ml/sujet"
  productId: string; // articleId of the vaccine/medicine in stock
  quantityUsed: number;
  status: 'planned' | 'completed' | 'cancelled';
  cost: number;
}

export interface Building {
  id: string;
  name: string; // e.g. "Bâtiment Pondeuses 1", "Magasin d'Intrants"
  type: 'poulailler' | 'étable' | 'pisciculture' | 'magasin' | 'autre';
  capacity: number; // maximum animal count or weight
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  sourceModule: string; // e.g. "Sanitaire", "Stocks", "Pisciculture", "Ferme"
  sourceElementId?: string;
  sourceEntityType?: string;
  farmId?: string | number;
  startDate: string;
  dueDate: string;
  dueAt?: string;
  reminderAt?: string;
  priority: Priority;
  status: TaskStatus;
  assignedTo?: string; // e.g. "Ouvrier A"
  reminderTime?: string; // e.g. "08:00"
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  date: string;
  read: boolean;
  sourceModule?: string;
  sourceElementId?: string;
  status?: string;
  type?: string;
}

export interface AuditLog {
  id: string;
  user: string; // "Admin" or "Propriétaire"
  module: string;
  action: string; // "Création d'un lot", "Ajustement de stock", etc.
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  device: string; // e.g. "iPhone 14", "Safari Desktop"
  syncStatus: SyncStatus;
}

export interface FarmSettings {
  name: string;
  logoUrl?: string;
  location: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string; // e.g. "FCFA", "EUR", "USD"
  areaUnit: string; // e.g. "ha", "m²"
  weightUnit: string; // e.g. "kg", "g"
  eggTrayDefaultPrice?: number;
  fishKgDefaultPrice?: number;
  cropKgDefaultPrice?: number;
  lowStockThreshold?: number;
  mortailiteThresholdLayers?: number;
  mortailiteThresholdFish?: number;
  eggBreakageThreshold?: number;
  layingRateLowThreshold?: number;
  fishPhMin?: number;
  fishPhMax?: number;
  fishOxygenMin?: number;
  fishTemperatureMin?: number;
  fishTemperatureMax?: number;
  cropYieldLowThreshold?: number;
  defaultReminder24h?: boolean;
  defaultReminder6h?: boolean;
  defaultReminder1h?: boolean;
  alarmSoundEnabled?: boolean;
  alarmLoopEnabled?: boolean;
  alarmForWarnings?: boolean;
  alarmForCriticals?: boolean;
  alarmVolume?: number;
  alarmSoundKey?: string;
  taskCategories?: string[];
  taskPriorities?: string[];
  alertRules?: unknown[];
}

export interface StockArticle {
  unitCost?: number;
}

export interface StockMovement {
  unitCost?: number | null;
}
