/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  FishBassin,
  CultureParcelle,
  Campaign,
  StockArticle,
  StockMovement,
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

// Import Modular Views
import DashboardView from './components/DashboardView';
import ElevageView from './components/ElevageView';
import PondeusesView from './components/PondeusesView';
import PiscicultureView from './components/PiscicultureView';
import CulturesView from './components/CulturesView';
import StocksView from './components/StocksView';
import FinancesView from './components/FinancesView';
import SanitaireView from './components/SanitaireView';
import BatimentsView from './components/BatimentsView';
import AgendaView from './components/AgendaView';
import TasksView from './components/TasksView';
import AlertsView from './components/AlertsView';
import ReportsView from './components/ReportsView';
import AuditView from './components/AuditView';
import SettingsView from './components/SettingsView';
import AuthGate from './components/AuthGate';
import {
  getBootstrapStatus,
  changePassword,
  clearStoredAuthToken,
  getStoredAuthToken,
  getStoredAuthUser,
  loadWorkspaceSnapshot,
  login,
  logout,
  patchJson,
  postJson,
  registerAdmin,
  setStoredAuthToken,
  setStoredAuthUser,
  putJson,
  deleteJson,
  type AuthUser
} from './services/fermApi';
import {
  mapAlerts,
  mapAuditLogs,
  mapArticles,
  mapAuthUser,
  mapBuildings,
  mapCampaigns,
  mapEggProductions,
  mapFishBassins,
  mapLots,
  mapMovements,
  mapParcelles,
  mapSettings,
  mapTasks,
  mapTransactions,
  mapTreatments
} from './services/fermMappers';

const ALARM_SOUND_LIBRARY: Record<string, string> = {
  'ferm-plus-default': '/audio/ferm-plus-alert-loop.m4a',
};

const WORKSPACE_CACHE_PREFIX = 'fermplus_workspace_cache';

