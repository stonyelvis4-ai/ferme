/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Egg,
  Fish,
  Sprout,
  Package,
  DollarSign,
  ShieldCheck,
  Building2,
  Calendar,
  CheckSquare,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Settings,
  Users,
  Search,
  Bell,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Menu,
  X,
  LogOut,
  LoaderCircle
} from 'lucide-react';

import {
  Lot,
  EggProduction,
  EggSale,
  AnimalFeeding,
  AnimalFeedPlan,
  AnimalWeighing,
  FishBassin,
  CultureParcelle,
  Campaign,
  StockArticle,
  StockArticleInput,
  StockCategoryOption,
  StockMovement,
  StockRelationOption,
  SupplierOption,
  FinanceTransaction,
  SanitaryTreatment,
  Building,
  Task,
  Alert,
  AuditLog,
  FarmSettings,
  UserRole,
  SyncStatus
} from './types';

import {
  initialSettings,
} from './data';

import AuthGate from './components/AuthGate';
import {
  changePassword,
  clearStoredAuthToken,
  getStoredAuthToken,
  getStoredAuthUser,
  loadWorkspaceSnapshot,
  login,
  logout,
  patchJson,
  patchForm,
  postJson,
  postForm,
  registerAdmin,
  setStoredAuthToken,
  setStoredAuthUser,
  putJson,
  deleteJson,
  type AuthUser
} from './services/fermApi';
import {
  mapAlerts,
  mapAnimalFeedings,
  mapAnimalFeedPlans,
  mapAnimalWeighings,
  mapAuditLogs,
  mapArticles,
  mapAuthUser,
  mapBuildings,
  mapCampaigns,
  mapEggProductions,
  mapEggSales,
  mapFishBassins,
  mapLots,
  mapMovements,
  mapParcelles,
  mapSettings,
  mapStockCategories,
  mapStockRelations,
  mapTasks,
  mapTransactions,
  mapTreatments,
  mapSuppliers
} from './services/fermMappers';

const ALARM_SOUND_LIBRARY: Record<string, string> = {
  'ferm-plus-default': '/audio/ferm-plus-alert-loop.m4a',
};

