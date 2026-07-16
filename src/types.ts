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
  name: string;
  species: string;
  breed: string;
  buildingId: string;
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
  stockCount: number;
}

export interface AnimalFeeding {
  id: string;
  lotId: string;
  lotName?: string;
  articleId: string;
  articleName: string;
  date: string;
  time?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface FishBassin {
  id: string;
  name: string;
  species: string;
  initialCount: number;
  currentCount: number;
  mortalityCount: number;
  stockingDate: string;
  harvestDate?: string;
  status: 'active' | 'harvested' | 'inactive';
  waterTemperature?: number;
  waterPh?: number;
  unitCost?: number;
  acquisitionCost?: number;
}

export interface CultureParcelle {
  id: string;
  name: string;
  area: number;
  soilType: string;
  status: 'cultivated' | 'fallow' | 'preparing';
  cropId?: string;
}

export interface Campaign {
  id: string;
  parcelleId: string;
  cropType: string;
  variety: string;
  startDate: string;
  endDate?: string;
  status: 'preparing' | 'sown' | 'growing' | 'harvested' | 'cancelled';
  expectedYield?: number;
  actualYield?: number;
  expenses: number;
  revenues: number;
}

export interface StockCategoryOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface SupplierOption {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface StockRelationOption {
  id: string;
  label: string;
  type: string;
  businessModule: 'livestock' | 'aquaculture' | 'crops' | 'infrastructure' | 'general';
}

export interface StockArticle {
  id: string;
  name: string;
  reference?: string;
  category: string;
  categoryId?: string;
  categoryLabel?: string;
  description?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  batchNumber?: string;
  purchaseDate?: string;
  manufacturingDate?: string;
  expirationDate?: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  minimumStock?: number;
  maximumStock?: number;
  locationId: string;
  storageLocation?: string;
  unitCost?: number;
  totalPurchasePrice?: number;
  currency?: string;
  imageUrl?: string;
  notes?: string;
  isActive?: boolean;
  businessModule?: 'livestock' | 'aquaculture' | 'crops' | 'infrastructure' | 'general';
  relatedType?: string;
  relatedId?: string;
}

export interface StockArticleInput extends Omit<StockArticle, 'id'> {
  imageFile?: File | null;
}

export interface StockMovement {
  id: string;
  articleId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  date: string;
  reason: string;
  sourceModule?: string;
  sourceElementId?: string;
  unitCost?: number | null;
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  sourceModule: string;
  sourceElementId?: string;
}

export interface SanitaryTreatment {
  id: string;
  lotId: string;
  type: 'vaccine' | 'treatment';
  name: string;
  date: string;
  dosage: string;
  productId: string;
  quantityUsed: number;
  status: 'planned' | 'completed' | 'cancelled';
  cost: number;
}

export interface Building {
  id: string;
  name: string;
  type: 'poulailler' | 'etable' | 'pisciculture' | 'magasin' | 'autre';
  capacity: number;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  sourceModule: string;
  sourceElementId?: string;
  sourceEntityType?: string;
  farmId?: string | number;
  startDate: string;
  dueDate: string;
  dueAt?: string;
  reminderAt?: string;
  priority: Priority;
  status: TaskStatus;
  assignedTo?: string;
  reminderTime?: string;
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
  user: string;
  module: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  device: string;
  syncStatus: SyncStatus;
}

export interface FarmSettings {
  name: string;
  logoUrl?: string;
  location: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  areaUnit: string;
  weightUnit: string;
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