type WorkspaceLocalCache = {
  farms: any[];
  users: AuthUser[];
  settings: FarmSettings;
  buildings: Building[];
  lots: Lot[];
  eggProductions: EggProduction[];
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
  const [allowRegisterAdmin, setAllowRegisterAdmin] = useState<boolean>(false);
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
  const [fishBassins, setFishBassins] = useState<FishBassin[]>([]);
  const [parcelles, setParcelles] = useState<CultureParcelle[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [articles, setArticles] = useState<StockArticle[]>([]);
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
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const previousAlarmCountRef = useRef<number>(0);

  // Help functions for quick uuid/dates
  const generateId = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 100000)}`;
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getSyncStatus = (): SyncStatus => (isOffline ? 'pending' : 'synced');

  const resetToLogin = (message: string) => {
    clearStoredAuthToken();
    setAuthTokenState('');
    setAuthUser(null);
    setRole('admin');
    setAuthMode('login');
    setAuthError(message);
  };

  const hydrateWorkspace = async (token = authToken) => {
    if (!token) {
      setAuthReady(true);
      return;
    }

    try {
      const snapshot = await loadWorkspaceSnapshot(token);
      const storedUser = getStoredAuthUser<AuthUser>();
      const apiUser = storedUser ?? authUser;
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
      const pondsData = getData(snapshot.ponds);
      const culturesData = getData(snapshot.cultures);
      const infraData = getData(snapshot.infrastructures);
      const reportsData = getData(snapshot.reports);
      const syncData = getData(snapshot.sync);

      const pondObject = (pondsData && typeof pondsData === 'object' && !Array.isArray(pondsData)) ? (pondsData as Record<string, unknown>) : {};
      const culturesObject = (culturesData && typeof culturesData === 'object' && !Array.isArray(culturesData)) ? (culturesData as Record<string, unknown>) : {};
      const stocksObject = (stocksData && typeof stocksData === 'object' && !Array.isArray(stocksData)) ? (stocksData as Record<string, unknown>) : {};
      const infraObject = (infraData && typeof infraData === 'object' && !Array.isArray(infraData)) ? (infraData as Record<string, unknown>) : {};

      const farmSetting = mapSettings(settingsData ?? initialSettings);
      const apiUsers = (usersData as unknown[] ?? [])
        .map((item) => mapAuthUser(item))
        .filter((item): item is AuthUser => Boolean(item));

      const mappedLots = mapLots(((pondObject.batches ?? []) as unknown[]) ?? []);
      const mappedEggProductions = mapEggProductions(((pondObject.productions ?? []) as unknown[]) ?? []);
      const mappedBassins = mapFishBassins(((pondObject.ponds ?? pondObject.data ?? []) as unknown[]) ?? []);
      const mappedParcelles = mapParcelles(((culturesObject.plots ?? culturesObject.data ?? []) as unknown[]) ?? []);
      const mappedCampaigns = mapCampaigns(((culturesObject.crops ?? culturesObject.data ?? []) as unknown[]) ?? []);
      const mappedBuildings = mapBuildings(((infraObject.buildings ?? []) as unknown[]) ?? []);
      const mappedArticles = mapArticles(((stocksObject.items ?? []) as unknown[]) ?? []);
      const mappedMovements = mapMovements(((stocksObject.movements ?? []) as unknown[]) ?? []);
      const mappedTransactions = mapTransactions((financesData as unknown[]) ?? []);
      const mappedTreatments = mapTreatments((sanitaryData as unknown[]) ?? []);
      const mappedTasks = mapTasks((tasksData as unknown[]) ?? [], apiUsers);
      const mappedAlerts = mapAlerts((alertsData as unknown[]) ?? []);
      const mappedAuditLogs = mapAuditLogs((auditData as unknown[]) ?? []);
      const cacheUserId = (apiUser ?? storedUser)?.id;
      const localCache = readWorkspaceCache(cacheUserId);

      setFarms(localCache?.farms ?? ((farmsData as unknown[]) ?? []));
      setUsers(localCache?.users ?? apiUsers);
      setSettings(localCache?.settings ?? farmSetting);
      setBuildings(localCache?.buildings ?? mappedBuildings);
      setLots(localCache?.lots ?? mappedLots);
      setEggProductions(localCache?.eggProductions ?? mappedEggProductions);
      setFishBassins(localCache?.fishBassins ?? mappedBassins);
      setParcelles(localCache?.parcelles ?? mappedParcelles);
      setCampaigns(localCache?.campaigns ?? mappedCampaigns);
      setArticles(localCache?.articles ?? mappedArticles);
      setMovements(localCache?.movements ?? mappedMovements);
      setTransactions(localCache?.transactions ?? mappedTransactions);
      setTreatments(localCache?.treatments ?? mappedTreatments);
      setTasks(localCache?.tasks ?? mappedTasks);
      setAlerts(localCache?.alerts ?? mappedAlerts);
      setAuditLogs(localCache?.auditLogs ?? mappedAuditLogs);

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

      if (localCache) {
        setFarms(localCache.farms);
        setUsers(localCache.users);
        setSettings(localCache.settings);
        setBuildings(localCache.buildings);
        setLots(localCache.lots);
        setEggProductions(localCache.eggProductions);
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
        setAuthError("Le serveur n'a pas répondu, mais vos dernières données locales ont été restaurées.");
        return;
      }
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les données de la ferme depuis le serveur.'
      );
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const response = await getBootstrapStatus();
        setAllowRegisterAdmin(!(response.data?.has_admin ?? response.has_admin ?? false));
      } catch {
        setAllowRegisterAdmin(false);
      }

      const token = getStoredAuthToken();
      const storedUser = getStoredAuthUser<AuthUser>();

      if (token) {
        setAuthTokenState(token);
        if (storedUser) {
          setAuthUser(storedUser);
          setRole(storedUser.role);
        }
        await hydrateWorkspace(token);
      } else {
        setAuthReady(true);
      }
    };

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    authUser?.id,
    buildings,
    campaigns,
    eggProductions,
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
      if (!user || !token) {
        throw new Error('Réponse d’authentification invalide.');
      }
      handleAuthSuccess(token, user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegisterAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allowRegisterAdmin) {
      setAuthMode('login');
      setAuthError('L’inscription administrateur est déjà verrouillée pour cette plateforme.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas.');
      return;
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
      if (user && token) {
        handleAuthSuccess(token, user);
      } else {
        setAuthMode('login');
        setAuthError('Compte administrateur créé. Vous pouvez maintenant vous connecter.');
      }
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
  const handleToggleOffline = () => {
    if (isOffline) {
      // Re-connecting: sync pending local actions
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setIsOffline(false);

        // Update all pending items in audit logs
        setAuditLogs((prev) =>
          prev.map((log) => (log.syncStatus === 'pending' ? { ...log, syncStatus: 'synced' } : log))
        );

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
    } else {
      setIsOffline(true);
      alert("La PWA Fermé+ est maintenant hors ligne. Les opérations que vous réaliserez seront stockées localement en attente de synchronisation.");
    }
  };

  // Moteur d'Interconnexion: Core Operations

  // 1. Create a Livestock Lot
  const handleAddLot = async (newLotData: Omit<Lot, 'id' | 'currentCount' | 'mortalityCount'>) => {
    const lotId = generateId('lot');
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
          },
          authToken
        );
        const backendId = response.data && typeof response.data === 'object' ? String((response.data as Record<string, unknown>).id ?? '') : '';
        if (backendId) {
          setLots((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, id: backendId } : lot)));
        }
      } catch (error) {
        console.error('Lot sync failed:', error);
      }
    }

    // Financial debit
    const cost = newLotData.initialCount * 450; // estimate cost
    const txId = generateId('tx');
    const newTx: FinanceTransaction = {
      id: txId,
      type: 'expense',
      category: 'Achat Animaux',
      amount: cost,
      date: newLotData.entryDate,
      description: `Achat initial de ${newLotData.initialCount} poussins/bêtes pour le lot ${newLotData.name}`,
      sourceModule: 'Élevage',
      sourceElementId: lotId
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
          putJson(
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

  // 4. Sell Eggs
  const handleSellEggs = async (count: number, unitPrice: number, description: string) => {
    const latestProd = eggProductions[eggProductions.length - 1];
    const prevStock = latestProd ? latestProd.stockCount : 0;
    const newStock = Math.max(prevStock - count, 0);

    // Update egg productions stock
    const prodId = generateId('egg');
    const newProd: EggProduction = {
      id: prodId,
      date: getTodayDate(),
      lotId: 'lot-2', // Layout laying lot
      collectedCount: 0,
      compliantCount: 0,
      brokenCount: 0,
      lossesCount: 0,
      soldCount: count,
      stockCount: newStock
    };
    setEggProductions((prev) => [...prev, newProd]);

    // Financial credit
    const revenue = count * unitPrice;
    const txId = generateId('tx');
    const newTx: FinanceTransaction = {
      id: txId,
      type: 'income',
      category: 'Vente Oeufs',
      amount: revenue,
      date: getTodayDate(),
      description: `${description} (${count} œufs à ${unitPrice} ${settings.currency}/u)`,
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
        await postJson(
          '/pondeuses/sales',
          {
            farm_id: Number(activeFarmId),
            layer_batch_id: backendLayerBatchId,
            sale_date: getTodayDate(),
            customer_name: description,
            trays_sold: Math.max(Math.ceil(count / 30), 1),
            eggs_sold: count,
            unit_price: unitPrice,
            amount_paid: revenue,
            remaining_due: 0,
            payment_method: 'cash',
            notes: description,
          },
          authToken
        );
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

  // 5. Feed Fish (distribute pellets from stock)
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
        await putJson(
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
    alert("Nourriture distribuée avec succès ! Le stock d'intrants a été déduit en temps réel.");
  };

  // 6. Harvest & Sell Fish
  const handleHarvestFish = async (bassinId: string, fishCount: number, revenueAmount: number) => {
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
      description: `Vente récolte aquacole : ${fishCount} poissons Tilapias/Silures vendus`,
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
          await putJson(
            `/pisciculture/${backendBassinId}`,
            {
              current_estimated_count: 0,
              status: 'inactive',
              harvest_date: getTodayDate(),
            },
            authToken
          );
          await postJson(
            '/pisciculture/harvests',
            {
            farm_id: Number(activeFarmId),
            fish_pond_id: backendBassinId,
            harvest_date: getTodayDate(),
            total_weight_kg: fishCount,
            losses_kg: 0,
            destination: 'Vente directe',
            notes: `Récolte enregistrée: ${fishCount} poissons`,
          },
          authToken
        );
        await postJson(
          '/pisciculture/sales',
          {
            farm_id: Number(activeFarmId),
            fish_pond_id: backendBassinId,
            sale_date: getTodayDate(),
            customer_name: 'Vente bassin',
            kilograms_sold: fishCount,
            unit_price: fishCount > 0 ? revenueAmount / fishCount : 0,
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
      `Poissons vendus: ${fishCount}, Revenu: ${revenueAmount} ${settings.currency}`
    );
    alert("Bassin récolté et revenus de vente crédités dans les finances !");
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
          await putJson(
            `/cultures/${backendCropId}`,
            {
              status: 'harvested',
              total_harvest_kg: actualYieldTons * 1000,
              estimated_harvest_date: getTodayDate(),
              total_operations_cost: campaign.expenses,
            },
            authToken
          );
          await postJson(
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
          if (salesRevenue > 0) {
            await postJson(
              '/cultures/sales',
              {
                farm_id: Number(activeFarmId),
                crop_id: backendCropId,
                crop_harvest_id: null,
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
    alert("Parcelle récoltée et remise en jachère. Les revenus agricoles ont été ajoutés !");
  };

  // 8. Manual Stock Adjustments
  const handleAdjustStock = async (articleId: string, quantityToAdd: number, reason: string) => {
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
        const currentQuantity = articles.find((art) => art.id === articleId)?.quantity ?? 0;
        const nextQuantity = Math.max(currentQuantity + quantityToAdd, 0);
        await putJson(
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
            type: quantityToAdd > 0 ? 'in' : 'out',
            quantity: Math.abs(quantityToAdd),
            unit_cost: quantityToAdd > 0 ? 800 : null,
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
      const cost = quantityToAdd * 800; // estimated unit price
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
    alert("Stock ajusté avec succès !");
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
            priority: newTask.priority,
            status: newTask.status,
            due_at: new Date(`${newTask.dueDate}T12:00:00Z`).toISOString(),
            reminder_at: new Date(`${newTask.dueDate}T06:00:00Z`).toISOString(),
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
    alert(`Tâche d'achat créée dans l'agenda pour réapprovisionner l'article ${article.name} !`);
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
        await postJson(
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
      } catch (error) {
        console.error('Manual transaction sync failed:', error);
      }
    }

    addAuditLog(
      'Finances',
      `Enregistrement d'un mouvement comptable manuel`,
      `${tx.type === 'income' ? 'Revenu' : 'Dépense'} : ${tx.amount} ${settings.currency} (${tx.description})`
    );
    alert("Mouvement comptable ajouté !");
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

    alert("Opération sanitaire appliquée ! Les stocks médicaux ont été déduits et le coût a été enregistré.");
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
            priority: newTask.priority,
            status: newTask.status,
            due_at: new Date(`${newTask.dueDate}T12:00:00Z`).toISOString(),
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
    alert("Tâche créée et ajoutée à l'agenda !");
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
  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  const handleUpdateLot = (lotId: string, updates: Partial<Lot>) => {
    const currentLot = lots.find((lot) => lot.id === lotId);
    if (!currentLot) return;
    setLots((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, ...updates } : lot)));
    addAuditLog(
      'Élevage',
      `Modification du lot ${currentLot.name}`,
      JSON.stringify({ ...currentLot, ...updates }),
      JSON.stringify(currentLot)
    );
  };

  const handleDeleteLot = (lotId: string) => {
    const currentLot = lots.find((lot) => lot.id === lotId);
    if (!currentLot) return;
    const isLinked = eggProductions.some((item) => item.lotId === lotId) || treatments.some((item) => item.lotId === lotId);
    if (isLinked) {
      setLots((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, status: 'archived' } : lot)));
      addAuditLog('Élevage', `Archivage du lot ${currentLot.name}`, 'Archivage automatique car le lot est lié à la traçabilité.');
      alert("Ce lot reste lié à la production ou au sanitaire. Il a été archivé au lieu d'être supprimé.");
      return;
    }
    setLots((prev) => prev.filter((lot) => lot.id !== lotId));
    addAuditLog('Élevage', `Suppression du lot ${currentLot.name}`);
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

  const handleAddBassin = (data: Omit<FishBassin, 'id' | 'currentCount' | 'mortalityCount'>) => {
    const bassin: FishBassin = {
      ...data,
      id: generateId('bassin'),
      currentCount: data.initialCount,
      mortalityCount: 0,
    };
    setFishBassins((prev) => [...prev, bassin]);
    addAuditLog('Pisciculture', `Création du bassin ${bassin.name}`, `${bassin.initialCount} alevins`);
  };

  const handleUpdateBassin = (bassinId: string, updates: Partial<FishBassin>) => {
    const currentBassin = fishBassins.find((item) => item.id === bassinId);
    if (!currentBassin) return;
    setFishBassins((prev) => prev.map((item) => (item.id === bassinId ? { ...item, ...updates } : item)));
    addAuditLog('Pisciculture', `Modification du bassin ${currentBassin.name}`, JSON.stringify({ ...currentBassin, ...updates }), JSON.stringify(currentBassin));
  };

  const handleDeleteBassin = (bassinId: string) => {
    const currentBassin = fishBassins.find((item) => item.id === bassinId);
    if (!currentBassin) return;
    if (currentBassin.currentCount > 0 && currentBassin.status === 'active') {
      alert("Suppression impossible: le bassin est encore en production. Récoltez ou désactivez-le d'abord.");
      return;
    }
    setFishBassins((prev) => prev.filter((item) => item.id !== bassinId));
    addAuditLog('Pisciculture', `Suppression du bassin ${currentBassin.name}`);
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
      alert("Suppression impossible: une campagne culturale est encore liée à cette parcelle.");
      return;
    }
    setParcelles((prev) => prev.filter((item) => item.id !== parcelleId));
    addAuditLog('Cultures', `Suppression de la parcelle ${currentParcelle.name}`);
  };

  const handleAddCampaign = (data: Omit<Campaign, 'id' | 'expenses' | 'revenues'>) => {
    const campaign: Campaign = { ...data, id: generateId('camp'), expenses: 0, revenues: 0 };
    setCampaigns((prev) => [...prev, campaign]);
    addAuditLog('Cultures', `Création d'une campagne ${campaign.cropType}`, campaign.variety);
  };

  const handleUpdateCampaign = (campaignId: string, updates: Partial<Campaign>) => {
    const currentCampaign = campaigns.find((item) => item.id === campaignId);
    if (!currentCampaign) return;
    setCampaigns((prev) => prev.map((item) => (item.id === campaignId ? { ...item, ...updates } : item)));
    addAuditLog('Cultures', `Modification de la campagne ${currentCampaign.cropType}`, JSON.stringify({ ...currentCampaign, ...updates }), JSON.stringify(currentCampaign));
  };

  const handleDeleteCampaign = (campaignId: string) => {
    const currentCampaign = campaigns.find((item) => item.id === campaignId);
    if (!currentCampaign) return;
    if (currentCampaign.status === 'harvested' || currentCampaign.revenues > 0) {
      alert("Suppression impossible: cette campagne a déjà généré une récolte ou un revenu.");
      return;
    }
    setCampaigns((prev) => prev.filter((item) => item.id !== campaignId));
    addAuditLog('Cultures', `Suppression de la campagne ${currentCampaign.cropType}`);
  };

  const handleAddBuilding = (data: Omit<Building, 'id'>) => {
    const building: Building = { ...data, id: generateId('bat') };
    setBuildings((prev) => [...prev, building]);
    addAuditLog('Bâtiments', `Création du bâtiment ${building.name}`, building.type);
  };

  const handleUpdateBuilding = (buildingId: string, updates: Partial<Building>) => {
    const currentBuilding = buildings.find((item) => item.id === buildingId);
    if (!currentBuilding) return;
    setBuildings((prev) => prev.map((item) => (item.id === buildingId ? { ...item, ...updates } : item)));
    addAuditLog('Bâtiments', `Modification du bâtiment ${currentBuilding.name}`, JSON.stringify({ ...currentBuilding, ...updates }), JSON.stringify(currentBuilding));
  };

  const handleDeleteBuilding = (buildingId: string) => {
    const currentBuilding = buildings.find((item) => item.id === buildingId);
    if (!currentBuilding) return;
    const hasLots = lots.some((lot) => lot.buildingId === buildingId && lot.status === 'active');
    if (hasLots) {
      alert("Suppression impossible: des lots actifs occupent encore cette infrastructure.");
      return;
    }
    setBuildings((prev) => prev.filter((item) => item.id !== buildingId));
    addAuditLog('Bâtiments', `Suppression du bâtiment ${currentBuilding.name}`);
  };

  const handleAddStockArticle = (data: Omit<StockArticle, 'id'>) => {
    const article: StockArticle = { ...data, id: generateId('art') };
    setArticles((prev) => [...prev, article]);
    addAuditLog('Stocks', `Création de l'article ${article.name}`, `${article.quantity} ${article.unit}`);
  };

  const handleUpdateStockArticle = (articleId: string, updates: Partial<StockArticle>) => {
    const currentArticle = articles.find((item) => item.id === articleId);
    if (!currentArticle) return;
    setArticles((prev) => prev.map((item) => (item.id === articleId ? { ...item, ...updates } : item)));
    addAuditLog('Stocks', `Modification de l'article ${currentArticle.name}`, JSON.stringify({ ...currentArticle, ...updates }), JSON.stringify(currentArticle));
  };

  const handleDeleteStockArticle = (articleId: string) => {
    const currentArticle = articles.find((item) => item.id === articleId);
    if (!currentArticle) return;
    const hasMovements = movements.some((item) => item.articleId === articleId);
    if (hasMovements) {
      alert("Suppression impossible: cet article possède déjà des mouvements de stock et doit rester traçable.");
      return;
    }
    setArticles((prev) => prev.filter((item) => item.id !== articleId));
    addAuditLog('Stocks', `Suppression de l'article ${currentArticle.name}`);
  };

  const handleAddTreatment = (data: Omit<SanitaryTreatment, 'id' | 'status'>) => {
    const treatment: SanitaryTreatment = { ...data, id: generateId('tr'), status: 'planned' };
    setTreatments((prev) => [...prev, treatment]);
    addAuditLog('Sanitaire', `Création du traitement ${treatment.name}`, treatment.date);
  };

  const handleUpdateTreatment = (treatmentId: string, updates: Partial<SanitaryTreatment>) => {
    const currentTreatment = treatments.find((item) => item.id === treatmentId);
    if (!currentTreatment) return;
    setTreatments((prev) => prev.map((item) => (item.id === treatmentId ? { ...item, ...updates } : item)));
    addAuditLog('Sanitaire', `Modification du traitement ${currentTreatment.name}`, JSON.stringify({ ...currentTreatment, ...updates }), JSON.stringify(currentTreatment));
  };

  const handleDeleteTreatment = (treatmentId: string) => {
    const currentTreatment = treatments.find((item) => item.id === treatmentId);
    if (!currentTreatment) return;
    if (currentTreatment.status === 'completed') {
      alert("Suppression impossible: ce traitement a déjà été exécuté et reste lié au journal sanitaire.");
      return;
    }
    setTreatments((prev) => prev.filter((item) => item.id !== treatmentId));
    addAuditLog('Sanitaire', `Suppression du traitement ${currentTreatment.name}`);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) return;
    setTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, ...updates } : item)));
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

  const handleUpdateTransaction = (transactionId: string, updates: Partial<FinanceTransaction>) => {
    const currentTransaction = transactions.find((item) => item.id === transactionId);
    if (!currentTransaction) return;
    if (currentTransaction.sourceModule !== 'Finances') {
      alert("Modification bloquée: cette écriture provient d'un autre module métier et doit être corrigée depuis sa source.");
      return;
    }
    setTransactions((prev) => prev.map((item) => (item.id === transactionId ? { ...item, ...updates } : item)));
    addAuditLog('Finances', `Modification d'une écriture manuelle`, JSON.stringify({ ...currentTransaction, ...updates }), JSON.stringify(currentTransaction));
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const currentTransaction = transactions.find((item) => item.id === transactionId);
    if (!currentTransaction) return;
    if (currentTransaction.sourceModule !== 'Finances') {
      alert("Suppression bloquée: cette écriture est générée par un workflow métier et doit être supprimée depuis le module d'origine.");
      return;
    }
    setTransactions((prev) => prev.filter((item) => item.id !== transactionId));
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

  const handleUpdateAlert = (alertId: string, updates: Partial<Alert>) => {
    const currentAlert = alerts.find((item) => item.id === alertId);
    if (!currentAlert) return;
    setAlerts((prev) => prev.map((item) => (item.id === alertId ? { ...item, ...updates } : item)));
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
            priority: newTask.priority,
            status: newTask.status,
            due_at: new Date(`${newTask.dueDate}T12:00:00Z`).toISOString(),
            reminder_at: new Date(`${newTask.dueDate}T06:00:00Z`).toISOString(),
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
    alert("Tâche corrective urgente ajoutée à l'agenda !");
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
    alert("Les données locales ont été réinitialisées.");
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
      alert("Tous les bassins sont déjà récoltés. Réinitialisez la base de données dans les paramètres pour recommencer la simulation.");
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
      {/* Syncing overlay */}
      {isSyncing && (
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
            
            {currentView === 'dashboard' && (
              <DashboardView
                lots={lots}
                eggProductions={eggProductions}
                fishBassins={fishBassins}
                parcelles={parcelles}
                articles={articles}
                transactions={transactions}
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
                currency={settings.currency}
                onAddLot={handleAddLot}
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
                onAdjustStock={handleAdjustStock}
                onGeneratePurchaseTask={handleGeneratePurchaseTask}
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
              <ReportsView role={role} />
            )}

            {currentView === 'audit' && (
              <AuditView auditLogs={auditLogs} />
            )}

            {currentView === 'paramètres' && (
              <SettingsView
                role={role}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onTestAlarm={handleTestAlarm}
                onChangePassword={handleChangePassword}
              />
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