const DashboardView = lazy(() => import('./components/DashboardView'));
const ElevageView = lazy(() => import('./components/ElevageView'));
const PondeusesView = lazy(() => import('./components/PondeusesView'));
const PiscicultureView = lazy(() => import('./components/PiscicultureView'));
const CulturesView = lazy(() => import('./components/CulturesView'));
const StocksView = lazy(() => import('./components/StocksView'));
const FinancesView = lazy(() => import('./components/FinancesView'));
const SanitaireView = lazy(() => import('./components/SanitaireView'));
const BatimentsView = lazy(() => import('./components/BatimentsView'));
const AgendaView = lazy(() => import('./components/AgendaView'));
const TasksView = lazy(() => import('./components/TasksView'));
const AlertsView = lazy(() => import('./components/AlertsView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const AuditView = lazy(() => import('./components/AuditView'));
const SettingsView = lazy(() => import('./components/SettingsView'));

const WORKSPACE_CACHE_PREFIX = 'fermplus_workspace_cache';

type WorkspaceLocalCache = {
  farms: any[];
  users: AuthUser[];
  settings: FarmSettings;
  buildings: Building[];
  lots: Lot[];
  eggProductions: EggProduction[];
  eggSales: EggSale[];
  animalFeedings: AnimalFeeding[];
  animalFeedPlans: AnimalFeedPlan[];
  animalWeighings: AnimalWeighing[];
  fishBassins: FishBassin[];
  parcelles: CultureParcelle[];
  campaigns: Campaign[];
  articles: StockArticle[];
  movements: StockMovement[];
  transactions: FinanceTransaction[];
  treatments: SanitaryTreatment[];
  tasks: Task[];
  alerts: Alert[];
  auditLogs: AuditLog[];
};

type AppNotice = {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

function getWorkspaceCacheKey(userId: string | number | null | undefined) {
  return userId ? `${WORKSPACE_CACHE_PREFIX}:${userId}` : '';
}

function readWorkspaceCache(userId: string | number | null | undefined): WorkspaceLocalCache | null {
  const key = getWorkspaceCacheKey(userId);
  if (!key) return null;

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WorkspaceLocalCache;
  } catch {
    return null;
  }
}

function writeWorkspaceCache(userId: string | number | null | undefined, payload: WorkspaceLocalCache) {
  const key = getWorkspaceCacheKey(userId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(payload));
}

function clearWorkspaceCache(userId: string | number | null | undefined) {
  const key = getWorkspaceCacheKey(userId);
  if (!key) return;
  localStorage.removeItem(key);
}

const isBackendId = (value: string | number | null | undefined) => /^\d+$/.test(String(value ?? ''));

const responseId = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return '';
  const data = 'data' in payload ? (payload as { data?: unknown }).data : payload;
  return data && typeof data === 'object' ? String((data as Record<string, unknown>).id ?? '') : '';
};

const toUtcIso = (date: string, time: string) => new Date(`${date}T${time}:00Z`).toISOString();

function createPendingWorkspaceCache(localCache: WorkspaceLocalCache): WorkspaceLocalCache {
  return {
    ...localCache,
    farms: [],
    users: [],
    buildings: [],
    lots: [],
    eggProductions: [],
    eggSales: [],
    animalFeedings: [],
    animalFeedPlans: [],
    animalWeighings: [],
    fishBassins: [],
    parcelles: [],
    campaigns: [],
    articles: [],
    movements: [],
    transactions: [],
    treatments: [],
    tasks: [],
    alerts: [],
    auditLogs: [],
  };
}

function countPendingWorkspaceEntries(localCache: WorkspaceLocalCache | null) {
  if (!localCache) return 0;

  return [
    localCache.buildings,
    localCache.lots,
    localCache.eggProductions,
    localCache.eggSales,
    localCache.animalFeedings,
    localCache.animalFeedPlans,
    localCache.animalWeighings,
    localCache.fishBassins,
    localCache.parcelles,
    localCache.campaigns,
    localCache.articles,
    localCache.transactions,
    localCache.tasks,
  ].reduce((sum, bucket) => sum + bucket.length, 0);
}

async function syncLocalCacheToServer(token: string, farmId: string | number | null | undefined, localCache: WorkspaceLocalCache | null) {
  if (!token || !farmId || !localCache) {
    return { syncedCount: 0, pendingCache: localCache };
  }

  let syncedCount = 0;
  const numericFarmId = Number(farmId);
  const localToBackendIds = new Map<string, string>();
  const pendingCache = createPendingWorkspaceCache(localCache);

  for (const building of localCache.buildings.filter((item) => !isBackendId(item.id))) {
    try {
      const response = await postJson('/infrastructures/buildings', {
        farm_id: numericFarmId,
        name: building.name,
        type: building.type,
        capacity: building.capacity,
        notes: building.notes ?? '',
        status: 'active',
        state: 'good',
        assigned_use: building.type,
      }, token);
      const backendId = responseId(response);
      if (backendId) {
        localToBackendIds.set(building.id, backendId);
        syncedCount += 1;
      } else {
        pendingCache.buildings.push(building);
      }
    } catch {
      pendingCache.buildings.push(building);
    }
  }

  for (const article of localCache.articles.filter((item) => !isBackendId(item.id))) {
    try {
      const response = await postJson('/stocks', {
        farm_id: numericFarmId,
        name: article.name,
        category: article.category,
        unit: article.unit,
        minimum_threshold: article.minThreshold,
        current_quantity: article.quantity,
        unit_cost: article.unitCost ?? 0,
        location: article.locationId || null,
      }, token);
      const backendId = responseId(response);
      if (backendId) {
        localToBackendIds.set(article.id, backendId);
        syncedCount += 1;
      } else {
        pendingCache.articles.push(article);
      }
    } catch {
      pendingCache.articles.push(article);
    }
  }

  for (const lot of localCache.lots.filter((item) => !isBackendId(item.id))) {
    const backendBuildingId = localToBackendIds.get(lot.buildingId) ?? lot.buildingId;
    if (!isBackendId(backendBuildingId)) {
      pendingCache.lots.push(lot);
      continue;
    }

    try {
      const response = await postJson('/pondeuses', {
        farm_id: numericFarmId,
        name: lot.name,
        breed: lot.breed,
        building_id: Number(backendBuildingId),
        entry_date: lot.entryDate,
        initial_count: lot.initialCount,
        mortality_total: lot.mortalityCount,
        reform_total: 0,
        current_count: lot.currentCount,
        status: lot.status,
        unit_cost: lot.unitCost ?? 0,
        acquisition_cost: lot.acquisitionCost ?? lot.initialCount * (lot.unitCost ?? 0),
        notes: lot.notes ?? null,
      }, token);
      const backendId = responseId(response);
      if (backendId) {
        localToBackendIds.set(lot.id, backendId);
        syncedCount += 1;
      } else {
        pendingCache.lots.push(lot);
      }
    } catch {
      pendingCache.lots.push(lot);
    }
  }

  for (const production of localCache.eggProductions.filter((item) => !isBackendId(item.id))) {
    const backendLotId = localToBackendIds.get(production.lotId) ?? production.lotId;
    if (!isBackendId(backendLotId) || production.collectedCount <= 0) {
      pendingCache.eggProductions.push(production);
      continue;
    }

    try {
      await postJson('/pondeuses/productions', {
        farm_id: numericFarmId,
        layer_batch_id: Number(backendLotId),
        production_date: production.date,
        eggs_produced: production.collectedCount,
        broken_eggs: production.brokenCount,
        dirty_eggs: production.lossesCount,
        lost_eggs: Math.max(production.collectedCount - production.compliantCount - production.brokenCount - production.lossesCount, 0),
        mortality: 0,
        observations: '',
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.eggProductions.push(production);
    }
  }

  for (const sale of localCache.eggSales.filter((item) => !isBackendId(item.id))) {
    const backendLotId = localToBackendIds.get(sale.lotId) ?? sale.lotId;
    if (!isBackendId(backendLotId) || sale.eggsSold <= 0) {
      pendingCache.eggSales.push(sale);
      continue;
    }

    try {
      await postJson('/pondeuses/sales', {
        farm_id: numericFarmId,
        layer_batch_id: Number(backendLotId),
        sale_date: sale.date,
        customer_name: sale.customerName || 'Client comptoir',
        trays_sold: sale.traysSold,
        eggs_sold: sale.eggsSold,
        unit_price: sale.unitPrice,
        amount_paid: sale.amountPaid,
        remaining_due: sale.remainingDue,
        payment_method: 'cash',
        notes: sale.customerName ?? '',
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.eggSales.push(sale);
    }
  }

  for (const feeding of localCache.animalFeedings.filter((item) => !isBackendId(item.id))) {
    const backendLotId = localToBackendIds.get(feeding.lotId) ?? feeding.lotId;
    const backendArticleId = localToBackendIds.get(feeding.articleId) ?? feeding.articleId;
    if (!isBackendId(backendLotId) || !isBackendId(backendArticleId) || feeding.quantity <= 0) {
      pendingCache.animalFeedings.push(feeding);
      continue;
    }

    try {
      await postJson('/pondeuses/feedings', {
        farm_id: numericFarmId,
        layer_batch_id: Number(backendLotId),
        stock_item_id: Number(backendArticleId),
        feeding_date: feeding.date,
        feeding_time: feeding.time || null,
        quantity: feeding.quantity,
        notes: feeding.notes ?? '',
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.animalFeedings.push(feeding);
    }
  }

  for (const plan of localCache.animalFeedPlans.filter((item) => !isBackendId(item.id))) {
    const backendLotId = localToBackendIds.get(plan.lotId) ?? plan.lotId;
    const backendArticleId = plan.articleId ? (localToBackendIds.get(plan.articleId) ?? plan.articleId) : null;
    if (!isBackendId(backendLotId) || plan.rationPerHeadKg <= 0) {
      pendingCache.animalFeedPlans.push(plan);
      continue;
    }

    try {
      await postJson('/pondeuses/feed-plans', {
        farm_id: numericFarmId,
        layer_batch_id: Number(backendLotId),
        stock_item_id: backendArticleId && isBackendId(backendArticleId) ? Number(backendArticleId) : null,
        plan_name: plan.planName,
        ration_per_head_kg: plan.rationPerHeadKg,
        feedings_per_day: plan.feedingsPerDay,
        target_daily_quantity_kg: plan.targetDailyQuantityKg,
        start_date: plan.startDate,
        notes: plan.notes ?? '',
        is_active: plan.isActive,
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.animalFeedPlans.push(plan);
    }
  }

  for (const weighing of localCache.animalWeighings.filter((item) => !isBackendId(item.id))) {
    const backendLotId = localToBackendIds.get(weighing.lotId) ?? weighing.lotId;
    if (!isBackendId(backendLotId) || weighing.averageWeightKg <= 0) {
      pendingCache.animalWeighings.push(weighing);
      continue;
    }

    try {
      await postJson('/pondeuses/weighings', {
        farm_id: numericFarmId,
        layer_batch_id: Number(backendLotId),
        weighing_date: weighing.date,
        sample_size: weighing.sampleSize ?? null,
        average_weight_kg: weighing.averageWeightKg,
        total_weight_kg: weighing.totalWeightKg || null,
        notes: weighing.notes ?? '',
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.animalWeighings.push(weighing);
    }
  }

  for (const bassin of localCache.fishBassins.filter((item) => !isBackendId(item.id))) {
    try {
      const response = await postJson('/pisciculture', {
        farm_id: numericFarmId,
        name: bassin.name,
        pond_type: 'bassin',
        capacity_kg: 0,
        species: bassin.species,
        initial_fish_count: bassin.initialCount,
        stocking_date: bassin.stockingDate,
        status: bassin.status,
        current_estimated_count: bassin.currentCount,
        mortality_total: bassin.mortalityCount,
        unit_cost: bassin.unitCost ?? 0,
        acquisition_cost: bassin.acquisitionCost ?? bassin.initialCount * (bassin.unitCost ?? 0),
      }, token);
      const backendId = responseId(response);
      if (!backendId) {
        pendingCache.fishBassins.push(bassin);
        continue;
      }

      localToBackendIds.set(bassin.id, backendId);
      await postJson('/pisciculture/stockings', {
        farm_id: numericFarmId,
        fish_pond_id: Number(backendId),
        stocking_date: bassin.stockingDate,
        fish_count: bassin.initialCount,
        unit_cost: bassin.unitCost ?? 0,
        acquisition_cost: bassin.acquisitionCost ?? bassin.initialCount * (bassin.unitCost ?? 0),
        notes: `Migration locale du bassin ${bassin.name}`,
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.fishBassins.push(bassin);
    }
  }

  for (const campaign of localCache.campaigns.filter((item) => !isBackendId(item.id))) {
    const parcelle = localCache.parcelles.find((item) => item.id === campaign.parcelleId);

    try {
      const cropResponse = await postJson('/cultures', {
        farm_id: numericFarmId,
        name: campaign.cropType,
        variety: campaign.variety,
        cycle_days: 90,
        planting_date: campaign.startDate,
        area: parcelle?.area ?? 0,
        status: campaign.status,
        estimated_harvest_date: campaign.endDate,
        expected_yield_kg: (campaign.expectedYield ?? 0) * 1000,
        total_operations_cost: campaign.expenses,
        total_harvest_kg: (campaign.actualYield ?? 0) * 1000,
      }, token);
      const backendCropId = responseId(cropResponse);
      if (!backendCropId) {
        pendingCache.campaigns.push(campaign);
        if (parcelle && !isBackendId(parcelle.id)) pendingCache.parcelles.push(parcelle);
        continue;
      }

      localToBackendIds.set(campaign.id, backendCropId);

      if (parcelle && !isBackendId(parcelle.id)) {
        const plotResponse = await postJson('/cultures/plots', {
          farm_id: numericFarmId,
          crop_id: Number(backendCropId),
          name: parcelle.name,
          area: parcelle.area,
          soil_type: parcelle.soilType,
          status: parcelle.status,
        }, token);
        const backendPlotId = responseId(plotResponse);
        if (backendPlotId) {
          localToBackendIds.set(parcelle.id, backendPlotId);
        } else {
          pendingCache.parcelles.push(parcelle);
        }
      }

      syncedCount += 1;
    } catch {
      pendingCache.campaigns.push(campaign);
      if (parcelle && !isBackendId(parcelle.id)) pendingCache.parcelles.push(parcelle);
    }
  }

  for (const task of localCache.tasks.filter((item) => !isBackendId(item.id))) {
    try {
      await postJson('/tasks', {
        farm_id: numericFarmId,
        title: task.title,
        description: task.description,
        source_module: task.sourceModule,
        source_entity_type: task.sourceEntityType ?? null,
        source_entity_id: task.sourceElementId ?? null,
        start_at: task.startDate ? toUtcIso(task.startDate, '08:00') : null,
        priority: task.priority,
        status: task.status,
        due_at: task.dueDate ? toUtcIso(task.dueDate, '17:00') : null,
        reminder_at: task.reminderAt ?? null,
        assigned_to: undefined,
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.tasks.push(task);
    }
  }

  for (const transaction of localCache.transactions.filter((item) => !isBackendId(item.id) && item.sourceModule === 'Finances')) {
    try {
      await postJson('/finances', {
        farm_id: numericFarmId,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        source_module: 'Finances',
        source_entity_id: null,
        source_entity_type: null,
        occurred_at: transaction.date ? new Date(transaction.date).toISOString() : new Date().toISOString(),
      }, token);
      syncedCount += 1;
    } catch {
      pendingCache.transactions.push(transaction);
    }
  }

  return {
    syncedCount,
    pendingCache: countPendingWorkspaceEntries(pendingCache) > 0 ? pendingCache : null,
  };
}

export default function App() {
  // Navigation Router
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Actor Role Switcher
  const [role, setRole] = useState<UserRole>('admin');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthTokenState] = useState<string>(() => getStoredAuthToken());
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [allowRegisterAdmin, setAllowRegisterAdmin] = useState<boolean>(true);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [registerName, setRegisterName] = useState<string>('Administrateur FERM+');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState<string>('');
  const [passwordCurrent, setPasswordCurrent] = useState<string>('');
  const [passwordNext, setPasswordNext] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');

  // Connectivity state
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Global Search bar
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Core Database States
  const [settings, setSettings] = useState<FarmSettings>(initialSettings);
  const [farms, setFarms] = useState<any[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  const [eggSales, setEggSales] = useState<EggSale[]>([]);
  const [animalFeedings, setAnimalFeedings] = useState<AnimalFeeding[]>([]);
  const [animalFeedPlans, setAnimalFeedPlans] = useState<AnimalFeedPlan[]>([]);
  const [animalWeighings, setAnimalWeighings] = useState<AnimalWeighing[]>([]);
  const [fishBassins, setFishBassins] = useState<FishBassin[]>([]);
  const [parcelles, setParcelles] = useState<CultureParcelle[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [articles, setArticles] = useState<StockArticle[]>([]);
  const [stockCategories, setStockCategories] = useState<StockCategoryOption[]>([]);
  const [stockSuppliers, setStockSuppliers] = useState<SupplierOption[]>([]);
  const [stockRelationOptions, setStockRelationOptions] = useState<StockRelationOption[]>([]);
  const [stockUnits, setStockUnits] = useState<string[]>([]);
  const [stockStorageLocations, setStockStorageLocations] = useState<string[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [treatments, setTreatments] = useState<SanitaryTreatment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Auto-alert notification dropdown trigger
  const [showAlertDropdown, setShowAlertDropdown] = useState<boolean>(false);
  const [alarmSilenced, setAlarmSilenced] = useState<boolean>(false);
  const [alarmPlaybackBlocked, setAlarmPlaybackBlocked] = useState<boolean>(false);
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const previousAlarmCountRef = useRef<number>(0);

  // Help functions for quick uuid/dates
  const generateId = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 100000)}`;
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getSyncStatus = (): SyncStatus => (isOffline ? 'pending' : 'synced');
  const pushNotice = (
    type: AppNotice['type'],
    title: string,
    description?: string,
    durationMs = 4200
  ) => {
    const noticeId = generateId('notice');
    setNotices((prev) => [...prev, { id: noticeId, type, title, description }]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((item) => item.id !== noticeId));
    }, durationMs);
  };

  const resetToLogin = (message: string) => {
    clearStoredAuthToken();
    setAuthTokenState('');
    setAuthUser(null);
    setRole('admin');
    setAuthMode('login');
    setAuthError(message);
  };

  const hydrateWorkspace = async (token = authToken, options?: { silent?: boolean }) => {
    if (!token) {
      setAuthReady(true);
      
    }

    const silent = options?.silent ?? false;

    try {
      const snapshot = await loadWorkspaceSnapshot(token);
      const storedUser = getStoredAuthUser<AuthUser>();
      const getData = (payload: unknown) => {
        if (payload && typeof payload === 'object' && 'data' in payload) {
          return (payload as { data?: unknown }).data;
        }
        return payload;
      };

      const farmsData = getData(snapshot.farms);
      const usersData = getData(snapshot.users);
      const settingsData = getData(snapshot.settings);
      const tasksData = getData(snapshot.tasks);
      const alertsData = getData(snapshot.alerts);
      const auditData = getData(snapshot.audit);
      const stocksData = getData(snapshot.stocks);
      const financesData = getData(snapshot.finances);
      const sanitaryData = getData(snapshot.sanitary);
      const layersData = getData(snapshot.layers);
      const pondsData = getData(snapshot.ponds);
      const culturesData = getData(snapshot.cultures);
      const infraData = getData(snapshot.infrastructures);
      const reportsData = getData(snapshot.reports);
      const syncData = getData(snapshot.sync);

      const layersObject = (layersData && typeof layersData === 'object' && !Array.isArray(layersData)) ? (layersData as Record<string, unknown>) : {};
      const pondObject = (pondsData && typeof pondsData === 'object' && !Array.isArray(pondsData)) ? (pondsData as Record<string, unknown>) : {};
      const culturesObject = (culturesData && typeof culturesData === 'object' && !Array.isArray(culturesData)) ? (culturesData as Record<string, unknown>) : {};
      const stocksObject = (stocksData && typeof stocksData === 'object' && !Array.isArray(stocksData)) ? (stocksData as Record<string, unknown>) : {};
      const infraObject = (infraData && typeof infraData === 'object' && !Array.isArray(infraData)) ? (infraData as Record<string, unknown>) : {};

      const farmSetting = mapSettings(settingsData ?? initialSettings);
      const apiUsers = (usersData as unknown[] ?? [])
        .map((item) => mapAuthUser(item))
        .filter((item): item is AuthUser => Boolean(item));
      const currentBackendUser = apiUsers.find((user) => String(user.id) === String((storedUser ?? authUser)?.id));
      const apiUser = currentBackendUser ?? storedUser ?? authUser;

      if (currentBackendUser) {
        setStoredAuthUser(currentBackendUser);
        setAuthUser(currentBackendUser);
      }

      const mappedLots = mapLots(((layersObject.batches ?? []) as unknown[]) ?? []);
      const mappedEggProductions = mapEggProductions(((layersObject.productions ?? []) as unknown[]) ?? []);
      const mappedEggSales = mapEggSales(((layersObject.sales ?? []) as unknown[]) ?? []);
      const mappedAnimalFeedings = mapAnimalFeedings(((layersObject.feedings ?? []) as unknown[]) ?? []);
      const mappedAnimalFeedPlans = mapAnimalFeedPlans(((layersObject.feed_plans ?? []) as unknown[]) ?? []);
      const mappedAnimalWeighings = mapAnimalWeighings(((layersObject.weighings ?? []) as unknown[]) ?? []);
      const mappedBassins = mapFishBassins(((pondObject.ponds ?? pondObject.data ?? []) as unknown[]) ?? []);
      const rawPlots = ((culturesObject.plots ?? culturesObject.data ?? []) as unknown[]) ?? [];
      const rawCrops = ((culturesObject.crops ?? culturesObject.data ?? []) as unknown[]) ?? [];
      const stockMeta = (stocksObject.meta && typeof stocksObject.meta === 'object' && !Array.isArray(stocksObject.meta))
        ? (stocksObject.meta as Record<string, unknown>)
        : {};
      const mappedParcelles = mapParcelles(rawPlots);
      const mappedCampaigns = mapCampaigns(rawCrops, rawPlots);
      const mappedBuildings = mapBuildings(((infraObject.buildings ?? []) as unknown[]) ?? []);
      const mappedArticles = mapArticles(((stocksObject.items ?? []) as unknown[]) ?? []);
      const mappedMovements = mapMovements(((stocksObject.movements ?? []) as unknown[]) ?? []);
      const mappedStockCategories = mapStockCategories(((stockMeta.categories ?? []) as unknown[]) ?? []);
      const mappedSuppliers = mapSuppliers(((stockMeta.suppliers ?? []) as unknown[]) ?? []);
      const relationBuckets = Object.values(stockMeta.relations ?? {})
        .flatMap((value) => (Array.isArray(value) ? value : [])) as unknown[];
      const mappedStockRelations = mapStockRelations(relationBuckets);
      const mappedStockUnits = Array.isArray(stockMeta.units) ? (stockMeta.units as string[]) : [];
      const mappedStorageLocations = Array.isArray(stockMeta.storage_locations) ? (stockMeta.storage_locations as string[]) : [];
      const mappedTransactions = mapTransactions((financesData as unknown[]) ?? []);
      const mappedTreatments = mapTreatments((sanitaryData as unknown[]) ?? []);
      const mappedTasks = mapTasks((tasksData as unknown[]) ?? [], apiUsers);
      const mappedAlerts = mapAlerts((alertsData as unknown[]) ?? []);
      const mappedAuditLogs = mapAuditLogs((auditData as unknown[]) ?? []);
      const cacheUserId = (apiUser ?? storedUser)?.id;
      const localCache = readWorkspaceCache(cacheUserId);
      const firstFarm = Array.isArray(farmsData) ? farmsData[0] as { id?: string | number } | undefined : undefined;
      const activeHydrationFarmId = apiUser?.farm_id ?? firstFarm?.id ?? null;

      if (localCache && activeHydrationFarmId) {
        try {
          const syncResult = await syncLocalCacheToServer(token, activeHydrationFarmId, localCache);
          if (syncResult.pendingCache) {
            writeWorkspaceCache(cacheUserId, syncResult.pendingCache);
          } else if (syncResult.syncedCount > 0) {
            clearWorkspaceCache(cacheUserId);
          }

          if (syncResult.syncedCount > 0) {
            await hydrateWorkspace(token, { silent: true });
            return;
          }
        } catch (syncError) {
          console.error('Local cache sync failed:', syncError);
        }
      }

      const pickMapped = <T,>(remoteValue: unknown, mappedValue: T[], fallbackValue: T[]): T[] =>
        Array.isArray(remoteValue) ? mappedValue : fallbackValue;
      const pickValue = <T,>(remoteValue: T | null | undefined, fallbackValue: T): T =>
        remoteValue === undefined || remoteValue === null ? fallbackValue : remoteValue;

      setFarms(pickMapped(farmsData, (farmsData as any[]) ?? [], localCache?.farms ?? []));
      setUsers(pickMapped(usersData, apiUsers, localCache?.users ?? apiUsers));
      setSettings(pickValue(settingsData ? farmSetting : undefined, localCache?.settings ?? farmSetting));
      setBuildings(pickMapped(infraObject.buildings, mappedBuildings, localCache?.buildings ?? mappedBuildings));
      setLots(pickMapped(layersObject.batches, mappedLots, localCache?.lots ?? mappedLots));
      setEggProductions(pickMapped(layersObject.productions, mappedEggProductions, localCache?.eggProductions ?? mappedEggProductions));
      setEggSales(pickMapped(layersObject.sales, mappedEggSales, localCache?.eggSales ?? mappedEggSales));
      setAnimalFeedings(pickMapped(layersObject.feedings, mappedAnimalFeedings, localCache?.animalFeedings ?? mappedAnimalFeedings));
      setAnimalFeedPlans(pickMapped(layersObject.feed_plans, mappedAnimalFeedPlans, localCache?.animalFeedPlans ?? mappedAnimalFeedPlans));
      setAnimalWeighings(pickMapped(layersObject.weighings, mappedAnimalWeighings, localCache?.animalWeighings ?? mappedAnimalWeighings));
      setFishBassins(pickMapped(pondObject.ponds ?? pondObject.data, mappedBassins, localCache?.fishBassins ?? mappedBassins));
      setParcelles(pickMapped(culturesObject.plots ?? culturesObject.data, mappedParcelles, localCache?.parcelles ?? mappedParcelles));
      setCampaigns(pickMapped(culturesObject.crops ?? culturesObject.data, mappedCampaigns, localCache?.campaigns ?? mappedCampaigns));
      setArticles(pickMapped(stocksObject.items, mappedArticles, localCache?.articles ?? mappedArticles));
      setStockCategories(mappedStockCategories);
      setStockSuppliers(mappedSuppliers);
      setStockRelationOptions(mappedStockRelations);
      setStockUnits(mappedStockUnits);
      setStockStorageLocations(mappedStorageLocations);
      setMovements(pickMapped(stocksObject.movements, mappedMovements, localCache?.movements ?? mappedMovements));
      setTransactions(pickMapped(financesData, mappedTransactions, localCache?.transactions ?? mappedTransactions));
      setTreatments(pickMapped(sanitaryData, mappedTreatments, localCache?.treatments ?? mappedTreatments));
      setTasks(pickMapped(tasksData, mappedTasks, localCache?.tasks ?? mappedTasks));
      setAlerts(pickMapped(alertsData, mappedAlerts, localCache?.alerts ?? mappedAlerts));
      setAuditLogs(pickMapped(auditData, mappedAuditLogs, localCache?.auditLogs ?? mappedAuditLogs));

      if (apiUser?.role) {
        setRole(apiUser.role);
      } else {
        const localUser = storedUser;
        if (localUser?.role) {
          setRole(localUser.role);
          setAuthUser(localUser);
        }
      }
    } catch (error) {
      console.error('Workspace hydration failed:', error);
      const fallbackUser = getStoredAuthUser<AuthUser>() ?? authUser;
      const localCache = readWorkspaceCache(fallbackUser?.id);
      const normalizedMessage = error instanceof Error ? error.message.toLowerCase() : '';

      if (
        normalizedMessage.includes('unauthenticated') ||
        normalizedMessage.includes('unauthorized') ||
        normalizedMessage.includes('forbidden')
      ) {
        resetToLogin(error instanceof Error ? error.message : 'Session expirÃ©e.');
        return;
      }

      if (localCache) {
        setFarms(localCache.farms);
        setUsers(localCache.users);
        setSettings(localCache.settings);
        setBuildings(localCache.buildings);
        setLots(localCache.lots);
        setEggProductions(localCache.eggProductions);
        setEggSales(localCache.eggSales ?? []);
        setAnimalFeedings(localCache.animalFeedings);
        setAnimalFeedPlans(localCache.animalFeedPlans ?? []);
        setAnimalWeighings(localCache.animalWeighings ?? []);
        setFishBassins(localCache.fishBassins);
        setParcelles(localCache.parcelles);
        setCampaigns(localCache.campaigns);
        setArticles(localCache.articles);
        setMovements(localCache.movements);
        setTransactions(localCache.transactions);
        setTreatments(localCache.treatments);
        setTasks(localCache.tasks);
        setAlerts(localCache.alerts);
        setAuditLogs(localCache.auditLogs);
        if (silent) return;
        return;
      }
      if (!silent) {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les données de la ferme depuis le serveur.'
        );
      }
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    const boot = async () => {
      const token = getStoredAuthToken();
      const storedUser = getStoredAuthUser<AuthUser>();

      if (token) {
        setAuthTokenState(token);
        if (storedUser) {
          setAuthUser(storedUser);
          setRole(storedUser.role);
        }
        await hydrateWorkspace(token, { silent: true });
      } else {
        setAuthReady(true);
      }
    };

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authReady || !authToken) return;

    let cancelled = false;
    const refreshWorkspace = () => {
      if (cancelled || document.visibilityState === 'hidden') return;

      setIsSyncing(true);
      void hydrateWorkspace(authToken, { silent: true }).finally(() => {
        if (!cancelled) setIsSyncing(false);
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshWorkspace();
    };

    const intervalId = window.setInterval(refreshWorkspace, 30000);
    window.addEventListener('focus', refreshWorkspace);
    window.addEventListener('online', refreshWorkspace);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWorkspace);
      window.removeEventListener('online', refreshWorkspace);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authToken]);

  useEffect(() => {
    if (!authToken || !authError) return;

    if (
      authError.includes("Impossible de joindre l'API FERM+") ||
      authError.toLowerCase().includes('unauthenticated') ||
      authError.toLowerCase().includes('unauthorized')
    ) {
      resetToLogin(authError);
    }
  }, [authError, authToken]);

  useEffect(() => {
    if (!authReady || !authToken) return;

    const storedUser = getStoredAuthUser<AuthUser>();
    const cacheUserId = authUser?.id ?? storedUser?.id;
    if (!cacheUserId) return;

    writeWorkspaceCache(cacheUserId, {
      farms,
      users,
      settings,
      buildings,
      lots,
      eggProductions,
      eggSales,
      animalFeedings,
      animalFeedPlans,
      animalWeighings,
      fishBassins,
      parcelles,
      campaigns,
      articles,
      movements,
      transactions,
      treatments,
      tasks,
      alerts,
      auditLogs,
    });
  }, [
    articles,
    auditLogs,
    authReady,
    authToken,
    animalFeedings,
    animalFeedPlans,
    animalWeighings,
    authUser?.id,
    buildings,
    campaigns,
    eggProductions,
    eggSales,
    fishBassins,
    farms,
    lots,
    movements,
    parcelles,
    settings,
    tasks,
    transactions,
    treatments,
    users,
    alerts,
  ]);

  const handleAuthSuccess = (token: string, user: AuthUser) => {
    setStoredAuthToken(token);
    setStoredAuthUser(user);
    setAuthTokenState(token);
    setAuthUser(user);
    setRole(user.role);
    setAllowRegisterAdmin(false);
    setAuthError('');
    void hydrateWorkspace(token);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');

    try {
      const response = await login({ email: loginEmail, password: loginPassword });
      const user = (response.user ?? response.data?.user) as AuthUser | undefined;
      const token = (response.token ?? response.data?.token) as string | undefined;
      if (!user) {
        throw new Error('Réponse d’authentification invalide.');
      }
      handleAuthSuccess(token ?? 'cookie-session', user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegisterAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (registerPassword !== registerConfirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas.');
      
    }

    setAuthBusy(true);
    setAuthError('');

    try {
      const response = await registerAdmin({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });
      const user = (response.user ?? response.data?.user) as AuthUser | undefined;
      const token = (response.token ?? response.data?.token) as string | undefined;
      if (!user) {
        throw new Error('Réponse de création de compte invalide.');
      }
      handleAuthSuccess(token ?? 'cookie-session', user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Création du compte impossible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await logout(authToken);
      }
    } catch {
      // Silent fallback: local logout should still happen.
    } finally {
      clearStoredAuthToken();
      setAuthTokenState('');
      setAuthUser(null);
      setRole('admin');
      setAuthReady(true);
    }
  };

  const handleChangePassword = async (
    payload?: { current_password: string; password: string; password_confirmation: string }
  ) => {
    if (!authToken) return;
    const currentPasswordValue = payload?.current_password ?? passwordCurrent;
    const nextPasswordValue = payload?.password ?? passwordNext;
    const confirmPasswordValue = payload?.password_confirmation ?? passwordConfirm;

    if (!currentPasswordValue || !nextPasswordValue || !confirmPasswordValue) {
      setAuthError('Complétez les trois champs du mot de passe.');
      return;
    }
    if (nextPasswordValue !== confirmPasswordValue) {
      setAuthError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    try {
      await changePassword(
        {
          current_password: currentPasswordValue,
          password: nextPasswordValue,
          password_confirmation: confirmPasswordValue,
        },
        authToken
      );
      setPasswordCurrent('');
      setPasswordNext('');
      setPasswordConfirm('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Changement de mot de passe impossible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUpdateSettings = async (newSettings: FarmSettings) => {
    setSettings(newSettings);
    const preservedAlertRules = Array.isArray(newSettings.alertRules)
      ? newSettings.alertRules.filter((rule) => {
          if (!rule || typeof rule !== 'object') return true;
          return (rule as Record<string, unknown>).type !== 'alarm_preferences';
        })
      : [];
    const nextAlertRules = [
      ...preservedAlertRules,
      {
        type: 'alarm_preferences',
        sound_enabled: newSettings.alarmSoundEnabled ?? true,
        loop_enabled: newSettings.alarmLoopEnabled ?? true,
        for_warnings: newSettings.alarmForWarnings ?? true,
        for_criticals: newSettings.alarmForCriticals ?? true,
        volume: newSettings.alarmVolume ?? 100,
        sound_key: newSettings.alarmSoundKey ?? 'ferm-plus-default',
      },
    ];

    if (!authToken || !activeFarmId) {
      return;
    }

    try {
      await putJson(
        '/settings',
        {
          currency: newSettings.currency,
          area_unit: newSettings.areaUnit,
          weight_unit: newSettings.weightUnit,
          egg_tray_default_price: newSettings.eggTrayDefaultPrice ?? 0,
          fish_kg_default_price: newSettings.fishKgDefaultPrice ?? 0,
          crop_kg_default_price: newSettings.cropKgDefaultPrice ?? 0,
          low_stock_threshold: newSettings.lowStockThreshold ?? 0,
          mortalite_threshold_layers: newSettings.mortailiteThresholdLayers ?? 0,
          mortalite_threshold_fish: newSettings.mortailiteThresholdFish ?? 0,
          egg_breakage_threshold: newSettings.eggBreakageThreshold ?? 0,
          laying_rate_low_threshold: newSettings.layingRateLowThreshold ?? 0,
          fish_ph_min: newSettings.fishPhMin ?? 0,
          fish_ph_max: newSettings.fishPhMax ?? 0,
          fish_oxygen_min: newSettings.fishOxygenMin ?? 0,
          fish_temperature_min: newSettings.fishTemperatureMin ?? 0,
          fish_temperature_max: newSettings.fishTemperatureMax ?? 0,
          crop_yield_low_threshold: newSettings.cropYieldLowThreshold ?? 0,
          default_reminder_24h: newSettings.defaultReminder24h ?? true,
          default_reminder_6h: newSettings.defaultReminder6h ?? true,
          default_reminder_1h: newSettings.defaultReminder1h ?? true,
          alarm_sound_enabled: newSettings.alarmSoundEnabled ?? true,
          alarm_loop_enabled: newSettings.alarmLoopEnabled ?? true,
          alarm_for_warnings: newSettings.alarmForWarnings ?? true,
          alarm_for_criticals: newSettings.alarmForCriticals ?? true,
          alarm_volume: newSettings.alarmVolume ?? 100,
          alarm_sound_key: newSettings.alarmSoundKey ?? 'ferm-plus-default',
          task_categories: newSettings.taskCategories ?? [],
          task_priorities: newSettings.taskPriorities ?? [],
          alert_rules: nextAlertRules,
        },
        authToken
      );
    } catch (error) {
      console.error('Settings sync failed:', error);
    }
  };

  const handleCreateOwner = async (payload: { name: string; email: string; password: string }) => {
    if (!authToken || !activeFarmId) {
      setAuthError("Impossible de creer un proprietaire sans ferme active.");
      return;
    }

    if (!payload.name || !payload.email || !payload.password) {
      setAuthError('Renseignez le nom, l email et le mot de passe du proprietaire.');
      return;
    }

    setAuthBusy(true);
    setAuthError('');

    try {
      const response = await postJson(
        `/farms/${activeFarmId}/owner`,
        {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          is_active: true,
        },
        authToken
      );

      const createdOwner = mapAuthUser(
        response && typeof response === 'object' && 'data' in response
          ? (response as { data?: unknown }).data
          : response
      );

      if (createdOwner) {
        setUsers((prev) => {
          const withoutDuplicate = prev.filter((user) => String(user.id) !== String(createdOwner.id));
          return [...withoutDuplicate, createdOwner];
        });
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Creation du proprietaire impossible.');
    } finally {
      setAuthBusy(false);
    }
  };

  // Append new log automatically
  const addAuditLog = (module: string, action: string, newValue?: string, oldValue?: string) => {
    const newLog: AuditLog = {
      id: generateId('aud'),
      user: role === 'admin' ? 'Admin' : 'Propriétaire',
      module,
      action,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      device: "Safari Desktop",
      syncStatus: getSyncStatus()
    };
    setAuditLogs((prev) => [...prev, newLog]);
  };

  // Connectivity Sync Handler
  const handleToggleOffline = async () => {
    if (isOffline) {
      setIsSyncing(true);
      try {
        if (authToken) {
          const localCache = readWorkspaceCache(authUser?.id);
          if (activeFarmId) {
            const syncResult = await syncLocalCacheToServer(authToken, activeFarmId, localCache);
            if (syncResult.pendingCache) {
              writeWorkspaceCache(authUser?.id, syncResult.pendingCache);
            } else if (syncResult.syncedCount > 0) {
              clearWorkspaceCache(authUser?.id);
            }
          }
          await hydrateWorkspace(authToken, { silent: true });
        }

        setIsOffline(false);
        setAuditLogs((prev) =>
          prev.map((log) => (log.syncStatus === 'pending' ? { ...log, syncStatus: 'synced' } : log))
        );
        pushNotice('success', 'Synchronisation relancée', 'Les données locales ont été resynchronisées en arrière-plan.');
      } catch (error) {
        console.error('Reconnect sync failed:', error);
        setAuditLogs((prev) =>
          prev.map((log) => (log.syncStatus === 'pending' ? { ...log, syncStatus: 'error' } : log))
        );
        pushNotice('error', 'Synchronisation incomplète', 'Certaines opérations locales n’ont pas encore pu être renvoyées au serveur.');
      } finally {
        setIsSyncing(false);
      }
      return;
      /*
        // Trigger a success notification
        const newAlert: Alert = {
          id: generateId('alt'),
          title: "Synchronisation réussie",
          description: "La PWA s'est reconnectée avec succès. Toutes les données locales ont été synchronisées avec le serveur central de Fermé+.",
          severity: 'info',
          date: new Date().toISOString(),
          read: false,
          sourceModule: "Synchronisation"
        };
        setAlerts((prev) => [newAlert, ...prev]);
        
        // Log sync event
        const newLog: AuditLog = {
          id: generateId('aud'),
          user: 'Admin',
          module: 'Système',
          action: 'Synchronisation globale réussie des modifications locales',
          newValue: 'Base de données reconnectée',
          timestamp: new Date().toISOString(),
          device: 'Safari Desktop',
          syncStatus: 'synced'
        };
        setAuditLogs((prev) => [...prev, newLog]);
      }, 2000);
      */
    } else {
      setIsOffline(true);
      pushNotice('info', 'Mode hors ligne', 'Les nouvelles opérations seront conservées localement jusqu’à la prochaine reconnexion.');
    }
  };

  // Moteur d'Interconnexion: Core Operations

  // 1. Create a Livestock Lot
  const handleAddLot = async (newLotData: Omit<Lot, 'id' | 'currentCount' | 'mortalityCount'>) => {
    const lotId = generateId('lot');
    let persistedLotId = lotId;
    const newLot: Lot = {
      ...newLotData,
      id: lotId,
      currentCount: newLotData.initialCount,
      mortalityCount: 0
    };

    setLots((prev) => [...prev, newLot]);

    if (authToken && activeFarmId) {
      try {
        const response = await postJson(
          '/pondeuses',
          {
            farm_id: Number(activeFarmId),
            name: newLot.name,
            breed: newLot.breed,
            entry_date: newLot.entryDate,
            initial_count: newLot.initialCount,
            mortality_total: newLot.mortalityCount,
            reform_total: 0,
            current_count: newLot.currentCount,
            status: newLot.status,
            unit_cost: newLot.unitCost ?? 0,
            acquisition_cost: newLot.acquisitionCost ?? newLot.initialCount * (newLot.unitCost ?? 0),
          },
          authToken
        );
        const backendId = response.data && typeof response.data === 'object' ? String((response.data as Record<string, unknown>).id ?? '') : '';
        if (backendId) {
          persistedLotId = backendId;
          setLots((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, id: backendId } : lot)));
        }
      } catch (error) {
        console.error('Lot sync failed:', error);
      }
    }

    // Financial debit
    const cost = newLotData.acquisitionCost ?? newLotData.initialCount * (newLotData.unitCost ?? 0);
    const txId = generateId('tx');
    const newTx: FinanceTransaction = {
      id: txId,
      type: 'expense',
      category: 'Achat Animaux',
      amount: cost,
      date: newLotData.entryDate,
      description: `Achat initial de ${newLotData.initialCount} poussins/bêtes pour le lot ${newLotData.name}`,
      sourceModule: 'Élevage',
      sourceElementId: persistedLotId
    };
    setTransactions((prev) => [...prev, newTx]);

    // Audit trace
    addAuditLog(
      'Élevage',
      `Création du lot d'animaux ${newLot.name}`,
      `Effectif: ${newLot.initialCount} bêtes, Coût achat: ${cost} ${settings.currency}`
    );
  };

  // 2. Report Animal Mortality
  const handleReportMortality = (lotId: string, count: number) => {
    setLots((prev) =>
      prev.map((l) => {
        if (l.id === lotId) {
          const newMorts = l.mortalityCount + count;
          const newCurrent = Math.max(l.currentCount - count, 0);

          // Check for high mortality alert
          const pct = (newMorts / l.initialCount) * 100;
          if (pct > 5) {
            const alt: Alert = {
              id: generateId('alt'),
              title: `Mortalité élevée critique : ${l.name}`,
              description: `Le taux de mortalité du lot ${l.name} est préoccupant et atteint ${pct.toFixed(1)}%. Inspecter le bâtiment.`,
              severity: 'critical',
              date: new Date().toISOString(),
              read: false,
              sourceModule: 'Élevage',
              sourceElementId: lotId
            };
            setAlerts((prev) => [alt, ...prev]);
          }

          addAuditLog(
            'Élevage',
            `Signalement de ${count} bêtes mortes sur le lot ${l.name}`,
            `Nouveau total morts: ${newMorts} bêtes`
          );

          return { ...l, mortalityCount: newMorts, currentCount: newCurrent };
        }
        return l;
      })
    );

    if (authToken && activeFarmId) {
      const backendLotId = Number(lotId);
      if (Number.isFinite(backendLotId) && backendLotId > 0) {
        const targetLot = lots.find((item) => item.id === lotId);
        if (targetLot) {
          patchJson(
            `/pondeuses/${backendLotId}`,
            {
              mortality_total: targetLot.mortalityCount + count,
              current_count: Math.max(targetLot.currentCount - count, 0),
            },
            authToken
          ).catch((error) => {
            console.error('Mortality sync failed:', error);
          });
        }
      }
    }
  };

  // 3. Daily Egg Collection Production
  const handleRecordPonte = async (data: Omit<EggProduction, 'id' | 'stockCount'>) => {
    const latestProd = eggProductions[eggProductions.length - 1];
    const prevStock = latestProd ? latestProd.stockCount : 0;
    const newStock = prevStock + data.compliantCount;

    const prodId = generateId('egg');
    const newProd: EggProduction = {
      ...data,
      id: prodId,
      stockCount: newStock
    };

    setEggProductions((prev) => [...prev, newProd]);

    if (authToken && activeFarmId) {
      const backendLayerBatchId = Number(data.lotId);
      if (!Number.isFinite(backendLayerBatchId) || backendLayerBatchId <= 0) {
        console.warn('Egg production sync skipped: invalid backend lot id', data.lotId);
      } else {
      try {
        await postJson(
          '/pondeuses/productions',
          {
            farm_id: Number(activeFarmId),
            layer_batch_id: backendLayerBatchId,
            production_date: data.date,
            eggs_produced: data.collectedCount,
            broken_eggs: data.brokenCount,
            dirty_eggs: data.lossesCount,
            lost_eggs: Math.max(data.collectedCount - data.compliantCount - data.brokenCount - data.lossesCount, 0),
            mortality: 0,
            observations: '',
          },
          authToken
        );
      } catch (error) {
        console.error('Egg production sync failed:', error);
      }
      }
    }

    addAuditLog(
      'Pondeuses',
      `Collecte d'œufs journalière`,
      `${data.collectedCount} collectés, ${data.compliantCount} conformes, nouveau stock: ${newStock} œufs`
    );
  };

  // 4. Feed Livestock from Stock
  const handleRecordFeeding = async (lotId: string, articleId: string, quantity: number, feedingDate: string, feedingTime?: string, notes?: string) => {
    const targetLot = lots.find((lot) => lot.id === lotId);
    const targetArticle = articles.find((article) => article.id === articleId);

    if (!targetLot || !targetArticle || quantity <= 0) return;
    if (targetArticle.quantity < quantity) {
      console.warn('Livestock feeding blocked: insufficient stock', {
        articleId,
        availableQuantity: targetArticle.quantity,
        requestedQuantity: quantity,
      });
      pushNotice('warning', 'Stock insuffisant', `${targetArticle.name} ne dispose que de ${targetArticle.quantity} ${targetArticle.unit}.`);
      return;
    }

    const unitCost = targetArticle.unitCost ?? 0;
    const totalCost = quantity * unitCost;
    const feedingId = generateId('feed');
    const movementId = generateId('mov');
    const normalizedTime = feedingTime?.trim() || undefined;

    const newFeeding: AnimalFeeding = {
      id: feedingId,
      lotId,
      lotName: targetLot.name,
      articleId,
      articleName: targetArticle.name,
      date: feedingDate,
      time: normalizedTime,
      quantity,
      unit: targetArticle.unit,
      unitCost,
      totalCost,
      notes: notes?.trim() || '',
    };

    setAnimalFeedings((prev) =>
      [newFeeding, ...prev].sort((left, right) => {
        const leftStamp = new Date(`${left.date}T${left.time || '00:00'}:00`).getTime();
        const rightStamp = new Date(`${right.date}T${right.time || '00:00'}:00`).getTime();
        return rightStamp - leftStamp;
      })
    );

    setArticles((prev) =>
      prev.map((article) => {
        if (article.id !== articleId) return article;
        const nextQuantity = Math.max(article.quantity - quantity, 0);

        if (nextQuantity <= article.minThreshold) {
          const alt: Alert = {
            id: generateId('alt'),
            title: `Stock faible : ${article.name}`,
            description: `Le stock de ${article.name} est descendu à ${nextQuantity} ${article.unit}. Le seuil minimum est ${article.minThreshold} ${article.unit}.`,
            severity: nextQuantity === 0 ? 'critical' : 'warning',
            date: new Date().toISOString(),
            read: false,
            sourceModule: 'Stocks',
            sourceElementId: articleId
          };
          setAlerts((prevAlerts) => [alt, ...prevAlerts]);
        }

        return {
          ...article,
          quantity: nextQuantity,
          totalPurchasePrice: nextQuantity * (article.unitCost ?? 0),
        };
      })
    );

    const newMovement: StockMovement = {
      id: movementId,
      articleId,
      type: 'out',
      quantity,
      date: feedingDate,
      reason: `Distribution de ${targetArticle.name} au lot ${targetLot.name}`,
      sourceModule: 'Élevage',
      sourceElementId: lotId,
      unitCost,
    };
    setMovements((prev) => [newMovement, ...prev]);

    if (totalCost > 0) {
      const newTransaction: FinanceTransaction = {
        id: generateId('tx'),
        type: 'expense',
        category: 'Alimentation animale',
        amount: totalCost,
        date: feedingDate,
        description: `${targetArticle.name} distribué au lot ${targetLot.name} (${quantity} ${targetArticle.unit})`,
        sourceModule: 'Élevage',
        sourceElementId: lotId,
      };
      setTransactions((prev) => [newTransaction, ...prev]);
    }

    addAuditLog(
      'Élevage',
      `Distribution d'aliment au lot ${targetLot.name}`,
      `${quantity} ${targetArticle.unit} de ${targetArticle.name} pour ${totalCost.toLocaleString('fr-FR')} ${settings.currency}`
    );

    if (authToken && activeFarmId) {
      const backendLotId = Number(lotId);
      const backendArticleId = Number(articleId);

      if (!Number.isFinite(backendLotId) || backendLotId <= 0 || !Number.isFinite(backendArticleId) || backendArticleId <= 0) {
        console.warn('Livestock feeding sync skipped: invalid backend ids', { lotId, articleId });
      } else {
        try {
          const response = await postJson(
            '/pondeuses/feedings',
            {
              farm_id: Number(activeFarmId),
              layer_batch_id: backendLotId,
              stock_item_id: backendArticleId,
              feeding_date: feedingDate,
              feeding_time: normalizedTime ?? null,
              quantity,
              notes: notes?.trim() || '',
            },
            authToken
          );
          const backendId = response.data && typeof response.data === 'object' ? String((response.data as Record<string, unknown>).id ?? '') : '';
          if (backendId) {
            setAnimalFeedings((prev) => prev.map((feeding) => (feeding.id === feedingId ? { ...feeding, id: backendId } : feeding)));
          }
        } catch (error) {
          console.error('Livestock feeding sync failed:', error);
        }
      }
    }
  };

  // 5. Record Livestock Weighing
  const handleRecordWeighing = async (lotId: string, averageWeightKg: number, weighingDate: string, sampleSize?: number, notes?: string) => {
    const targetLot = lots.find((lot) => lot.id === lotId);
    if (!targetLot || averageWeightKg <= 0) return;

    const previousWeighing = [...animalWeighings]
      .filter((weighing) => weighing.lotId === lotId)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0];

    const weighingId = generateId('weigh');
    const normalizedSampleSize = sampleSize && sampleSize > 0 ? sampleSize : undefined;
    const totalWeightKg = Number((averageWeightKg * Math.max(normalizedSampleSize ?? targetLot.currentCount, 1)).toFixed(3));
    const weightGainKg = Number((averageWeightKg - (previousWeighing?.averageWeightKg ?? averageWeightKg)).toFixed(3));

    const newWeighing: AnimalWeighing = {
      id: weighingId,
      lotId,
      lotName: targetLot.name,
      date: weighingDate,
      sampleSize: normalizedSampleSize,
      averageWeightKg,
      totalWeightKg,
      weightGainKg: previousWeighing ? weightGainKg : 0,
      notes: notes?.trim() || '',
    };

    setAnimalWeighings((prev) =>
      [newWeighing, ...prev].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    );

    if (previousWeighing && weightGainKg <= 0) {
      const alt: Alert = {
        id: generateId('alt'),
        title: `Croissance à surveiller : ${targetLot.name}`,
        description: `La pesée du ${weighingDate} indique un gain moyen de ${weightGainKg.toFixed(3)} kg pour le lot ${targetLot.name}.`,
        severity: 'warning',
        date: new Date().toISOString(),
        read: false,
        sourceModule: 'Élevage',
        sourceElementId: lotId,
      };
      setAlerts((prev) => [alt, ...prev]);

      const followUpTaskId = generateId('task');
      const followUpTask: Task = {
        id: followUpTaskId,
        title: `Contrôler la croissance du lot ${targetLot.name}`,
        description: `Analyser l'alimentation, l'ambiance et le sanitaire suite à la pesée du ${weighingDate}.`,
        sourceModule: 'Élevage',
        sourceElementId: lotId,
        sourceEntityType: 'layer_batch',
        startDate: getTodayDate(),
        dueDate: weighingDate,
        priority: 'high',
        status: 'todo',
        assignedTo: authUser?.name ?? settings.managerName,
        farmId: activeFarmId ?? undefined,
      };
      setTasks((prev) => [followUpTask, ...prev]);
    }

    addAuditLog(
      'Élevage',
      `Pesée enregistrée pour le lot ${targetLot.name}`,
      `${averageWeightKg.toFixed(3)} kg de poids moyen`
    );

    if (authToken && activeFarmId) {
      const backendLotId = Number(lotId);
      if (!Number.isFinite(backendLotId) || backendLotId <= 0) {
        console.warn('Livestock weighing sync skipped: invalid backend lot id', lotId);
      } else {
        try {
          const response = await postJson(
            '/pondeuses/weighings',
            {
              farm_id: Number(activeFarmId),
              layer_batch_id: backendLotId,
              weighing_date: weighingDate,
              sample_size: normalizedSampleSize ?? null,
              average_weight_kg: averageWeightKg,
              total_weight_kg: totalWeightKg,
              notes: notes?.trim() || '',
            },
            authToken
          );
          const backendId = response.data && typeof response.data === 'object' ? String((response.data as Record<string, unknown>).id ?? '') : '';
          if (backendId) {
            setAnimalWeighings((prev) => prev.map((weighing) => (weighing.id === weighingId ? { ...weighing, id: backendId } : weighing)));
          }
        } catch (error) {
          console.error('Livestock weighing sync failed:', error);
        }
      }
    }
  };

  // 6. Create Livestock Feed Plan
  const handleCreateFeedPlan = async (
    lotId: string,
    planName: string,
    rationPerHeadKg: number,
    feedingsPerDay: number,
    startDate: string,
    articleId?: string,
    notes?: string
  ) => {
    const targetLot = lots.find((lot) => lot.id === lotId);
    const targetArticle = articleId ? articles.find((article) => article.id === articleId) : undefined;
    if (!targetLot || rationPerHeadKg <= 0 || feedingsPerDay <= 0) return;

    const planId = generateId('plan');
    const targetDailyQuantityKg = Number((rationPerHeadKg * Math.max(targetLot.currentCount, 1)).toFixed(3));
    const newPlan: AnimalFeedPlan = {
      id: planId,
      lotId,
      lotName: targetLot.name,
      articleId: articleId || '',
      articleName: targetArticle?.name ?? '',
      planName,
      rationPerHeadKg,
      feedingsPerDay,
      targetDailyQuantityKg,
      startDate,
      notes: notes?.trim() || '',
      isActive: true,
    };

    setAnimalFeedPlans((prev) => [
      newPlan,
      ...prev.filter((plan) => plan.lotId !== lotId),
    ]);

    addAuditLog(
      'Élevage',
      `Plan d'alimentation créé pour ${targetLot.name}`,
      `${rationPerHeadKg.toFixed(3)} kg/tête/jour, ${feedingsPerDay} distribution(s)`
    );

    if (authToken && activeFarmId) {
      const backendLotId = Number(lotId);
      const backendArticleId = articleId ? Number(articleId) : null;
      if (!Number.isFinite(backendLotId) || backendLotId <= 0) {
        console.warn('Feed plan sync skipped: invalid backend lot id', lotId);
      } else {
        try {
          const response = await postJson(
            '/pondeuses/feed-plans',
            {
              farm_id: Number(activeFarmId),
              layer_batch_id: backendLotId,
              stock_item_id: backendArticleId && Number.isFinite(backendArticleId) && backendArticleId > 0 ? backendArticleId : null,
              plan_name: planName,
              ration_per_head_kg: rationPerHeadKg,
              feedings_per_day: feedingsPerDay,
              target_daily_quantity_kg: targetDailyQuantityKg,
              start_date: startDate,
              notes: notes?.trim() || '',
              is_active: true,
            },
            authToken
          );
          const backendId = response.data && typeof response.data === 'object' ? String((response.data as Record<string, unknown>).id ?? '') : '';
          if (backendId) {
            setAnimalFeedPlans((prev) => prev.map((plan) => (plan.id === planId ? { ...plan, id: backendId } : plan)));
          }
        } catch (error) {
          console.error('Feed plan sync failed:', error);
        }
      }
    }
  };

  // 7. Sell Eggs
  const handleSellEggs = async (count: number, unitPrice: number, description: string) => {
    const latestProd = eggProductions[eggProductions.length - 1];
    const prevStock = latestProd ? latestProd.stockCount : 0;
    const newStock = Math.max(prevStock - count, 0);
    const saleLotId = latestProd?.lotId
      ?? lots.find((lot) => lot.species.includes('Pondeuses') && lot.status === 'active')?.id
      ?? '';

    if (!saleLotId) {
      console.warn('Egg sale blocked: no active laying lot available');
      pushNotice('warning', 'Vente impossible', 'Aucun lot de pondeuses actif n’est disponible pour enregistrer cette vente.');
      return;
    }

    const customerName = description.trim() || 'Client comptoir';

    // Update egg productions stock
    const prodId = generateId('egg');
    const newProd: EggProduction = {
      id: prodId,
      date: getTodayDate(),
      lotId: saleLotId,
      collectedCount: 0,
      compliantCount: 0,
      brokenCount: 0,
      lossesCount: 0,
      soldCount: count,
      stockCount: newStock
    };
    setEggProductions((prev) => [...prev, newProd]);

    const saleId = generateId('egg-sale');
    const newSale: EggSale = {
      id: saleId,
      date: getTodayDate(),
      lotId: saleLotId,
      customerName,
      traysSold: Math.max(Math.ceil(count / 30), 1),
      eggsSold: count,
      unitPrice,
      amountPaid: count * unitPrice,
      remainingDue: 0,
    };
    setEggSales((prev) => [newSale, ...prev]);

    // Financial credit
    const revenue = count * unitPrice;
    const txId = generateId('tx');
    const newTx: FinanceTransaction = {
      id: txId,
      type: 'income',
      category: 'Vente Oeufs',
      amount: revenue,
      date: getTodayDate(),
      description: `${customerName} (${count} œufs à ${unitPrice} ${settings.currency}/u)`,
      sourceModule: 'Pondeuses',
      sourceElementId: prodId
    };
    setTransactions((prev) => [...prev, newTx]);

    if (authToken && activeFarmId) {
      const backendLayerBatchId = Number(newProd.lotId);
      if (!Number.isFinite(backendLayerBatchId) || backendLayerBatchId <= 0) {
        console.warn('Egg sale sync skipped: invalid backend lot id', newProd.lotId);
      } else {
      try {
        const response = await postJson(
          '/pondeuses/sales',
          {
            farm_id: Number(activeFarmId),
            layer_batch_id: backendLayerBatchId,
            sale_date: getTodayDate(),
            customer_name: customerName,
            trays_sold: Math.max(Math.ceil(count / 30), 1),
            eggs_sold: count,
            unit_price: unitPrice,
            amount_paid: revenue,
            remaining_due: 0,
            payment_method: 'cash',
            notes: customerName,
          },
          authToken
        );
        const backendId = response.data && typeof response.data === 'object' ? String((response.data as Record<string, unknown>).id ?? '') : '';
        if (backendId) {
          setEggSales((prev) => prev.map((sale) => (sale.id === saleId ? { ...sale, id: backendId } : sale)));
        }
      } catch (error) {
        console.error('Egg sale sync failed:', error);
      }
      }
    }

    addAuditLog(
      'Pondeuses',
      `Vente de plateaux d'œufs`,
      `Œufs vendus: ${count}, Revenu: ${revenue} ${settings.currency}, Stock restant: ${newStock}`
    );
  };

  // 8. Feed Fish (distribute pellets from stock)
  const handleFeedFish = async (bassinId: string, articleId: string, quantity: number) => {
    // Subtract from Stocks
    setArticles((prev) =>
      prev.map((art) => {
        if (art.id === articleId) {
          const newQty = Math.max(art.quantity - quantity, 0);

          // Trigger Alert if below min threshold
          if (newQty <= art.minThreshold) {
            const alt: Alert = {
              id: generateId('alt'),
              title: `Rupture ou stock faible imminent : ${art.name}`,
              description: `Le stock de ${art.name} est à ${newQty} ${art.unit}, passant sous le seuil minimum de ${art.minThreshold} ${art.unit}. Commandez du stock.`,
              severity: 'warning',
              date: new Date().toISOString(),
              read: false,
              sourceModule: 'Stocks',
              sourceElementId: articleId
            };
            setAlerts((prev) => [alt, ...prev]);
          }

          return { ...art, quantity: newQty };
        }
        return art;
      })
    );

    // Log stock movement
    const movId = generateId('mov');
    const newMov: StockMovement = {
      id: movId,
      articleId,
      type: 'out',
      quantity,
      date: getTodayDate(),
      reason: `Alimentation quotidienne poissons pour bassin ${bassinId}`,
      sourceModule: 'Pisciculture',
      sourceElementId: bassinId
    };
    setMovements((prev) => [...prev, newMov]);

    if (authToken && activeFarmId) {
      const backendBassinId = Number(bassinId);
      const backendArticleId = Number(articleId);
      if (!Number.isFinite(backendBassinId) || backendBassinId <= 0 || !Number.isFinite(backendArticleId) || backendArticleId <= 0) {
        console.warn('Fish feeding sync skipped: invalid backend ids', { bassinId, articleId });
      } else {
      try {
        const nextQuantity = Math.max((articles.find((art) => art.id === articleId)?.quantity ?? 0) - quantity, 0);
        await patchJson(
          `/stocks/${backendArticleId}`,
          {
            current_quantity: nextQuantity,
          },
          authToken
        );
        await postJson(
          '/stocks/movements',
          {
            farm_id: Number(activeFarmId),
            stock_item_id: backendArticleId,
            type: 'out',
            quantity,
            unit_cost: null,
            source_module: 'Pisciculture',
            source_entity_type: 'fish_pond',
            source_entity_id: String(backendBassinId),
            operation_id: movId,
          },
          authToken
        );
      } catch (error) {
        console.error('Fish feeding sync failed:', error);
      }
      }
    }

    addAuditLog(
      'Pisciculture',
      `Distribution bimensuelle de granulés`,
      `Quantité: ${quantity} kg déduite du stock d'intrants`
    );
  };

  // 9. Harvest & Sell Fish
  const handleHarvestFish = async (bassinId: string, harvestWeightKg: number, revenueAmount: number) => {
    setFishBassins((prev) =>
      prev.map((b) => {
        if (b.id === bassinId) {
          return {
            ...b,
            currentCount: 0,
            status: 'inactive',
            harvestDate: getTodayDate()
          };
        }
        return b;
      })
    );

    // Financial credit
    const txId = generateId('tx');
    const newTx: FinanceTransaction = {
      id: txId,
      type: 'income',
      category: 'Vente Animaux',
      amount: revenueAmount,
      date: getTodayDate(),
      description: `Vente récolte aquacole : ${harvestWeightKg} kg de poissons vendus`,
      sourceModule: 'Pisciculture',
      sourceElementId: bassinId
    };
    setTransactions((prev) => [...prev, newTx]);

    if (authToken && activeFarmId) {
      const backendBassinId = Number(bassinId);
      if (!Number.isFinite(backendBassinId) || backendBassinId <= 0) {
        console.warn('Fish harvest sync skipped: invalid backend bassin id', bassinId);
      } else {
        try {
          await patchJson(
            `/pisciculture/${backendBassinId}`,
            {
              current_estimated_count: 0,
              status: 'inactive',
              harvest_date: getTodayDate(),
            },
            authToken
          );
          const harvestResponse = await postJson(
            '/pisciculture/harvests',
            {
            farm_id: Number(activeFarmId),
            fish_pond_id: backendBassinId,
            harvest_date: getTodayDate(),
            total_weight_kg: harvestWeightKg,
            losses_kg: 0,
            destination: 'Vente directe',
            notes: `Récolte enregistrée: ${harvestWeightKg} kg`,
          },
          authToken
        );
        const backendHarvestId = harvestResponse.data && typeof harvestResponse.data === 'object'
          ? Number((harvestResponse.data as Record<string, unknown>).id ?? 0)
          : 0;
        await postJson(
          '/pisciculture/sales',
          {
            farm_id: Number(activeFarmId),
            fish_pond_id: backendBassinId,
            fish_harvest_id: backendHarvestId > 0 ? backendHarvestId : null,
            sale_date: getTodayDate(),
            customer_name: 'Vente bassin',
            kilograms_sold: harvestWeightKg,
            unit_price: harvestWeightKg > 0 ? revenueAmount / harvestWeightKg : 0,
            amount_paid: revenueAmount,
            remaining_due: 0,
            payment_method: 'cash',
            notes: 'Vente de poissons issue de la récolte',
          },
          authToken
        );
      } catch (error) {
        console.error('Fish harvest sync failed:', error);
      }
      }
    }

    addAuditLog(
      'Pisciculture',
      `Récolte et vente du bassin aquacole`,
      `Poids vendu: ${harvestWeightKg} kg, Revenu: ${revenueAmount} ${settings.currency}`
    );
  };

  // 7. Harvest Crop Campaign
  const handleHarvestCampaign = async (campaignId: string, actualYieldTons: number, salesRevenue: number) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campaignId) {
          // Release parcelle status to fallow
          setParcelles((prevP) =>
            prevP.map((p) => (p.id === c.parcelleId ? { ...p, status: 'fallow' } : p))
          );

          return {
            ...c,
            status: 'harvested',
            actualYield: actualYieldTons,
            revenues: salesRevenue,
            endDate: getTodayDate()
          };
        }
        return c;
      })
    );

    // Financial income transaction
    if (salesRevenue > 0) {
      const txId = generateId('tx');
      const newTx: FinanceTransaction = {
        id: txId,
        type: 'income',
        category: 'Vente Cultures',
        amount: salesRevenue,
        date: getTodayDate(),
        description: `Vente de récolte agricole : ${actualYieldTons} tonnes récoltées`,
        sourceModule: 'Cultures',
        sourceElementId: campaignId
      };
      setTransactions((prev) => [...prev, newTx]);
    }

    if (authToken && activeFarmId && campaign) {
      const backendCropId = Number(campaignId);
      const backendPlotId = Number(campaign.parcelleId);
      if (Number.isFinite(backendCropId) && backendCropId > 0 && Number.isFinite(backendPlotId) && backendPlotId > 0) {
        try {
          await patchJson(
            `/cultures/${backendCropId}`,
            {
              status: 'harvested',
              total_harvest_kg: actualYieldTons * 1000,
              estimated_harvest_date: getTodayDate(),
              total_operations_cost: campaign.expenses,
            },
            authToken
          );
          const harvestResponse = await postJson(
            '/cultures/harvests',
            {
              farm_id: Number(activeFarmId),
              crop_id: backendCropId,
              plot_id: backendPlotId,
              harvest_date: getTodayDate(),
              harvested_kg: actualYieldTons * 1000,
              losses_kg: 0,
              destination: 'Vente directe',
              notes: `Récolte enregistrée pour la campagne ${campaign.cropType}`,
            },
            authToken
          );
          const backendHarvestId = harvestResponse.data && typeof harvestResponse.data === 'object'
            ? Number((harvestResponse.data as Record<string, unknown>).id ?? 0)
            : 0;
          if (salesRevenue > 0) {
            await postJson(
              '/cultures/sales',
              {
                farm_id: Number(activeFarmId),
                crop_id: backendCropId,
                crop_harvest_id: backendHarvestId > 0 ? backendHarvestId : null,
                sale_date: getTodayDate(),
                customer_name: 'Vente récolte',
                kilograms_sold: actualYieldTons * 1000,
                unit_price: actualYieldTons > 0 ? salesRevenue / (actualYieldTons * 1000) : 0,
                amount_paid: salesRevenue,
                remaining_due: 0,
                payment_method: 'cash',
                notes: `Revenu de récolte pour ${campaign.cropType}`,
              },
              authToken
            );
          }
        } catch (error) {
          console.error('Crop harvest sync failed:', error);
        }
      }
    }

    addAuditLog(
      'Cultures',
      `Récolte de la campagne agricole`,
      `Rendement obtenu: ${actualYieldTons} tonnes, Vente récolte: ${salesRevenue} ${settings.currency}`
    );
  };

  // 8. Manual Stock Adjustments
  const handleAdjustStock = async (articleId: string, quantityToAdd: number, reason: string) => {
    const currentArticle = articles.find((art) => art.id === articleId);
    const appliedUnitCost = quantityToAdd > 0 ? (currentArticle?.unitCost ?? 0) : null;

    setArticles((prev) =>
      prev.map((art) => {
        if (art.id === articleId) {
          const newQty = art.quantity + quantityToAdd;
          return { ...art, quantity: newQty };
        }
        return art;
      })
    );

    // Log stock movement
    const movId = generateId('mov');
    const newMov: StockMovement = {
      id: movId,
      articleId,
      type: quantityToAdd > 0 ? 'in' : 'out',
      quantity: Math.abs(quantityToAdd),
      unitCost: appliedUnitCost,
      date: getTodayDate(),
      reason,
      sourceModule: 'Stocks'
    };
    setMovements((prev) => [...prev, newMov]);

    if (authToken && activeFarmId) {
      const backendArticleId = Number(articleId);
      if (!Number.isFinite(backendArticleId) || backendArticleId <= 0) {
        console.warn('Stock adjustment sync skipped: invalid backend stock id', articleId);
      } else {
      try {
        await postJson(
          '/stocks/movements',
          {
            stock_item_id: backendArticleId,
            type: quantityToAdd > 0 ? 'in' : 'out',
            quantity: Math.abs(quantityToAdd),
            unit_cost: appliedUnitCost,
            source_module: 'Stocks',
            source_entity_type: 'stock_item',
            source_entity_id: articleId,
            operation_id: movId,
          },
          authToken
        );
      } catch (error) {
        console.error('Stock adjustment sync failed:', error);
      }
      }
    }

    // Financial transaction if purchase (adding stock)
    if (quantityToAdd > 0) {
      const cost = quantityToAdd * (currentArticle?.unitCost ?? 0);
      const txId = generateId('tx');
      const newTx: FinanceTransaction = {
        id: txId,
        type: 'expense',
        category: 'Alimentation',
        amount: cost,
        date: getTodayDate(),
        description: `Approvisionnement stock : ${quantityToAdd} kg d'intrants`,
        sourceModule: 'Stocks',
        sourceElementId: movId
      };
      setTransactions((prev) => [...prev, newTx]);

      if (authToken && activeFarmId) {
        try {
          await postJson(
            '/finances',
            {
              farm_id: Number(activeFarmId),
              type: 'expense',
              amount: cost,
              category: 'Alimentation',
              description: `Approvisionnement stock : ${quantityToAdd} kg d'intrants`,
              source_module: 'Stocks',
              source_entity_type: 'stock_item',
              source_entity_id: articleId,
              operation_id: movId,
              occurred_at: new Date().toISOString(),
            },
            authToken
          );
        } catch (error) {
          console.error('Stock purchase finance sync failed:', error);
        }
      }
    }

    addAuditLog(
      'Stocks',
      `Ajustement manuel de l'article`,
      `Quantité: ${quantityToAdd > 0 ? '+' : ''}${quantityToAdd}, Motif: ${reason}`
    );
  };

  // 9. Generate Purchase Task from Low Stock alert
  const handleGeneratePurchaseTask = async (article: StockArticle) => {
    const taskId = generateId('task');
    const newTask: Task = {
      id: taskId,
      title: `Commander : ${article.name}`,
      description: `Le stock d'intrant ${article.name} est de ${article.quantity} ${article.unit}. Réapprovisionner au magasin d'intrants.`,
      sourceModule: 'Stocks',
      sourceElementId: article.id,
      startDate: getTodayDate(),
      dueDate: getTodayDate(),
      priority: 'high',
      status: 'todo',
      assignedTo: authUser?.name ?? settings.managerName,
      farmId: activeFarmId ?? undefined
    };

    setTasks((prev) => [newTask, ...prev]);

    if (authToken && activeFarmId) {
      try {
        const response = await postJson<Task>(
          '/tasks',
          {
            farm_id: Number(activeFarmId),
            title: newTask.title,
            description: newTask.description,
            source_module: newTask.sourceModule,
            source_entity_type: 'stock_item',
            source_entity_id: newTask.sourceElementId ?? article.id,
            start_at: toUtcIso(newTask.startDate, '08:00'),
            priority: newTask.priority,
            status: newTask.status,
            due_at: toUtcIso(newTask.dueDate, '17:00'),
            reminder_at: toUtcIso(newTask.dueDate, '06:00'),
            assigned_to: authUser?.id ? Number(authUser.id) : undefined,
          },
          authToken
        );
        const backendTask = response.data;
        if (backendTask) {
          setTasks((prev) => [mapTasks([backendTask], users)[0], ...prev.filter((task) => task.id !== taskId)]);
        }
      } catch (error) {
        console.error('Task sync failed:', error);
      }
    }

    addAuditLog(
      'Tâches',
      `Génération automatique d'une tâche d'approvisionnement`,
      `Article: ${article.name}, Assigner à: ${settings.managerName}`
    );
  };

  // 10. Manual accounting transaction
  const handleAddManualTransaction = async (tx: Omit<FinanceTransaction, 'id' | 'sourceModule'>) => {
    const txId = generateId('tx');
    const newTx: FinanceTransaction = {
      ...tx,
      id: txId,
      sourceModule: 'Finances'
    };

    setTransactions((prev) => [...prev, newTx]);

    if (authToken && activeFarmId) {
      try {
        const response = await postJson(
          '/finances',
          {
            farm_id: Number(activeFarmId),
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            description: tx.description,
            source_module: 'Finances',
            source_entity_id: null,
            source_entity_type: null,
            occurred_at: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
          },
          authToken
        );
        const backendId = response.data && typeof response.data === 'object'
          ? String((response.data as Record<string, unknown>).id ?? '')
          : '';
        if (backendId) {
          setTransactions((prev) => prev.map((item) => (item.id === txId ? { ...item, id: backendId } : item)));
        }
      } catch (error) {
        console.error('Manual transaction sync failed:', error);
      }
    }

    addAuditLog(
      'Finances',
      `Enregistrement d'un mouvement comptable manuel`,
      `${tx.type === 'income' ? 'Revenu' : 'Dépense'} : ${tx.amount} ${settings.currency} (${tx.description})`
    );
  };

  // 11. Complete scheduled vaccination or treatment
  const handleCompleteTreatment = async (treatmentId: string) => {
    const tr = treatments.find((item) => item.id === treatmentId);
    setTreatments((prev) =>
      prev.map((tr) => {
        if (tr.id === treatmentId) {
          // Subtract medic from stock
          setArticles((prevArt) =>
            prevArt.map((art) => {
              if (art.id === tr.productId) {
                return { ...art, quantity: Math.max(art.quantity - tr.quantityUsed, 0) };
              }
              return art;
            })
          );

          // Add financial debit expense
          const txId = generateId('tx');
          const newTx: FinanceTransaction = {
            id: txId,
            type: 'expense',
            category: 'Sanitaire',
            amount: tr.cost,
            date: getTodayDate(),
            description: `Administration médicale : ${tr.name}`,
            sourceModule: 'Sanitaire',
            sourceElementId: treatmentId
          };
          setTransactions((prevTx) => [...prevTx, newTx]);

          // Close any matching Task
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.sourceElementId === treatmentId ? { ...task, status: 'completed' } : task
            )
          );

          addAuditLog(
            'Sanitaire',
            `Traitement/Vaccination appliqué au lot`,
            `Traitement: ${tr.name}, Coût d'achat vétérinaire débité: ${tr.cost} ${settings.currency}`
          );

          return { ...tr, status: 'completed' };
        }
        return tr;
      })
    );

    if (authToken && activeFarmId && tr) {
      const backendTreatmentId = Number(treatmentId);
      const backendLotId = Number(tr.lotId);
      const backendProductId = Number(tr.productId);
      if (
        Number.isFinite(backendTreatmentId) &&
        backendTreatmentId > 0 &&
        Number.isFinite(backendLotId) &&
        backendLotId > 0 &&
        Number.isFinite(backendProductId) &&
        backendProductId > 0
      ) {
        try {
          await patchJson(
            `/sanitary/${backendTreatmentId}`,
            {
              status: 'completed',
              quantity_used: tr.quantityUsed,
              cost: tr.cost,
            },
            authToken
          );
          await postJson(
            '/finances',
            {
              farm_id: Number(activeFarmId),
              type: 'expense',
              amount: tr.cost,
              category: 'Sanitaire',
              description: `Administration médicale : ${tr.name}`,
              source_module: 'Sanitaire',
              source_entity_type: 'sanitary_treatment',
              source_entity_id: treatmentId,
              occurred_at: new Date().toISOString(),
            },
            authToken
          );
        } catch (error) {
          console.error('Sanitary finance sync failed:', error);
        }
      }
    }

  };

  // 12. Create a manual work task
  const handleAddTask = async (newTaskData: Omit<Task, 'id' | 'status'>) => {
    const taskId = generateId('task');
    const newTask: Task = {
      ...newTaskData,
      id: taskId,
      status: 'todo',
      farmId: activeFarmId ?? undefined
    };

    setTasks((prev) => [newTask, ...prev]);

    if (authToken && activeFarmId) {
      try {
        const response = await postJson<Task>(
          '/tasks',
          {
            farm_id: Number(activeFarmId),
            title: newTask.title,
            description: newTask.description,
            source_module: newTask.sourceModule,
            source_entity_type: newTask.sourceEntityType ?? null,
            source_entity_id: newTask.sourceElementId ?? null,
            start_at: toUtcIso(newTask.startDate, '08:00'),
            priority: newTask.priority,
            status: newTask.status,
            due_at: toUtcIso(newTask.dueDate, '17:00'),
            reminder_at: newTask.reminderAt ?? null,
            assigned_to: authUser?.id ? Number(authUser.id) : undefined,
          },
          authToken
        );
        const backendTask = response.data;
        if (backendTask) {
          setTasks((prev) => [mapTasks([backendTask], users)[0], ...prev.filter((task) => task.id !== taskId)]);
        }
      } catch (error) {
        console.error('Task sync failed:', error);
      }
    }

    addAuditLog('Tâches', `Création manuelle de la tâche : ${newTask.title}`, `Assigné à : ${newTask.assignedTo}`);
  };

  // 13. Toggle task status (Check square)
  const handleToggleTaskStatus = async (taskId: string) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;

    const newStatus = currentTask.status === 'completed' ? 'todo' : 'completed';

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    if (authToken && /^\d+$/.test(String(taskId))) {
      try {
        await patchJson<Task>('/tasks/' + taskId, { status: newStatus }, authToken);
      } catch (error) {
        console.error('Task status sync failed:', error);
      }
    }

    addAuditLog(
      'Tâches',
      `Modification du statut de la tâche : ${currentTask.title}`,
      `Nouveau statut : ${newStatus}`
    );
  };

  // 14. Dismiss Alert
  const handleDismissAlert = async (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true, status: 'resolved' } : a)));
    if (authToken && /^\d+$/.test(String(alertId))) {
      try {
        await patchJson('/alerts/' + alertId + '/resolve', {}, authToken);
      } catch (error) {
        console.error('Alert resolve sync failed:', error);
      }
    }
  };

  const handleUpdateLot = async (lotId: string, updates: Partial<Lot>) => {
    const currentLot = lots.find((lot) => lot.id === lotId);
    if (!currentLot) return;
    setLots((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, ...updates } : lot)));
    if (authToken && /^\d+$/.test(String(lotId))) {
      try {
        await patchJson(
          '/pondeuses/' + lotId,
          {
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.breed !== undefined ? { breed: updates.breed } : {}),
            ...(updates.entryDate !== undefined ? { entry_date: updates.entryDate } : {}),
            ...(updates.initialCount !== undefined ? { initial_count: updates.initialCount } : {}),
            ...(updates.mortalityCount !== undefined ? { mortality_total: updates.mortalityCount } : {}),
            ...(updates.currentCount !== undefined ? { current_count: updates.currentCount } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
          },
          authToken
        );
      } catch (error) {
        console.error('Lot update sync failed:', error);
      }
    }
    addAuditLog(
      'Élevage',
      `Modification du lot ${currentLot.name}`,
      JSON.stringify({ ...currentLot, ...updates }),
      JSON.stringify(currentLot)
    );
  };

  const handleDeleteLot = async (lotId: string) => {
    const currentLot = lots.find((lot) => lot.id === lotId);
    if (!currentLot) return;
    const hasHistory = eggProductions.some((item) => item.lotId === lotId)
      || eggSales.some((item) => item.lotId === lotId)
      || animalFeedings.some((item) => item.lotId === lotId)
      || animalWeighings.some((item) => item.lotId === lotId)
      || animalFeedPlans.some((item) => item.lotId === lotId)
      || treatments.some((item) => item.lotId === lotId);

    if (authToken && /^\d+$/.test(String(lotId))) {
      try {
        const response = await deleteJson<{
          action?: 'archived' | 'deleted';
          batch?: Record<string, unknown>;
          financial_transaction?: Record<string, unknown> | null;
        }>('/pondeuses/' + lotId, authToken);
        const payload = response.data && typeof response.data === 'object'
          ? (response.data as {
            action?: 'archived' | 'deleted';
            batch?: Record<string, unknown>;
            financial_transaction?: Record<string, unknown> | null;
          })
          : null;

        if (payload?.action === 'archived' && payload.batch) {
          const mappedLot = mapLots([payload.batch])[0];
          if (mappedLot) {
            setLots((prev) => prev.map((lot) => (lot.id === lotId ? mappedLot : lot)));
          }
          addAuditLog('Élevage', `Archivage du lot ${currentLot.name}`, 'Clôture métier automatique pour préserver la traçabilité.');
        } else {
          setLots((prev) => prev.filter((lot) => lot.id !== lotId));
          addAuditLog('Élevage', `Suppression du lot ${currentLot.name}`, `Suppression autorisée sans historique bloquant.`);
        }

        if (payload?.financial_transaction) {
          const mappedTransaction = mapTransactions([payload.financial_transaction])[0];
          if (mappedTransaction) {
            setTransactions((prev) => [mappedTransaction, ...prev.filter((item) => item.id !== mappedTransaction.id)]);
          }
        }
      } catch (error) {
        console.error('Lot delete sync failed:', error);
        pushNotice('error', 'Suppression impossible', error instanceof Error ? error.message : 'Le lot n’a pas pu être clôturé.');
      }
      return;
    }

    if (hasHistory || currentLot.currentCount > 0) {
      const remainingAnimals = Math.max(0, currentLot.currentCount);
      const removalAmount = remainingAnimals * (currentLot.unitCost ?? 0);
      setLots((prev) => prev.map((lot) => (
        lot.id === lotId ? { ...lot, status: 'archived', currentCount: 0 } : lot
      )));
      if (remainingAnimals > 0 && removalAmount > 0) {
        const transaction: FinanceTransaction = {
          id: generateId('tx'),
          type: 'expense',
          category: 'Sortie Animaux',
          amount: removalAmount,
          date: getTodayDate(),
          description: `Clôture du lot ${currentLot.name} : sortie de ${remainingAnimals} animaux valorisée à ${removalAmount.toLocaleString('fr-FR')} ${settings.currency}`,
          sourceModule: 'Élevage',
          sourceElementId: lotId,
        };
        setTransactions((prev) => [transaction, ...prev]);
      }
      addAuditLog('Élevage', `Archivage du lot ${currentLot.name}`, 'Clôture locale conservant la traçabilité.');
      return;
    }

    setLots((prev) => prev.filter((lot) => lot.id !== lotId));
    addAuditLog('Élevage', `Suppression du lot ${currentLot.name}`, 'Suppression locale sans historique.');
  };

  const handleUpdateEggProduction = (productionId: string, updates: Partial<EggProduction>) => {
    const currentProduction = eggProductions.find((item) => item.id === productionId);
    if (!currentProduction) return;
    setEggProductions((prev) => prev.map((item) => (item.id === productionId ? { ...item, ...updates } : item)));
    addAuditLog('Pondeuses', `Modification d'une collecte d'œufs`, JSON.stringify({ ...currentProduction, ...updates }), JSON.stringify(currentProduction));
  };

  const handleDeleteEggProduction = (productionId: string) => {
    const currentProduction = eggProductions.find((item) => item.id === productionId);
    if (!currentProduction) return;
    setEggProductions((prev) => prev.filter((item) => item.id !== productionId));
    addAuditLog('Pondeuses', `Suppression d'une collecte d'œufs`, currentProduction.date);
  };

  const handleAddBassin = async (data: Omit<FishBassin, 'id' | 'currentCount' | 'mortalityCount'>) => {
    const bassinId = generateId('bassin');
    const bassin: FishBassin = {
      ...data,
      id: bassinId,
      currentCount: data.initialCount,
      mortalityCount: 0,
    };
    setFishBassins((prev) => [...prev, bassin]);
    const cost = data.acquisitionCost ?? data.initialCount * (data.unitCost ?? 0);
    const transaction: FinanceTransaction = {
      id: generateId('tx'),
      type: 'expense',
      category: 'Achat Alevins',
      amount: cost,
      date: data.stockingDate,
      description: `Empoissonnement de ${data.initialCount} alevins (${data.species}) dans ${data.name}`,
      sourceModule: 'Pisciculture',
      sourceElementId: bassinId,
    };
    setTransactions((prev) => [...prev, transaction]);

    if (authToken && activeFarmId) {
      try {
        const response = await postJson('/pisciculture', {
          farm_id: Number(activeFarmId),
          name: data.name,
          pond_type: 'bassin',
          capacity_kg: 0,
          species: data.species,
          initial_fish_count: data.initialCount,
          stocking_date: data.stockingDate,
          status: data.status,
          current_estimated_count: data.initialCount,
          mortality_total: 0,
          unit_cost: data.unitCost ?? 0,
          acquisition_cost: cost,
        }, authToken);
        const backendPondId = response.data && typeof response.data === 'object'
          ? String((response.data as Record<string, unknown>).id ?? '')
          : '';

        if (backendPondId) {
          await postJson('/pisciculture/stockings', {
            farm_id: Number(activeFarmId),
            fish_pond_id: Number(backendPondId),
            stocking_date: data.stockingDate,
            fish_count: data.initialCount,
            unit_cost: data.unitCost ?? 0,
            acquisition_cost: cost,
            notes: `Empoissonnement initial du bassin ${data.name}`,
          }, authToken);
          setFishBassins((prev) => prev.map((item) => (item.id === bassinId ? { ...item, id: backendPondId } : item)));
          setTransactions((prev) => prev.map((item) => (
            item.id === transaction.id ? { ...item, sourceElementId: backendPondId } : item
          )));
        }
      } catch (error) {
        console.error('Fish pond sync failed:', error);
      }
    }
    addAuditLog('Pisciculture', `Création du bassin ${bassin.name}`, `${bassin.initialCount} alevins`);
  };

  const handleUpdateBassin = async (bassinId: string, updates: Partial<FishBassin>) => {
    const currentBassin = fishBassins.find((item) => item.id === bassinId);
    if (!currentBassin) return;
    setFishBassins((prev) => prev.map((item) => (item.id === bassinId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(bassinId))) {
      try {
        await patchJson(
          '/pisciculture/' + bassinId,
          {
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.species !== undefined ? { species: updates.species } : {}),
            ...(updates.stockingDate !== undefined ? { stocking_date: updates.stockingDate } : {}),
            ...(updates.initialCount !== undefined ? { initial_fish_count: updates.initialCount } : {}),
            ...(updates.currentCount !== undefined ? { current_estimated_count: updates.currentCount } : {}),
            ...(updates.mortalityCount !== undefined ? { mortality_total: updates.mortalityCount } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
          },
          authToken
        );
      } catch (error) {
        console.error('Fish pond update sync failed:', error);
      }
    }
    addAuditLog('Pisciculture', `Modification du bassin ${currentBassin.name}`, JSON.stringify({ ...currentBassin, ...updates }), JSON.stringify(currentBassin));
  };

const handleDeleteBassin = async (bassinId: string) => {
    const currentBassin = fishBassins.find((item) => item.id === bassinId);
    if (!currentBassin) return;
    if (authToken && /^\d+$/.test(String(bassinId))) {
      try {
        const response = await deleteJson<{
          action?: 'archived' | 'deleted';
          pond?: Record<string, unknown>;
          financial_transaction?: Record<string, unknown> | null;
        }>('/pisciculture/' + bassinId, authToken);
        const payload = response.data && typeof response.data === 'object'
          ? (response.data as {
            action?: 'archived' | 'deleted';
            pond?: Record<string, unknown>;
            financial_transaction?: Record<string, unknown> | null;
          })
          : null;

        if (payload?.action === 'archived' && payload.pond) {
          const mappedPond = mapFishBassins([payload.pond])[0];
          if (mappedPond) {
            setFishBassins((prev) => prev.map((item) => (item.id === bassinId ? mappedPond : item)));
          }
          addAuditLog('Pisciculture', `Clôture du bassin ${currentBassin.name}`, 'Archivage automatique pour préserver l’historique.');
        } else {
          setFishBassins((prev) => prev.filter((item) => item.id !== bassinId));
          addAuditLog('Pisciculture', `Suppression du bassin ${currentBassin.name}`, 'Suppression autorisée sans historique bloquant.');
        }

        if (payload?.financial_transaction) {
          const mappedTransaction = mapTransactions([payload.financial_transaction])[0];
          if (mappedTransaction) {
            setTransactions((prev) => [mappedTransaction, ...prev.filter((item) => item.id !== mappedTransaction.id)]);
          }
        }
      } catch (error) {
        console.error('Fish pond delete sync failed:', error);
        pushNotice('error', 'Suppression impossible', error instanceof Error ? error.message : 'Le bassin n’a pas pu être clôturé.');
      }
      return;
    }

    if (currentBassin.currentCount > 0 || currentBassin.status === 'active') {
      const remainingFish = Math.max(0, currentBassin.currentCount);
      const removalAmount = remainingFish * (currentBassin.unitCost ?? 0);
      setFishBassins((prev) => prev.map((item) => (
        item.id === bassinId ? { ...item, status: 'inactive', currentCount: 0 } : item
      )));

      if (remainingFish > 0 && removalAmount > 0) {
        const transaction: FinanceTransaction = {
          id: generateId('tx'),
          type: 'expense',
          category: 'Sortie Poissons',
          amount: removalAmount,
          date: getTodayDate(),
          description: `Suppression du bassin ${currentBassin.name} : sortie de ${remainingFish} poissons valorisée à ${removalAmount.toLocaleString('fr-FR')} ${settings.currency}`,
          sourceModule: 'Pisciculture',
          sourceElementId: bassinId,
        };
        setTransactions((prev) => [transaction, ...prev]);
      }
      addAuditLog('Pisciculture', `Clôture du bassin ${currentBassin.name}`, `Sortie comptable automatique de ${remainingFish} poissons.`);
      return;
    }

    setFishBassins((prev) => prev.filter((item) => item.id !== bassinId));
    addAuditLog('Pisciculture', `Suppression du bassin ${currentBassin.name}`, 'Suppression locale sans historique.');
  };

  const handleAddParcelle = (data: Omit<CultureParcelle, 'id'>) => {
    const parcelle: CultureParcelle = { ...data, id: generateId('parcelle') };
    setParcelles((prev) => [...prev, parcelle]);
    addAuditLog('Cultures', `Création de la parcelle ${parcelle.name}`, `${parcelle.area} ${settings.areaUnit}`);
  };

  const handleUpdateParcelle = (parcelleId: string, updates: Partial<CultureParcelle>) => {
    const currentParcelle = parcelles.find((item) => item.id === parcelleId);
    if (!currentParcelle) return;
    setParcelles((prev) => prev.map((item) => (item.id === parcelleId ? { ...item, ...updates } : item)));
    addAuditLog('Cultures', `Modification de la parcelle ${currentParcelle.name}`, JSON.stringify({ ...currentParcelle, ...updates }), JSON.stringify(currentParcelle));
  };

  const handleDeleteParcelle = (parcelleId: string) => {
    const currentParcelle = parcelles.find((item) => item.id === parcelleId);
    if (!currentParcelle) return;
    const hasCampaign = campaigns.some((item) => item.parcelleId === parcelleId && item.status !== 'cancelled');
    if (hasCampaign) {
      console.warn('Plot deletion blocked: active campaign still linked', parcelleId);
      pushNotice('warning', 'Suppression refusée', 'Une campagne culturale reste liée à cette parcelle.');
      return;
    }
    setParcelles((prev) => prev.filter((item) => item.id !== parcelleId));
    addAuditLog('Cultures', `Suppression de la parcelle ${currentParcelle.name}`);
  };

  const handleAddCampaign = async (data: Omit<Campaign, 'id' | 'expenses' | 'revenues'>) => {
    const campaignId = generateId('camp');
    const campaign: Campaign = { ...data, id: campaignId, expenses: 0, revenues: 0 };
    setCampaigns((prev) => [...prev, campaign]);
    setParcelles((prev) => prev.map((item) => (
      item.id === data.parcelleId ? { ...item, status: 'cultivated' } : item
    )));
    if (authToken && activeFarmId) {
      try {
        const parcelle = parcelles.find((item) => item.id === data.parcelleId);
        const cropResponse = await postJson('/cultures', {
          farm_id: Number(activeFarmId),
          name: data.cropType,
          variety: data.variety,
          cycle_days: 90,
          planting_date: data.startDate,
          area: parcelle?.area ?? 0,
          status: data.status,
          estimated_harvest_date: data.endDate,
          expected_yield_kg: (data.expectedYield ?? 0) * 1000,
          total_operations_cost: 0,
          total_harvest_kg: data.actualYield ? data.actualYield * 1000 : 0,
        }, authToken);
        const backendCropId = cropResponse.data && typeof cropResponse.data === 'object'
          ? String((cropResponse.data as Record<string, unknown>).id ?? '')
          : '';

        if (backendCropId && parcelle) {
          const plotResponse = await postJson('/cultures/plots', {
            farm_id: Number(activeFarmId),
            crop_id: Number(backendCropId),
            name: parcelle.name,
            area: parcelle.area,
            soil_type: parcelle.soilType,
            status: 'cultivated',
          }, authToken);
          const backendPlotId = plotResponse.data && typeof plotResponse.data === 'object'
            ? String((plotResponse.data as Record<string, unknown>).id ?? '')
            : '';

          setCampaigns((prev) => prev.map((item) => (
            item.id === campaignId
              ? { ...item, id: backendCropId, parcelleId: backendPlotId || item.parcelleId }
              : item
          )));
          if (backendPlotId) {
            setParcelles((prev) => prev.map((item) => (
              item.id === parcelle.id
                ? { ...item, id: backendPlotId, status: 'cultivated', cropId: backendCropId }
                : item
            )));
          }
        }
      } catch (error) {
        console.error('Campaign create sync failed:', error);
      }
    }
    addAuditLog('Cultures', `Création d'une campagne ${campaign.cropType}`, campaign.variety);
  };

  const handleUpdateCampaign = async (campaignId: string, updates: Partial<Campaign>) => {
    const currentCampaign = campaigns.find((item) => item.id === campaignId);
    if (!currentCampaign) return;
    setCampaigns((prev) => prev.map((item) => (item.id === campaignId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(campaignId))) {
      try {
        await patchJson('/cultures/' + campaignId, {
          ...(updates.cropType !== undefined ? { name: updates.cropType } : {}),
          ...(updates.variety !== undefined ? { variety: updates.variety } : {}),
          ...(updates.startDate !== undefined ? { planting_date: updates.startDate } : {}),
          ...(updates.endDate !== undefined ? { estimated_harvest_date: updates.endDate } : {}),
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          ...(updates.expectedYield !== undefined ? { expected_yield_kg: updates.expectedYield * 1000 } : {}),
          ...(updates.actualYield !== undefined ? { total_harvest_kg: updates.actualYield * 1000 } : {}),
          ...(updates.expenses !== undefined ? { total_operations_cost: updates.expenses } : {}),
        }, authToken);
      } catch (error) {
        console.error('Campaign update sync failed:', error);
      }
    }
    addAuditLog('Cultures', `Modification de la campagne ${currentCampaign.cropType}`, JSON.stringify({ ...currentCampaign, ...updates }), JSON.stringify(currentCampaign));
  };

const handleDeleteCampaign = async (campaignId: string) => {
    const currentCampaign = campaigns.find((item) => item.id === campaignId);
    if (!currentCampaign) return;
    if (authToken && /^\d+$/.test(String(campaignId))) {
      try {
        const response = await deleteJson<{
          action?: 'cancelled' | 'deleted';
          crop?: Record<string, unknown>;
        }>('/cultures/' + campaignId, authToken);
        const payload = response.data && typeof response.data === 'object'
          ? (response.data as {
            action?: 'cancelled' | 'deleted';
            crop?: Record<string, unknown>;
          })
          : null;

        if (payload?.action === 'cancelled' && payload.crop) {
          const mappedCampaign = mapCampaigns([payload.crop])[0];
          if (mappedCampaign) {
            setCampaigns((prev) => prev.map((item) => (item.id === campaignId ? mappedCampaign : item)));
          }
          setParcelles((prev) => prev.map((item) => (
            item.id === currentCampaign.parcelleId ? { ...item, status: 'preparing' } : item
          )));
          addAuditLog('Cultures', `Annulation de la campagne ${currentCampaign.cropType}`, 'Clôture métier sans suppression de l’historique.');
        } else {
          setCampaigns((prev) => prev.filter((item) => item.id !== campaignId));
          setParcelles((prev) => prev.map((item) => (
            item.id === currentCampaign.parcelleId ? { ...item, status: 'preparing' } : item
          )));
          addAuditLog('Cultures', `Suppression de la campagne ${currentCampaign.cropType}`);
        }
      } catch (error) {
        console.error('Campaign delete sync failed:', error);
        pushNotice('error', 'Suppression impossible', error instanceof Error ? error.message : 'La campagne n’a pas pu être supprimée.');
      }
      return;
    }

    if (currentCampaign.status === 'harvested' || currentCampaign.revenues > 0 || currentCampaign.expenses > 0) {
      setCampaigns((prev) => prev.map((item) => (
        item.id === campaignId ? { ...item, status: 'cancelled' } : item
      )));
      setParcelles((prev) => prev.map((item) => (
        item.id === currentCampaign.parcelleId ? { ...item, status: 'preparing' } : item
      )));
      addAuditLog('Cultures', `Annulation de la campagne ${currentCampaign.cropType}`, 'Clôture locale conservant les traces.');
      return;
    }

    setCampaigns((prev) => prev.filter((item) => item.id !== campaignId));
    setParcelles((prev) => prev.map((item) => (
      item.id === currentCampaign.parcelleId ? { ...item, status: 'preparing' } : item
    )));
    addAuditLog('Cultures', `Suppression de la campagne ${currentCampaign.cropType}`);
  };

  const handleAddBuilding = async (data: Omit<Building, 'id'>) => {
    const buildingId = generateId('bat');
    const building: Building = { ...data, id: buildingId };
    setBuildings((prev) => [...prev, building]);
    if (authToken && activeFarmId) {
      try {
        const response = await postJson('/infrastructures/buildings', {
          farm_id: Number(activeFarmId),
          name: data.name,
          type: data.type,
          capacity: data.capacity,
          notes: data.notes ?? '',
          status: 'active',
          state: 'good',
          assigned_use: data.type,
        }, authToken);
        const backendBuildingId = response.data && typeof response.data === 'object'
          ? String((response.data as Record<string, unknown>).id ?? '')
          : '';
        if (backendBuildingId) {
          setBuildings((prev) => prev.map((item) => (
            item.id === buildingId ? { ...item, id: backendBuildingId } : item
          )));
        }
      } catch (error) {
        console.error('Building create sync failed:', error);
      }
    }
    addAuditLog('Bâtiments', `Création du bâtiment ${building.name}`, building.type);
  };

  const handleUpdateBuilding = async (buildingId: string, updates: Partial<Building>) => {
    const currentBuilding = buildings.find((item) => item.id === buildingId);
    if (!currentBuilding) return;
    setBuildings((prev) => prev.map((item) => (item.id === buildingId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(buildingId))) {
      try {
        await patchJson('/infrastructures/buildings/' + buildingId, {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.type !== undefined ? { type: updates.type } : {}),
          ...(updates.capacity !== undefined ? { capacity: updates.capacity } : {}),
          ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
          ...(updates.type !== undefined ? { assigned_use: updates.type } : {}),
        }, authToken);
      } catch (error) {
        console.error('Building update sync failed:', error);
      }
    }
    addAuditLog('Bâtiments', `Modification du bâtiment ${currentBuilding.name}`, JSON.stringify({ ...currentBuilding, ...updates }), JSON.stringify(currentBuilding));
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    const currentBuilding = buildings.find((item) => item.id === buildingId);
    if (!currentBuilding) return;
    const hasLots = lots.some((lot) => lot.buildingId === buildingId && lot.status === 'active');
    if (hasLots) {
      console.warn('Building deletion blocked: active lots still assigned', buildingId);
      pushNotice('warning', 'Suppression refusée', 'Des lots actifs occupent encore cette infrastructure.');
      return;
    }
    setBuildings((prev) => prev.filter((item) => item.id !== buildingId));
    if (authToken && /^\d+$/.test(String(buildingId))) {
      try {
        await deleteJson('/infrastructures/buildings/' + buildingId, authToken);
      } catch (error) {
        console.error('Building delete sync failed:', error);
      }
    }
    addAuditLog('Bâtiments', `Suppression du bâtiment ${currentBuilding.name}`);
  };

  const handleAddStockSupplier = async (payload: { name: string; contactName?: string; phone?: string; email?: string }) => {
    if (!authToken) return null;
    try {
      const response = await postJson('/stocks/suppliers', {
        name: payload.name,
        contact_name: payload.contactName ?? '',
        phone: payload.phone ?? '',
        email: payload.email ?? '',
      }, authToken);

      const rawSupplier = response.data && typeof response.data === 'object'
        ? response.data as Record<string, unknown>
        : null;

      if (!rawSupplier) return null;

      const nextSupplier: SupplierOption = {
        id: String(rawSupplier.id ?? ''),
        name: String(rawSupplier.name ?? payload.name),
        contactName: String(rawSupplier.contact_name ?? payload.contactName ?? ''),
        phone: String(rawSupplier.phone ?? payload.phone ?? ''),
        email: String(rawSupplier.email ?? payload.email ?? ''),
        isActive: Boolean(rawSupplier.is_active ?? true),
      };

      setStockSuppliers((prev) => [...prev, nextSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      return nextSupplier;
    } catch (error) {
      console.error('Stock supplier create failed:', error);
      return null;
    }
  };

  const handleAddStockArticle = async (data: StockArticleInput) => {
    const articleId = generateId('art');
    const article: StockArticle = {
      ...data,
      id: articleId,
      imageUrl: data.imageFile ? URL.createObjectURL(data.imageFile) : (data.imageUrl ?? ''),
      minimumStock: data.minimumStock ?? data.minThreshold,
      storageLocation: data.storageLocation ?? data.locationId,
    };
    setArticles((prev) => [...prev, article]);
    if (authToken && activeFarmId) {
      try {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('reference', data.reference ?? '');
        formData.append('description', data.description ?? '');
        formData.append('brand', data.brand ?? '');
        formData.append('category', data.category);
        if (data.categoryId) formData.append('category_id', data.categoryId);
        if (data.supplierId) formData.append('supplier_id', data.supplierId);
        formData.append('batch_number', data.batchNumber ?? '');
        formData.append('purchase_date', data.purchaseDate ?? '');
        formData.append('manufacturing_date', data.manufacturingDate ?? '');
        formData.append('expiration_date', data.expirationDate ?? '');
        formData.append('unit', data.unit);
        formData.append('minimum_stock', String(data.minimumStock ?? data.minThreshold ?? 0));
        formData.append('maximum_stock', data.maximumStock !== undefined ? String(data.maximumStock) : '');
        formData.append('current_quantity', String(data.quantity));
        formData.append('unit_cost', String(data.unitCost ?? 0));
        formData.append('purchase_total_cost', String(data.totalPurchasePrice ?? ((data.quantity ?? 0) * (data.unitCost ?? 0))));
        formData.append('storage_location', data.storageLocation ?? data.locationId ?? '');
        formData.append('currency', data.currency ?? 'XOF');
        formData.append('notes', data.notes ?? '');
        formData.append('is_active', String(data.isActive ?? true ? 1 : 0));
        formData.append('business_module', data.businessModule ?? 'general');
        if (data.relatedType) formData.append('related_type', data.relatedType);
        if (data.relatedId) formData.append('related_id', data.relatedId);
        if (data.imageFile) formData.append('image', data.imageFile);

        const response = await postForm('/stocks', formData, authToken);
        const backendArticleId = response.data && typeof response.data === 'object'
          ? String((response.data as Record<string, unknown>).id ?? '')
          : '';
        if (backendArticleId) {
          setArticles((prev) => prev.map((item) => (
            item.id === articleId ? { ...item, id: backendArticleId } : item
          )));
        }
      } catch (error) {
        console.error('Stock article create sync failed:', error);
      }
    }
    addAuditLog('Stocks', `Création de l'article ${article.name}`, `${article.quantity} ${article.unit}`);
  };

  const handleUpdateStockArticle = async (articleId: string, updates: Partial<StockArticle>) => {
    const currentArticle = articles.find((item) => item.id === articleId);
    if (!currentArticle) return;
    setArticles((prev) => prev.map((item) => (item.id === articleId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(articleId))) {
      try {
        const formData = new FormData();
        if (updates.name !== undefined) formData.append('name', updates.name);
        if (updates.reference !== undefined) formData.append('reference', updates.reference);
        if (updates.category !== undefined) formData.append('category', updates.category);
        if (updates.categoryId !== undefined) formData.append('category_id', updates.categoryId);
        if (updates.description !== undefined) formData.append('description', updates.description);
        if (updates.brand !== undefined) formData.append('brand', updates.brand);
        if (updates.supplierId !== undefined) formData.append('supplier_id', updates.supplierId);
        if (updates.batchNumber !== undefined) formData.append('batch_number', updates.batchNumber);
        if (updates.purchaseDate !== undefined) formData.append('purchase_date', updates.purchaseDate);
        if (updates.manufacturingDate !== undefined) formData.append('manufacturing_date', updates.manufacturingDate);
        if (updates.expirationDate !== undefined) formData.append('expiration_date', updates.expirationDate);
        if (updates.quantity !== undefined) formData.append('current_quantity', String(updates.quantity));
        if (updates.unit !== undefined) formData.append('unit', updates.unit);
        if (updates.unitCost !== undefined) formData.append('unit_cost', String(updates.unitCost));
        if (updates.minThreshold !== undefined) formData.append('minimum_stock', String(updates.minThreshold));
        if (updates.maximumStock !== undefined) formData.append('maximum_stock', String(updates.maximumStock));
        if (updates.storageLocation !== undefined || updates.locationId !== undefined) {
          formData.append('storage_location', updates.storageLocation ?? updates.locationId ?? '');
        }
        if (updates.currency !== undefined) formData.append('currency', updates.currency);
        if (updates.notes !== undefined) formData.append('notes', updates.notes);
        if (updates.isActive !== undefined) formData.append('is_active', String(updates.isActive ? 1 : 0));
        if (updates.businessModule !== undefined) formData.append('business_module', updates.businessModule);
        if (updates.relatedType !== undefined) formData.append('related_type', updates.relatedType);
        if (updates.relatedId !== undefined) formData.append('related_id', updates.relatedId);
        await patchForm('/stocks/' + articleId, formData, authToken);
      } catch (error) {
        console.error('Stock article update sync failed:', error);
      }
    }
    addAuditLog('Stocks', `Modification de l'article ${currentArticle.name}`, JSON.stringify({ ...currentArticle, ...updates }), JSON.stringify(currentArticle));
  };

const handleDeleteStockArticle = async (articleId: string) => {
    const currentArticle = articles.find((item) => item.id === articleId);
    if (!currentArticle) return;
    const hasMovements = movements.some((item) => item.articleId === articleId);
    if (hasMovements) {
      console.warn('Stock article deletion blocked: stock movements exist', articleId);
      pushNotice('warning', 'Suppression refusée', 'Cet article possède déjà des mouvements et doit rester traçable.');
      return;
    }
    if (authToken && /^\d+$/.test(String(articleId))) {
      try {
        const response = await deleteJson<{ financial_transaction?: Record<string, unknown> | null }>('/stocks/' + articleId, authToken);
        const payload = response.data && typeof response.data === 'object'
          ? (response.data as { financial_transaction?: Record<string, unknown> | null })
          : null;

        if (payload?.financial_transaction) {
          const mappedTransaction = mapTransactions([payload.financial_transaction])[0];
          if (mappedTransaction) {
            setTransactions((prev) => [mappedTransaction, ...prev.filter((item) => item.id !== mappedTransaction.id)]);
          }
        }
        setArticles((prev) => prev.filter((item) => item.id !== articleId));
      } catch (error) {
        console.error('Stock article delete sync failed:', error);
        pushNotice('error', 'Suppression impossible', error instanceof Error ? error.message : 'L’article n’a pas pu être supprimé.');
      }
      return;
    }

    setArticles((prev) => prev.filter((item) => item.id !== articleId));
    {
      const remainingQuantity = currentArticle.quantity;
      const residualValue = remainingQuantity * (currentArticle.unitCost ?? 0);

      if (remainingQuantity > 0 && residualValue > 0) {
        const transaction: FinanceTransaction = {
          id: generateId('tx'),
          type: 'expense',
          category: 'Perte Stock',
          amount: residualValue,
          date: getTodayDate(),
          description: `Suppression de l'article ${currentArticle.name} : perte de ${remainingQuantity.toLocaleString('fr-FR')} ${currentArticle.unit} valorisée à ${residualValue.toLocaleString('fr-FR')} ${settings.currency}`,
          sourceModule: 'Stocks',
          sourceElementId: articleId,
        };
        setTransactions((prev) => [transaction, ...prev]);
      }
    }
    addAuditLog('Stocks', `Suppression de l'article ${currentArticle.name}`, `Sortie comptable automatique de ${currentArticle.quantity.toLocaleString('fr-FR')} ${currentArticle.unit}.`);
  };

  const handleAddTreatment = (data: Omit<SanitaryTreatment, 'id' | 'status'>) => {
    const treatment: SanitaryTreatment = { ...data, id: generateId('tr'), status: 'planned' };
    setTreatments((prev) => [...prev, treatment]);
    addAuditLog('Sanitaire', `Création du traitement ${treatment.name}`, treatment.date);
  };

  const handleUpdateTreatment = async (treatmentId: string, updates: Partial<SanitaryTreatment>) => {
    const currentTreatment = treatments.find((item) => item.id === treatmentId);
    if (!currentTreatment) return;
    setTreatments((prev) => prev.map((item) => (item.id === treatmentId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(treatmentId))) {
      try {
        await patchJson(
          '/sanitary/' + treatmentId,
          {
            ...(updates.type !== undefined ? { type: updates.type } : {}),
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.date !== undefined ? { planned_date: updates.date } : {}),
            ...(updates.dosage !== undefined ? { dosage: updates.dosage } : {}),
            ...(updates.productId !== undefined ? { product_id: updates.productId } : {}),
            ...(updates.quantityUsed !== undefined ? { quantity_used: updates.quantityUsed } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
            ...(updates.cost !== undefined ? { cost: updates.cost } : {}),
          },
          authToken
        );
      } catch (error) {
        console.error('Treatment update sync failed:', error);
      }
    }
    addAuditLog('Sanitaire', `Modification du traitement ${currentTreatment.name}`, JSON.stringify({ ...currentTreatment, ...updates }), JSON.stringify(currentTreatment));
  };

  const handleDeleteTreatment = async (treatmentId: string) => {
    const currentTreatment = treatments.find((item) => item.id === treatmentId);
    if (!currentTreatment) return;
    if (currentTreatment.status === 'completed') {
      console.warn('Treatment deletion blocked: treatment already completed', treatmentId);
      pushNotice('warning', 'Suppression refusée', 'Ce traitement a déjà été exécuté et reste lié au journal sanitaire.');
      return;
    }
    setTreatments((prev) => prev.filter((item) => item.id !== treatmentId));
    if (authToken && /^\d+$/.test(String(treatmentId))) {
      try {
        await patchJson(
          '/sanitary/' + treatmentId,
          {
            status: 'cancelled',
          },
          authToken
        );
      } catch (error) {
        console.error('Treatment cancel sync failed:', error);
      }
    }
    addAuditLog('Sanitaire', `Suppression du traitement ${currentTreatment.name}`);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) return;
    setTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(taskId))) {
      try {
        await patchJson(
          '/tasks/' + taskId,
          {
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
            ...(updates.status !== undefined ? { status: updates.status } : {}),
          },
          authToken
        );
      } catch (error) {
        console.error('Task update sync failed:', error);
      }
    }
    addAuditLog('Tâches', `Modification de la tâche ${currentTask.title}`, JSON.stringify({ ...currentTask, ...updates }), JSON.stringify(currentTask));
  };

  const handleDeleteTask = async (taskId: string) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) return;
    setTasks((prev) => prev.filter((item) => item.id !== taskId));
    if (authToken && /^\d+$/.test(String(taskId))) {
      try {
        await deleteJson('/tasks/' + taskId, authToken);
      } catch (error) {
        console.error('Task delete sync failed:', error);
      }
    }
    addAuditLog('Tâches', `Suppression de la tâche ${currentTask.title}`);
  };

  const handleUpdateTransaction = async (transactionId: string, updates: Partial<FinanceTransaction>) => {
    const currentTransaction = transactions.find((item) => item.id === transactionId);
    if (!currentTransaction) return;
    if (currentTransaction.sourceModule !== 'Finances') {
      console.warn('Transaction update blocked: source module is not Finances', transactionId);
      pushNotice('warning', 'Modification bloquée', 'Cette écriture provient d’un autre module métier et doit être corrigée depuis sa source.');
      return;
    }
    setTransactions((prev) => prev.map((item) => (item.id === transactionId ? { ...item, ...updates } : item)));
    if (authToken && /^\d+$/.test(String(transactionId))) {
      try {
        await patchJson(
          '/finances/' + transactionId,
          {
            ...(updates.type !== undefined ? { type: updates.type } : {}),
            ...(updates.category !== undefined ? { category: updates.category } : {}),
            ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.date !== undefined ? { occurred_at: new Date(updates.date).toISOString() } : {}),
          },
          authToken
        );
      } catch (error) {
        console.error('Transaction update sync failed:', error);
      }
    }
    addAuditLog('Finances', `Modification d'une écriture manuelle`, JSON.stringify({ ...currentTransaction, ...updates }), JSON.stringify(currentTransaction));
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const currentTransaction = transactions.find((item) => item.id === transactionId);
    if (!currentTransaction) return;
    if (currentTransaction.sourceModule !== 'Finances') {
      console.warn('Transaction deletion blocked: source module is not Finances', transactionId);
      pushNotice('warning', 'Suppression bloquée', 'Cette écriture est générée par un workflow métier et doit être supprimée depuis le module d’origine.');
      return;
    }
    setTransactions((prev) => prev.filter((item) => item.id !== transactionId));
    if (authToken && /^\d+$/.test(String(transactionId))) {
      deleteJson('/finances/' + transactionId, authToken).catch((error) => {
        console.error('Transaction delete sync failed:', error);
      });
    }
    addAuditLog('Finances', `Suppression d'une écriture manuelle`, currentTransaction.description);
  };

  const handleAddAlert = (data: Omit<Alert, 'id' | 'date' | 'read'>) => {
    const alertItem: Alert = {
      ...data,
      id: generateId('alt'),
      date: new Date().toISOString(),
      read: false,
    };
    setAlerts((prev) => [alertItem, ...prev]);
    addAuditLog('Alertes', `Création d'une alerte ${alertItem.title}`, alertItem.description);
  };

  const handleUpdateAlert = async (alertId: string, updates: Partial<Alert>) => {
    const currentAlert = alerts.find((item) => item.id === alertId);
    if (!currentAlert) return;
    setAlerts((prev) => prev.map((item) => (item.id === alertId ? { ...item, ...updates } : item)));
    if ((updates.read === true || updates.status === 'resolved') && authToken && /^\d+$/.test(String(alertId))) {
      try {
        await patchJson('/alerts/' + alertId + '/resolve', {}, authToken);
      } catch (error) {
        console.error('Alert update sync failed:', error);
      }
    }
    addAuditLog('Alertes', `Modification d'une alerte ${currentAlert.title}`, JSON.stringify({ ...currentAlert, ...updates }), JSON.stringify(currentAlert));
  };

  const handleDeleteAlert = (alertId: string) => {
    const currentAlert = alerts.find((item) => item.id === alertId);
    if (!currentAlert) return;
    setAlerts((prev) => prev.filter((item) => item.id !== alertId));
    addAuditLog('Alertes', `Suppression de l'alerte ${currentAlert.title}`);
  };

  // 15. Corrective action task generation based on alert
  const handleGenerateCorrectiveTask = async (alertObj: Alert) => {
    const taskId = generateId('task');
    const newTask: Task = {
      id: taskId,
      title: `Résolution : ${alertObj.title}`,
      description: `Action corrective requise pour l'alerte suivante : ${alertObj.description}`,
      sourceModule: alertObj.sourceModule || 'Général',
      sourceElementId: alertObj.sourceElementId,
      startDate: getTodayDate(),
      dueDate: getTodayDate(),
      priority: 'critical',
      status: 'todo',
      assignedTo: authUser?.name ?? settings.managerName,
      farmId: activeFarmId ?? undefined
    };

    setTasks((prev) => [newTask, ...prev]);
    handleDismissAlert(alertObj.id);

    if (authToken && activeFarmId) {
      try {
        await postJson<Task>(
          '/tasks',
          {
            farm_id: Number(activeFarmId),
            title: newTask.title,
            description: newTask.description,
            source_module: newTask.sourceModule,
            source_entity_type: 'alert',
            source_entity_id: newTask.sourceElementId ?? alertObj.id,
            start_at: toUtcIso(newTask.startDate, '08:00'),
            priority: newTask.priority,
            status: newTask.status,
            due_at: toUtcIso(newTask.dueDate, '17:00'),
            reminder_at: toUtcIso(newTask.dueDate, '06:00'),
            assigned_to: authUser?.id ? Number(authUser.id) : undefined,
          },
          authToken
        );
      } catch (error) {
        console.error('Corrective task sync failed:', error);
      }
    }

    addAuditLog(
      'Tâches',
      `Génération d'une tâche de résolution corrective`,
      `Alerte concernée: ${alertObj.title}`
    );
  };

  // 16. Reset database
  const handleResetDatabase = () => {
    clearWorkspaceCache(authUser?.id ?? getStoredAuthUser<AuthUser>()?.id);
    setBuildings([]);
    setLots([]);
    setEggProductions([]);
    setFishBassins([]);
    setParcelles([]);
    setCampaigns([]);
    setArticles([]);
    setMovements([]);
    setTransactions([]);
    setTreatments([]);
    setTasks([]);
    setAlerts([]);
    setAuditLogs([]);
    setSettings(initialSettings);
    addAuditLog('Système', 'Réinitialisation complète des données locales');
  };

  // Interconnection Quick Simulators (Dashboard bindings)

  const handleSimulateVaccination = () => {
    // 1. Mark treatment completed
    const tr = treatments.find((t) => t.status === 'planned');
    if (tr) {
      handleCompleteTreatment(tr.id);
    } else {
      // Create and complete
      const trId = generateId('tr');
      const mockTr: SanitaryTreatment = {
        id: trId,
        lotId: 'lot-1',
        type: 'vaccine',
        name: "Vaccination Newcastle Flash",
        date: getTodayDate(),
        dosage: "0.5 ml/sujet",
        productId: 'art-4', // vaccine art
        quantityUsed: 1,
        status: 'completed',
        cost: 25000
      };
      setTreatments((prev) => [...prev, mockTr]);

      // Deduct stock
      setArticles((prev) =>
        prev.map((a) => (a.id === 'art-4' ? { ...a, quantity: Math.max(a.quantity - 1, 0) } : a))
      );

      // Financial transaction
      const txId = generateId('tx');
      const newTx: FinanceTransaction = {
        id: txId,
        type: 'expense',
        category: 'Sanitaire',
        amount: 25000,
        date: getTodayDate(),
        description: `Administration médicale : Vaccination Newcastle Flash`,
        sourceModule: 'Sanitaire',
        sourceElementId: trId
      };
      setTransactions((prev) => [...prev, newTx]);

      addAuditLog(
        'Sanitaire',
        `Vaccination Newcastle Flash appliquée au lot`,
        `Traitement Newcastle Flash complété. Coût d'achat vétérinaire débité.`
      );
    }
  };

  const handleSimulateEggSale = () => {
    handleSellEggs(300, 200, "Vente de 300 œufs de table extra-frais");
  };

  const handleSimulateFishHarvest = () => {
    const activeBassin = fishBassins.find((b) => b.status === 'active');
    if (activeBassin) {
      handleHarvestFish(activeBassin.id, 1000, 1200000);
    } else {
      console.warn('Fish harvest simulation skipped: no active pond available');
      pushNotice('info', 'Simulation ignorée', 'Tous les bassins sont déjà récoltés dans les données actuelles.');
    }
  };

  // Global search filtering
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setShowSearchResults(true);
  };

  // Search filter collections
  const searchedLots = lots.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.species.toLowerCase().includes(searchQuery.toLowerCase()));
  const searchedBassins = fishBassins.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.species.toLowerCase().includes(searchQuery.toLowerCase()));
  const searchedCampaigns = campaigns.filter((c) => c.cropType.toLowerCase().includes(searchQuery.toLowerCase()) || c.variety.toLowerCase().includes(searchQuery.toLowerCase()));
  const searchedArticles = articles.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Active Alert Notifications Count
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.read), [alerts]);
  const ringingAlerts = useMemo(
    () =>
      unreadAlerts.filter((alertItem) => {
        if (!settings.alarmSoundEnabled) return false;
        if (alertItem.severity === 'critical') return settings.alarmForCriticals ?? true;
        if (alertItem.severity === 'warning') return settings.alarmForWarnings ?? true;
        return false;
      }),
    [settings.alarmForCriticals, settings.alarmForWarnings, settings.alarmSoundEnabled, unreadAlerts]
  );
  const hasRingingAlerts = ringingAlerts.length > 0;
  const activeFarmId = authUser?.farm_id ?? farms[0]?.id ?? null;
  const ownerUsers = users.filter((user) => user.role === 'owner' && String(user.farm_id ?? '') === String(activeFarmId ?? ''));
  const alarmSoundSource = ALARM_SOUND_LIBRARY[settings.alarmSoundKey ?? 'ferm-plus-default'] ?? ALARM_SOUND_LIBRARY['ferm-plus-default'];

  useEffect(() => {
    const audio = new Audio(alarmSoundSource);
    audio.loop = settings.alarmLoopEnabled ?? true;
    audio.volume = Math.min(Math.max((settings.alarmVolume ?? 100) / 100, 0), 1);
    audio.preload = 'auto';
    alarmAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      alarmAudioRef.current = null;
    };
  }, [alarmSoundSource, settings.alarmLoopEnabled, settings.alarmVolume]);

  useEffect(() => {
    const audio = alarmAudioRef.current;
    if (!audio) return;
    audio.loop = settings.alarmLoopEnabled ?? true;
    audio.volume = Math.min(Math.max((settings.alarmVolume ?? 100) / 100, 0), 1);
  }, [settings.alarmLoopEnabled, settings.alarmVolume]);

  useEffect(() => {
    if (ringingAlerts.length > previousAlarmCountRef.current) {
      setAlarmSilenced(false);
    }
    previousAlarmCountRef.current = ringingAlerts.length;
  }, [ringingAlerts.length]);

  useEffect(() => {
    const audio = alarmAudioRef.current;
    if (!audio) return;

    if (!hasRingingAlerts || alarmSilenced || !settings.alarmSoundEnabled) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          setAlarmPlaybackBlocked(false);
        })
        .catch(() => {
          setAlarmPlaybackBlocked(true);
        });
    }
  }, [alarmSilenced, hasRingingAlerts, settings.alarmSoundEnabled]);

  const handleSilenceAlarm = () => {
    const audio = alarmAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAlarmSilenced(true);
  };

  const handleResumeAlarm = async () => {
    setAlarmSilenced(false);
    const audio = alarmAudioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setAlarmPlaybackBlocked(false);
    } catch {
      setAlarmPlaybackBlocked(true);
    }
  };

  const handleTestAlarm = async (options: {
    soundEnabled: boolean;
    loopEnabled: boolean;
    volume: number;
    soundKey: string;
  }) => {
    if (!options.soundEnabled) {
      return;
    }

    const liveAudio = alarmAudioRef.current;
    if (!liveAudio) return;
    const testSource = ALARM_SOUND_LIBRARY[options.soundKey] ?? alarmSoundSource;
    const audio = options.soundKey === (settings.alarmSoundKey ?? 'ferm-plus-default')
      ? liveAudio
      : new Audio(testSource);

    const previousLoop = audio.loop;
    const previousVolume = audio.volume;
    const previousTime = audio.currentTime;
    const shouldResumeRealAlarm = hasRingingAlerts && !alarmSilenced && (settings.alarmSoundEnabled ?? true);

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = options.loopEnabled;
      audio.volume = Math.min(Math.max(options.volume / 100, 0), 1);
      await audio.play();
      setAlarmPlaybackBlocked(false);

      window.setTimeout(() => {
        if (audio !== liveAudio) {
          audio.pause();
          audio.currentTime = 0;
          return;
        }
        const currentAudio = alarmAudioRef.current;
        if (!currentAudio) return;

        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.loop = previousLoop;
        currentAudio.volume = previousVolume;

        if (shouldResumeRealAlarm) {
          void currentAudio.play().catch(() => {
            setAlarmPlaybackBlocked(true);
          });
        } else {
          currentAudio.currentTime = previousTime;
        }
      }, options.loopEnabled ? 4000 : 2500);
    } catch {
      setAlarmPlaybackBlocked(true);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">Chargement de FERM+...</span>
        </div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <AuthGate
        authMode={authMode}
        setAuthMode={setAuthMode}
        allowRegister={allowRegisterAdmin}
        authBusy={authBusy}
        authError={authError}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        registerName={registerName}
        setRegisterName={setRegisterName}
        registerEmail={registerEmail}
        setRegisterEmail={setRegisterEmail}
        registerPassword={registerPassword}
        setRegisterPassword={setRegisterPassword}
        registerConfirmPassword={registerConfirmPassword}
        setRegisterConfirmPassword={setRegisterConfirmPassword}
        onLogin={handleLogin}
        onRegister={handleRegisterAdmin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {notices.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-full max-w-sm flex-col gap-3">
          {notices.map((notice) => {
            const toneClasses = notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : notice.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : notice.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-sky-200 bg-sky-50 text-sky-900';

            const icon = notice.type === 'success'
              ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
              : notice.type === 'warning'
                ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                : notice.type === 'error'
                  ? <ShieldAlert className="h-4 w-4 text-rose-600" />
                  : <WifiOff className="h-4 w-4 text-sky-600" />;

            return (
              <div
                key={notice.id}
                className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/10 ${toneClasses}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{notice.title}</p>
                    {notice.description ? (
                      <p className="mt-1 text-xs leading-5 opacity-90">{notice.description}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Syncing overlay */}
      {false && isSyncing && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex flex-col items-center justify-center text-white space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <span className="font-bold text-sm tracking-wide">Synchronisation des données en cours...</span>
          <p className="text-xs text-slate-400">Rapprochement des modifications locales de la PWA au serveur cloud de Fermé+.</p>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside
        id="app-sidebar"
        className={`bg-slate-900 text-slate-300 w-64 border-r border-slate-800 flex flex-col shrink-0 fixed inset-y-0 left-0 z-40 transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 rounded-lg p-1.5 text-white shrink-0 shadow-md shadow-emerald-950/30">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wider">Fermé+</h1>
              <p className="text-[10px] text-slate-400 font-medium">Gestion agricole connectée</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
            { id: 'élevage', label: 'Élevage', icon: Activity },
            { id: 'pondeuses', label: 'Pondeuses', icon: Egg },
            { id: 'pisciculture', label: 'Pisciculture', icon: Fish },
            { id: 'cultures', label: 'Cultures', icon: Sprout },
            { id: 'stocks', label: 'Stocks d\'intrants', icon: Package },
            { id: 'finances', label: 'Finances / Livre', icon: DollarSign },
            { id: 'sanitaire', label: 'Suivi Sanitaire', icon: ShieldCheck },
            { id: 'bâtiments', label: 'Bâtiments / Zones', icon: Building2 },
            { id: 'agenda', label: 'Agenda / Échéances', icon: Calendar },
            { id: 'tâches', label: 'Tâches / Travaux', icon: CheckSquare },
            { id: 'alertes', label: 'Alertes', icon: AlertTriangle, badge: unreadAlerts.length },
            { id: 'rapports', label: 'Rapports d\'activité', icon: FileText },
            { id: 'audit', label: 'Journal d\'Audit', icon: ShieldAlert },
            { id: 'paramètres', label: 'Paramètres', icon: Settings }
          ].map((navItem) => {
            const IconComponent = navItem.icon;
            const isActive = currentView === navItem.id;

            return (
              <button
                key={navItem.id}
                onClick={() => {
                  setCurrentView(navItem.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20 font-bold scale-[1.01]'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <IconComponent className="w-4 h-4" />
                  {navItem.label}
                </span>
                {navItem.badge !== undefined && navItem.badge > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {navItem.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile details bottom of sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/15 text-emerald-400 p-2 rounded-full font-bold w-8 h-8 flex items-center justify-center text-xs shrink-0">
              {role === 'admin' ? 'AD' : 'PR'}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block truncate">
                {role === 'admin' ? 'Administrateur' : 'Propriétaire'}
              </span>
              <p className="text-[10px] text-slate-500 truncate">{settings.contactEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 h-16 shrink-0 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-800">
              <Menu className="w-6 h-6" />
            </button>

            {/* Farm Title or Logo */}
            <div className="hidden sm:flex items-center gap-2">
              <img
                src="/src/assets/images/ferm_plus_logo_1783801064674.jpg"
                alt="Fermé+ Logo"
                className="w-8 h-8 rounded-lg object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if logo not loaded
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-extrabold text-sm text-slate-800 tracking-wide">{settings.name}</span>
            </div>

            {/* Global Search form */}
            <form onSubmit={handleSearch} className="relative max-w-xs w-full ml-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-input"
                type="text"
                placeholder="Recherche globale..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    setShowSearchResults(true);
                  } else {
                    setShowSearchResults(false);
                  }
                }}
                className="w-full text-xs pl-9 pr-4 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all"
              />

              {/* Search dropdown results */}
              {showSearchResults && searchQuery && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl p-3 space-y-3 max-h-[300px] overflow-y-auto text-xs z-50">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                    <span>Résultats de recherche</span>
                    <button type="button" onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-slate-600">Fermer</button>
                  </div>

                  {/* Lots results */}
                  {searchedLots.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-emerald-600 font-bold uppercase">Lots</div>
                      {searchedLots.map((l) => (
                        <div key={l.id} className="p-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => { setCurrentView('élevage'); setShowSearchResults(false); }}>
                          {l.name} ({l.species})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bassins results */}
                  {searchedBassins.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-sky-600 font-bold uppercase">Bassins</div>
                      {searchedBassins.map((b) => (
                        <div key={b.id} className="p-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => { setCurrentView('pisciculture'); setShowSearchResults(false); }}>
                          {b.name} ({b.species})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Crops results */}
                  {searchedCampaigns.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-lime-600 font-bold uppercase">Cultures</div>
                      {searchedCampaigns.map((c) => (
                        <div key={c.id} className="p-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => { setCurrentView('cultures'); setShowSearchResults(false); }}>
                          Culture de {c.cropType} ({c.variety})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Articles results */}
                  {searchedArticles.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-amber-600 font-bold uppercase">Articles de Stock</div>
                      {searchedArticles.map((a) => (
                        <div key={a.id} className="p-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => { setCurrentView('stocks'); setShowSearchResults(false); }}>
                          {a.name} ({a.quantity} {a.unit})
                        </div>
                      ))}
                    </div>
                  )}

                  {searchedLots.length === 0 && searchedBassins.length === 0 && searchedCampaigns.length === 0 && searchedArticles.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">Aucun élément trouvé pour "{searchQuery}"</div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right Header Panel */}
          <div className="flex items-center gap-4">
            {/* Offline indicator badge */}
            <button
              onClick={handleToggleOffline}
              className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border ${
                !isOffline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50'
                  : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50'
              }`}
              title="Cliquez pour basculer en ligne / hors ligne"
            >
              {!isOffline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="hidden sm:inline">En Ligne (Sync OK)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Hors ligne</span>
                </>
              )}
            </button>

            {/* Quick user role selector dropdown */}
            <div className="flex items-center gap-2 border border-slate-100 p-1.5 rounded-xl text-xs">
              <Users className="w-4 h-4 text-slate-400" />
              <div className="leading-tight">
                <div className="font-bold text-slate-700">{authUser?.name ?? settings.managerName}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {role === 'admin' ? 'Admin' : 'Propriétaire'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>

            {hasRingingAlerts && (
              <button
                type="button"
                onClick={alarmSilenced || alarmPlaybackBlocked ? handleResumeAlarm : handleSilenceAlarm}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition ${
                  alarmSilenced || alarmPlaybackBlocked
                    ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
                title={alarmSilenced || alarmPlaybackBlocked ? 'Relancer l’alarme' : 'Couper l’alarme'}
              >
                {alarmSilenced || alarmPlaybackBlocked ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {alarmSilenced ? 'Relancer alarme' : alarmPlaybackBlocked ? 'Activer alarme' : 'Couper alarme'}
              </button>
            )}

            {/* Alerts Bell notification center */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAlertDropdown(!showAlertDropdown);
                  setShowAlertDropdown(!showAlertDropdown); // trigger re-render
                }}
                className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full relative transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-amber-500 border border-white"></span>
                )}
              </button>

              {showAlertDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 z-50 text-xs space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-800">Alertes Récentes ({unreadAlerts.length})</span>
                    <button
                      onClick={() => {
                        setCurrentView('alertes');
                        setShowAlertDropdown(false);
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Voir tout
                    </button>
                  </div>

                  {hasRingingAlerts && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-800">
                      {alarmPlaybackBlocked
                        ? "Le navigateur a bloqué l'alarme automatique. Utilisez le bouton Activer alarme."
                        : alarmSilenced
                          ? "L'alarme sonore est coupée pour le moment."
                          : "Une alarme sonore tourne en boucle tant qu'une alerte critique ou importante reste non lue."}
                    </div>
                  )}

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {unreadAlerts.length === 0 ? (
                      <div className="text-center py-4 text-slate-400">Aucune alerte non lue.</div>
                    ) : (
                      unreadAlerts.slice(0, 3).map((a) => (
                        <div key={a.id} className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                          <span className="font-semibold text-slate-800 block">{a.title}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{a.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Core Screen View Port */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Suspense
              fallback={
                <div className="flex min-h-[320px] items-center justify-center">
                  <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <LoaderCircle className="h-5 w-5 animate-spin text-emerald-600" />
                      Chargement du module...
                    </div>
                  </div>
                </div>
              }
            >
            {currentView === 'dashboard' && (
              <DashboardView
                lots={lots}
                eggProductions={eggProductions}
                eggSales={eggSales}
                feedings={animalFeedings}
                fishBassins={fishBassins}
                parcelles={parcelles}
                articles={articles}
                transactions={transactions}
                treatments={treatments}
                tasks={tasks}
                alerts={alerts}
                currency={settings.currency}
                areaUnit={settings.areaUnit}
                onNavigate={(v) => setCurrentView(v)}
              />
            )}


            {currentView === 'élevage' && (
              <ElevageView
                role={role}
                lots={lots}
                buildings={buildings}
                articles={articles}
                feedings={animalFeedings}
                feedPlans={animalFeedPlans}
                weighings={animalWeighings}
                eggSales={eggSales}
                treatments={treatments}
                currency={settings.currency}
                onAddLot={handleAddLot}
                onCreateFeedPlan={handleCreateFeedPlan}
                onRecordFeeding={handleRecordFeeding}
                onRecordWeighing={handleRecordWeighing}
                onReportMortality={handleReportMortality}
                onUpdateLot={handleUpdateLot}
                onDeleteLot={handleDeleteLot}
              />
            )}

            {currentView === 'pondeuses' && (
              <PondeusesView
                role={role}
                productions={eggProductions}
                lots={lots}
                currency={settings.currency}
                onRecordPonte={handleRecordPonte}
                onSellEggs={handleSellEggs}
                onUpdateEggProduction={handleUpdateEggProduction}
                onDeleteEggProduction={handleDeleteEggProduction}
              />
            )}

            {currentView === 'pisciculture' && (
              <PiscicultureView
                role={role}
                bassins={fishBassins}
                articles={articles}
                currency={settings.currency}
                onFeedFish={handleFeedFish}
                onHarvestFish={handleHarvestFish}
                onAddBassin={handleAddBassin}
                onUpdateBassin={handleUpdateBassin}
                onDeleteBassin={handleDeleteBassin}
              />
            )}

            {currentView === 'cultures' && (
              <CulturesView
                role={role}
                parcelles={parcelles}
                campaigns={campaigns}
                currency={settings.currency}
                onHarvestCampaign={handleHarvestCampaign}
                onAddParcelle={handleAddParcelle}
                onUpdateParcelle={handleUpdateParcelle}
                onDeleteParcelle={handleDeleteParcelle}
                onAddCampaign={handleAddCampaign}
                onUpdateCampaign={handleUpdateCampaign}
                onDeleteCampaign={handleDeleteCampaign}
              />
            )}

            {currentView === 'stocks' && (
              <StocksView
                role={role}
                articles={articles}
                movements={movements}
                currency={settings.currency}
                categories={stockCategories}
                suppliers={stockSuppliers}
                relationOptions={stockRelationOptions}
                unitOptions={stockUnits}
                storageLocations={stockStorageLocations}
                lots={lots}
                bassins={fishBassins}
                parcelles={parcelles}
                campaigns={campaigns}
                buildings={buildings}
                onAdjustStock={handleAdjustStock}
                onGeneratePurchaseTask={handleGeneratePurchaseTask}
                onAddSupplier={handleAddStockSupplier}
                onAddStockArticle={handleAddStockArticle}
                onUpdateStockArticle={handleUpdateStockArticle}
                onDeleteStockArticle={handleDeleteStockArticle}
              />
            )}

            {currentView === 'finances' && (
              <FinancesView
                role={role}
                transactions={transactions}
                currency={settings.currency}
                onAddManualTransaction={handleAddManualTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {currentView === 'sanitaire' && (
              <SanitaireView
                role={role}
                treatments={treatments}
                lots={lots}
                articles={articles}
                currency={settings.currency}
                onCompleteTreatment={handleCompleteTreatment}
                onAddTreatment={handleAddTreatment}
                onUpdateTreatment={handleUpdateTreatment}
                onDeleteTreatment={handleDeleteTreatment}
              />
            )}

            {currentView === 'bâtiments' && (
              <BatimentsView
                role={role}
                buildings={buildings}
                lots={lots}
                onAddBuilding={handleAddBuilding}
                onUpdateBuilding={handleUpdateBuilding}
                onDeleteBuilding={handleDeleteBuilding}
              />
            )}

            {currentView === 'agenda' && (
              <AgendaView
                role={role}
                tasks={tasks}
                onToggleTaskStatus={handleToggleTaskStatus}
              />
            )}

            {currentView === 'tâches' && (
              <TasksView
                role={role}
                tasks={tasks}
                onAddTask={handleAddTask}
                onToggleTaskStatus={handleToggleTaskStatus}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {currentView === 'alertes' && (
              <AlertsView
                role={role}
                alerts={alerts}
                hasRingingAlerts={hasRingingAlerts}
                alarmSilenced={alarmSilenced}
                alarmPlaybackBlocked={alarmPlaybackBlocked}
                onSilenceAlarm={handleSilenceAlarm}
                onResumeAlarm={handleResumeAlarm}
                onDismissAlert={handleDismissAlert}
                onGenerateCorrectiveTask={handleGenerateCorrectiveTask}
                onAddAlert={handleAddAlert}
                onUpdateAlert={handleUpdateAlert}
                onDeleteAlert={handleDeleteAlert}
              />
            )}

            {currentView === 'rapports' && (
              <ReportsView
                role={role}
                lots={lots}
                eggProductions={eggProductions}
                eggSales={eggSales}
                feedings={animalFeedings}
                fishBassins={fishBassins}
                parcelles={parcelles}
                campaigns={campaigns}
                articles={articles}
                movements={movements}
                transactions={transactions}
                treatments={treatments}
                currency={settings.currency}
                areaUnit={settings.areaUnit}
              />
            )}

            {currentView === 'audit' && (
              <AuditView auditLogs={auditLogs} />
            )}

            {currentView === 'paramètres' && (
              <SettingsView
                role={role}
                settings={settings}
                owners={ownerUsers}
                onUpdateSettings={handleUpdateSettings}
                onTestAlarm={handleTestAlarm}
                onChangePassword={handleChangePassword}
                onCreateOwner={handleCreateOwner}
              />
            )}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
