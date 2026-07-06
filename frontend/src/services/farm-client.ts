import { apiFetch } from './api-client';

export interface FarmSummary {
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
  status: FarmSummary['status'];
  activityType: FarmSummary['activityType'];
  ownerUserId?: string;
}

export interface UpdateFarmInput {
  name?: string;
  description?: string;
  location?: string;
  surfaceArea?: number;
  status?: FarmSummary['status'];
  activityType?: FarmSummary['activityType'];
}

export interface FarmOwnerOption {
  id: string;
  fullName: string;
  email: string;
}

export interface AgendaTaskView {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  scheduledFor: string;
  scheduledLabel: string;
  status: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';
  category: string;
  sourceModule: string | null;
  sourceRecordId: string | null;
  linkedModule: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedEntityLabel: string | null;
  reminderPreset: string | null;
  repeatRule: string;
  repeatEvery: number | null;
  notes: string | null;
}

export interface CreateAgendaTaskInput {
  title: string;
  description: string;
  priority: AgendaTaskView['priority'];
  scheduledFor: string;
  category?: string;
  status?: AgendaTaskView['status'];
  linkedModule?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  linkedEntityLabel?: string;
  reminderPreset?: string;
  repeatRule?: string;
  repeatEvery?: number;
  notes?: string;
}

export interface AgendaViewResponse {
  today: AgendaTaskView[];
  upcoming: AgendaTaskView[];
  completed: AgendaTaskView[];
  overdue: AgendaTaskView[];
  cancelled: AgendaTaskView[];
  alerts: Array<{
    id: string;
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
  }>;
}

export interface AlertView {
  id: string;
  type: 'REMINDER' | 'OPERATIONAL' | 'SYSTEM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
  title: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  sourceModule: string | null;
  sourceRecordId: string | null;
  dueAt: string | null;
  readAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  ignoredAt: string | null;
  createdAt: string;
}

export interface StockItemView {
  id: string;
  category: 'ALIMENTS' | 'MEDICAMENTS' | 'SEMENCES' | 'ENGRAIS' | 'EQUIPEMENTS' | 'MATERIELS';
  name: string;
  unit: string;
  currentQuantity: number;
  lowStockThreshold: number;
  stockStatus: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK';
  quantityGapToThreshold: number;
  recommendedReorderQuantity: number;
}

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

export interface FinancialTransactionView {
  id: string;
  transactionType: 'DEPENSE' | 'REVENU';
  category: string;
  amount: number;
  transactionDate: string;
  referenceModule: string | null;
  notes: string;
  recordedByUserName: string;
}

export interface FinanceSummaryView {
  totalRevenue: number;
  totalExpense: number;
  balance: number;
  marginRate: number;
  averageRevenueTicket: number;
  averageExpenseTicket: number;
  currentMonthRevenue: number;
  currentMonthExpense: number;
  currentMonthBalance: number;
  previousMonthBalance: number;
  balanceTrend: number;
  topExpenseCategory: { category: string; amount: number } | null;
  topRevenueCategory: { category: string; amount: number } | null;
}

export interface FinanceTransactionFilters {
  transactionType?: FinancialTransactionView['transactionType'] | 'ALL';
  from?: string;
  to?: string;
  category?: string;
}

export interface SanitaryEventView {
  id: string;
  animalGroupId: string | null;
  animalLabel: string | null;
  eventType: 'MALADIE' | 'VACCINATION' | 'TRAITEMENT' | 'CONSULTATION' | 'MORTALITE' | 'CONTROLE';
  eventDate: string;
  status: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'CRITIQUE';
  isAutoGenerated: boolean;
  protocolLabel: string | null;
  notes: string;
  recordedByUserName: string;
}

export interface FarmDashboardView {
  farm: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'EN_PREPARATION' | 'SUSPENDUE' | 'FERMEE';
    activityType: 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
    location: string;
  };
  metrics: {
    animals: number;
    activeAnimals: number;
    stockItems: number;
    lowStockItems: number;
    sanitaryEvents: number;
    criticalSanitaryEvents: number;
    revenue: number;
    expenses: number;
    balance: number;
    agendaToday: number;
    overdueTasks: number;
    unreadAlerts: number;
  };
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    createdAt: string;
  }>;
}

export interface GeneratedReportView {
  reportType: 'TECHNIQUE' | 'SANITAIRE' | 'FINANCIER' | 'PRODUCTION' | 'RENTABILITE';
  format: 'PDF' | 'XLSX';
  reportId: string;
  generatedAt: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  summary: string;
  sections: Array<{
    title: string;
    lines: string[];
  }>;
  content: string;
}

export interface ReportHistoryView {
  id: string;
  reportType: 'TECHNIQUE' | 'SANITAIRE' | 'FINANCIER' | 'PRODUCTION' | 'RENTABILITE';
  format: 'PDF' | 'XLSX';
  generatedAt: string;
  fileName: string;
  downloadUrl: string;
}

export interface FarmRecommendationView {
  category: 'OPERATIONS' | 'SANITAIRE' | 'STOCK' | 'FINANCE' | 'PRODUCTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  metricLabel: string;
  metricValue: string;
  actionLabel: string;
  actionKey: 'AGENDA' | 'ALERTS' | 'SANITARY' | 'STOCKS' | 'FINANCE' | 'LIVESTOCK' | 'CROPS' | 'DASHBOARD';
}

export interface ProductionRecordView {
  id: string;
  uniqueCode: string;
  sourceType: 'ANIMAL_GROUP' | 'BUILDING' | 'ENCLOSURE' | 'CROP' | 'HARVEST' | 'GENERAL';
  sourceId: string;
  productionType: 'EGGS' | 'FISH_GROWTH' | 'FISH_HARVEST' | 'CROP_HARVEST' | 'GENERAL';
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

export interface ProductStockView {
  id: string;
  productName: string;
  productionType: ProductionRecordView['productionType'];
  unit: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  status: 'AVAILABLE' | 'LOW' | 'OUT_OF_STOCK';
  notes: string | null;
}

export interface ProductSaleView {
  id: string;
  saleCode: string;
  stockId: string;
  productionRecordId: string | null;
  productName: string;
  quantitySold: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD' | 'CREDIT' | 'OTHER';
  customerName: string;
  saleDate: string;
  notes: string | null;
}

export interface SalePaymentView {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: ProductSaleView['paymentMethod'];
  note: string | null;
  sale: {
    id: string;
    amountPaid: number;
    remainingAmount: number;
  };
}

export interface TraceabilityEventView {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  details: string | null;
  productionRecordId: string | null;
  stockId: string | null;
  saleId: string | null;
}

export interface ProductionOverviewView {
  farm: {
    id: string;
    name: string;
    activityType: FarmSummary['activityType'];
  };
  stats: {
    productionToday: number;
    productionTotal: number;
    sellableTotal: number;
    lossesTotal: number;
    stockAvailable: number;
    salesRevenue: number;
    salesPaid: number;
    totalCost: number;
    margin: number;
    rendement: number;
  };
  breakdown: {
    eggs: {
      records: number;
      traysAvailable: number;
      salesRevenue: number;
      averageLayingRate: number;
      mortality: number;
      brokenEggs: number;
      feedCost: number;
    };
    fish: {
      growthRecords: number;
      harvestRecords: number;
      biomass: number;
      averageGrowthRate: number;
      mortality: number;
      feedCost: number;
      averageOxygen: number;
      averagePh: number;
      sellableHarvest: number;
    };
    crops: {
      harvestRecords: number;
      harvestedQuantity: number;
      yieldPerHectare: number;
      losses: number;
      cultivatedArea: number;
    };
    alerts: string[];
  };
  records: ProductionRecordView[];
  stocks: ProductStockView[];
  sales: ProductSaleView[];
  traceability: TraceabilityEventView[];
  options: {
    animalGroups: Array<{
      id: string;
      label: string;
      currentCount: number;
      species: string;
      subtype: string;
    }>;
    crops: Array<{
      id: string;
      label: string;
      cultivatedArea: number;
    }>;
    buildings: Array<{
      id: string;
      name: string;
      buildingType: BuildingView['buildingType'];
    }>;
    enclosures: Array<{
      id: string;
      name: string;
      enclosureType: EnclosureView['enclosureType'];
    }>;
  };
}

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

export async function getFarms(token: string) {
  return apiFetch<{ items: FarmSummary[] }>('/farms', undefined, token);
}

export async function getFarm(farmId: string, token: string) {
  return apiFetch<FarmSummary>(`/farms/${farmId}`, undefined, token);
}

export async function createFarm(input: CreateFarmInput, token: string) {
  return apiFetch<FarmSummary>(
    '/farms',
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateFarm(farmId: string, input: UpdateFarmInput, token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function assignFarmOwner(farmId: string, ownerUserId: string | null, token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}/owner`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ownerUserId })
    },
    token
  );
}

export async function changeFarmStatus(farmId: string, status: FarmSummary['status'], token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status })
    },
    token
  );
}

export async function archiveFarm(farmId: string, token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}/archive`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function deactivateFarm(farmId: string, token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}/deactivate`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function restoreFarm(farmId: string, token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}/restore`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function softDeleteFarm(farmId: string, token: string) {
  return apiFetch<FarmSummary>(
    `/farms/${farmId}`,
    {
      method: 'DELETE'
    },
    token
  );
}

export async function getFarmOwnerOptions(token: string) {
  return apiFetch<{ items: FarmOwnerOption[] }>('/farms/owners/options', undefined, token);
}

export async function getFarmAgenda(farmId: string, token: string) {
  return apiFetch<AgendaViewResponse>(`/farms/${farmId}/agenda`, undefined, token);
}

export async function updateAgendaTaskStatus(
  farmId: string,
  taskId: string,
  input: {
    status?: AgendaTaskView['status'];
    scheduledFor?: string;
  },
  token: string
) {
  return apiFetch<AgendaTaskView>(
    `/farms/${farmId}/agenda/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createAgendaTask(
  farmId: string,
  input: CreateAgendaTaskInput,
  token: string
) {
  return apiFetch<AgendaTaskView>(
    `/farms/${farmId}/agenda/tasks`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmAlerts(farmId: string, token: string) {
  return apiFetch<{ items: AlertView[] }>(`/farms/${farmId}/alerts`, undefined, token);
}

export async function markAlertAsRead(farmId: string, alertId: string, token: string) {
  return apiFetch<AlertView>(
    `/farms/${farmId}/alerts/${alertId}/read`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function acknowledgeAlert(farmId: string, alertId: string, token: string) {
  return apiFetch<AlertView>(
    `/farms/${farmId}/alerts/${alertId}/acknowledge`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function resolveAlert(farmId: string, alertId: string, token: string) {
  return apiFetch<AlertView>(
    `/farms/${farmId}/alerts/${alertId}/resolve`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function ignoreAlert(farmId: string, alertId: string, token: string) {
  return apiFetch<AlertView>(
    `/farms/${farmId}/alerts/${alertId}/ignore`,
    {
      method: 'PATCH'
    },
    token
  );
}

export async function getFarmStockItems(farmId: string, token: string) {
  return apiFetch<{
    items: StockItemView[];
    stats: {
      totalItems: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
  }>(`/farms/${farmId}/inventory/items`, undefined, token);
}

export async function createStockItem(
  farmId: string,
  input: Omit<StockItemView, 'id' | 'stockStatus' | 'quantityGapToThreshold' | 'recommendedReorderQuantity'>,
  token: string
) {
  return apiFetch<StockItemView>(
    `/farms/${farmId}/inventory/items`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createStockMovement(
  farmId: string,
  input: {
    stockItemId: string;
    movementType: 'ENTREE' | 'SORTIE' | 'INVENTAIRE' | 'AJUSTEMENT';
    quantity: number;
    note?: string;
  },
  token: string
) {
  return apiFetch(
    `/farms/${farmId}/inventory/movements`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmAnimalGroups(farmId: string, token: string) {
  return apiFetch<{ items: AnimalGroupView[] }>(`/farms/${farmId}/livestock/animals`, undefined, token);
}

export async function createAnimalGroup(
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
  },
  token: string
) {
  return apiFetch<AnimalGroupView>(
    `/farms/${farmId}/livestock/animals`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmAnimalEvents(farmId: string, token: string) {
  return apiFetch<{ items: AnimalEventView[] }>(`/farms/${farmId}/livestock/events`, undefined, token);
}

export async function createAnimalEvent(
  farmId: string,
  input: {
    animalGroupId: string;
    eventTypes: AnimalEventView['eventType'][];
    eventDate: string;
    quantity?: number;
    weight?: number;
    notes?: string;
  },
  token: string
) {
  return apiFetch<AnimalEventView>(
    `/farms/${farmId}/livestock/events`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmFinanceTransactions(
  farmId: string,
  token: string,
  filters?: FinanceTransactionFilters
) {
  const query = new URLSearchParams();
  if (filters?.transactionType && filters.transactionType !== 'ALL') {
    query.set('transactionType', filters.transactionType);
  }
  if (filters?.from) {
    query.set('from', filters.from);
  }
  if (filters?.to) {
    query.set('to', filters.to);
  }
  if (filters?.category?.trim()) {
    query.set('category', filters.category.trim());
  }

  return apiFetch<{ items: FinancialTransactionView[]; summary: FinanceSummaryView }>(
    `/farms/${farmId}/finance/transactions${query.size ? `?${query.toString()}` : ''}`,
    undefined,
    token
  );
}

export async function createFinancialTransaction(
  farmId: string,
  input: {
    transactionType: FinancialTransactionView['transactionType'];
    category: string;
    amount: number;
    transactionDate: string;
    referenceModule?: string;
    notes?: string;
  },
  token: string
) {
  return apiFetch<FinancialTransactionView>(
    `/farms/${farmId}/finance/transactions`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateFinancialTransaction(
  farmId: string,
  transactionId: string,
  input: {
    transactionType: FinancialTransactionView['transactionType'];
    category: string;
    amount: number;
    transactionDate: string;
    referenceModule?: string;
    notes?: string;
  },
  token: string
) {
  return apiFetch<FinancialTransactionView>(
    `/farms/${farmId}/finance/transactions/${transactionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function deleteFinancialTransaction(
  farmId: string,
  transactionId: string,
  token: string
) {
  return apiFetch<{ success: true }>(
    `/farms/${farmId}/finance/transactions/${transactionId}`,
    {
      method: 'DELETE'
    },
    token
  );
}

export async function getFarmSanitaryEvents(farmId: string, token: string) {
  return apiFetch<{ items: SanitaryEventView[] }>(`/farms/${farmId}/sanitary/events`, undefined, token);
}

export async function createSanitaryEvent(
  farmId: string,
  input: {
    animalGroupId?: string;
    eventType: SanitaryEventView['eventType'];
    eventDate: string;
    status: SanitaryEventView['status'];
    notes?: string;
  },
  token: string
) {
  return apiFetch<SanitaryEventView>(
    `/farms/${farmId}/sanitary/events`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function syncSanitaryCalendar(farmId: string, token: string) {
  return apiFetch<{ success: boolean }>(
    `/farms/${farmId}/sanitary/calendar/sync`,
    {
      method: 'POST'
    },
    token
  );
}

export async function getFarmDashboard(farmId: string, token: string) {
  return apiFetch<FarmDashboardView>(`/farms/${farmId}/dashboard`, undefined, token);
}

export async function generateFarmReport(
  farmId: string,
  input: {
    reportType: GeneratedReportView['reportType'];
    format: GeneratedReportView['format'];
  },
  token: string
) {
  return apiFetch<GeneratedReportView>(
    `/farms/${farmId}/reports`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmReports(farmId: string, token: string) {
  return apiFetch<{ items: ReportHistoryView[] }>(`/farms/${farmId}/reports`, undefined, token);
}

export async function getFarmRecommendations(farmId: string, token: string) {
  return apiFetch<{ items: FarmRecommendationView[] }>(`/farms/${farmId}/recommendations`, undefined, token);
}

export async function getFarmPlots(farmId: string, token: string) {
  return apiFetch<{
    items: PlotView[];
    stats: {
      totalPlots: number;
      totalSurfaceArea: number;
      cultivatedPlots: number;
      restingPlots: number;
    };
  }>(`/farms/${farmId}/plots`, undefined, token);
}

export async function createFarmPlot(
  farmId: string,
  input: {
    name: string;
    location?: string;
    surfaceArea: number;
    soilType?: string;
    irrigationType?: string;
    status: PlotView['status'];
    notes?: string;
  },
  token: string
) {
  return apiFetch<PlotView>(
    `/farms/${farmId}/plots`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmCrops(farmId: string, token: string) {
  return apiFetch<{
    items: CropView[];
    operations: CropOperationView[];
    harvests: HarvestView[];
    stats: {
      totalCrops: number;
      activeCrops: number;
      plannedCrops: number;
      harvestedCrops: number;
      cultivatedArea: number;
      expectedYield: number;
      actualYield: number;
      totalHarvestRevenue: number;
    };
  }>(`/farms/${farmId}/crops`, undefined, token);
}

export async function createFarmCrop(
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
  },
  token: string
) {
  return apiFetch<CropView>(
    `/farms/${farmId}/crops`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createCropOperation(
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
  },
  token: string
) {
  return apiFetch<CropOperationView>(
    `/farms/${farmId}/crops/operations`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createCropHarvest(
  farmId: string,
  input: {
    cropId: string;
    harvestedAt: string;
    quantity: number;
    unit: string;
    quality?: HarvestView['quality'];
    revenue?: number;
    notes?: string;
  },
  token: string
) {
  return apiFetch<HarvestView>(
    `/farms/${farmId}/crops/harvests`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function getFarmFacilities(farmId: string, token: string) {
  return apiFetch<{
    buildings: BuildingView[];
    enclosures: EnclosureView[];
    stats: {
      totalBuildings: number;
      totalEnclosures: number;
      operationalCount: number;
      maintenanceCount: number;
      totalCapacity: number;
    };
  }>(`/farms/${farmId}/facilities`, undefined, token);
}

export async function createFarmBuilding(
  farmId: string,
  input: {
    name: string;
    buildingType: BuildingView['buildingType'];
    capacity?: number;
    assignedTo?: string;
    conditionLabel?: string;
    status: BuildingView['status'];
    notes?: string;
  },
  token: string
) {
  return apiFetch<BuildingView>(
    `/farms/${farmId}/facilities/buildings`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateFarmBuilding(
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
  },
  token: string
) {
  return apiFetch<BuildingView>(
    `/farms/${farmId}/facilities/buildings/${buildingId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function deleteFarmBuilding(farmId: string, buildingId: string, token: string) {
  return apiFetch<{ success: true }>(
    `/farms/${farmId}/facilities/buildings/${buildingId}`,
    {
      method: 'DELETE'
    },
    token
  );
}

export async function getFarmProductionOverview(farmId: string, token: string) {
  return apiFetch<ProductionOverviewView>(`/farms/${farmId}/production`, undefined, token);
}

export async function createEggProductionRecord(
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
  },
  token: string
) {
  return apiFetch<ProductionRecordView>(
    `/farms/${farmId}/production/eggs`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createFishGrowthRecord(
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
  },
  token: string
) {
  return apiFetch<ProductionRecordView>(
    `/farms/${farmId}/production/fish-growth`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createFishHarvestRecord(
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
  },
  token: string
) {
  return apiFetch<ProductionRecordView>(
    `/farms/${farmId}/production/fish-harvests`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createCropHarvestProduction(
  farmId: string,
  input: {
    cropId: string;
    harvestedAt: string;
    quantity: number;
    losses?: number;
    unit: string;
    quality?: 'EXCELLENT' | 'BONNE' | 'MOYENNE' | 'FAIBLE';
    notes?: string;
  },
  token: string
) {
  return apiFetch<ProductionRecordView>(
    `/farms/${farmId}/production/crop-harvests`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createProductSale(
  farmId: string,
  input: {
    stockId: string;
    quantitySold: number;
    unitPrice: number;
    amountPaid: number;
    paymentMethod: ProductSaleView['paymentMethod'];
    customerName: string;
    saleDate: string;
    notes?: string;
  },
  token: string
) {
  return apiFetch<ProductSaleView>(
    `/farms/${farmId}/production/sales`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function addProductSalePayment(
  farmId: string,
  saleId: string,
  input: {
    paymentDate: string;
    amount: number;
    paymentMethod: ProductSaleView['paymentMethod'];
    note?: string;
  },
  token: string
) {
  return apiFetch<SalePaymentView>(
    `/farms/${farmId}/production/sales/${saleId}/payments`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function createFarmEnclosure(
  farmId: string,
  input: {
    name: string;
    enclosureType: EnclosureView['enclosureType'];
    capacity?: number;
    assignedTo?: string;
    conditionLabel?: string;
    status: EnclosureView['status'];
    notes?: string;
  },
  token: string
) {
  return apiFetch<EnclosureView>(
    `/farms/${farmId}/facilities/enclosures`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateFarmEnclosure(
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
  },
  token: string
) {
  return apiFetch<EnclosureView>(
    `/farms/${farmId}/facilities/enclosures/${enclosureId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function deleteFarmEnclosure(farmId: string, enclosureId: string, token: string) {
  return apiFetch<{ success: true }>(
    `/farms/${farmId}/facilities/enclosures/${enclosureId}`,
    {
      method: 'DELETE'
    },
    token
  );
}
