'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { type EventDropArg } from '@fullcalendar/core';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarPlus2,
  CheckCircle2,
  Clock3,
  Filter,
  PlayCircle,
  Search,
  Sparkles,
  Target,
  Waves,
  Workflow
} from 'lucide-react';
import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  createAgendaTask,
  getFarm,
  getFarmAgenda,
  getFarmAnimalGroups,
  getFarmAlerts,
  getFarmCrops,
  getFarmFacilities,
  getFarmFinanceTransactions,
  getFarmPlots,
  getFarmProductionOverview,
  getFarmReports,
  getFarmSanitaryEvents,
  getFarmStockItems,
  type AlertView,
  type AgendaTaskView,
  type AgendaViewResponse,
  type AnimalGroupView,
  type BuildingView,
  type CropView,
  type EnclosureView,
  type FinancialTransactionView,
  type PlotView,
  type ProductionRecordView,
  type ReportHistoryView,
  type SanitaryEventView,
  type StockItemView,
  updateAgendaTaskStatus
} from '../../../../services/farm-client';

type PriorityFilter = 'ALL' | AgendaTaskView['priority'];
type StatusFilter = 'ALL' | AgendaTaskView['status'];
type ModuleFilter = 'ALL' | string;

const taskCategories = [
  'ALIMENTATION',
  'SANITAIRE',
  'PRODUCTION',
  'RECOLTE',
  'VENTE',
  'STOCK',
  'FINANCE',
  'MAINTENANCE',
  'CULTURE',
  'REPRODUCTION',
  'NETTOYAGE',
  'CONTROLE',
  'ADMINISTRATIF'
] as const;

const taskRepeatRules = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const;
const taskReminderPresets = ['AUTO', '24H', '6H', '1H', 'AT_TIME', 'OVERDUE'] as const;
const taskStatuses = ['A_FAIRE', 'EN_COURS', 'TERMINEE', 'EN_RETARD', 'ANNULEE'] as const;
const taskModules = [
  'farm',
  'dashboard',
  'livestock',
  'layers/production',
  'pisciculture',
  'production',
  'crops',
  'plots',
  'facilities',
  'inventory',
  'finance',
  'sanitary',
  'alerts',
  'reports'
] as const;
type EntityType =
  | 'FARM'
  | 'ANIMAL'
  | 'LOT'
  | 'BASSIN'
  | 'PARCELLE'
  | 'CULTURE'
  | 'BATIMENT'
  | 'ENCLOS'
  | 'STOCK'
  | 'PRODUCTION'
  | 'VENTE'
  | 'DEPENSE'
  | 'SANITARY_EVENT'
  | 'RECOLTE'
  | 'ALERTE'
  | 'RAPPORT';

const statusLabels: Record<(typeof taskStatuses)[number], string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  EN_RETARD: 'En retard',
  ANNULEE: 'Annulée'
};

const reminderLabels: Record<(typeof taskReminderPresets)[number], string> = {
  AUTO: 'Automatique',
  '24H': '24 h avant',
  '6H': '6 h avant',
  '1H': '1 h avant',
  AT_TIME: "À l'heure exacte",
  OVERDUE: 'En retard'
};

const repeatLabels: Record<(typeof taskRepeatRules)[number], string> = {
  NONE: 'Aucune',
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuelle',
  CUSTOM: 'Personnalisée'
};

const moduleLabels: Record<(typeof taskModules)[number], string> = {
  farm: 'Ferme',
  dashboard: 'Tableau de bord',
  livestock: 'Élevage',
  'layers/production': 'Pondeuses',
  pisciculture: 'Pisciculture',
  production: 'Production',
  crops: 'Cultures',
  plots: 'Parcelles',
  facilities: 'Infrastructures',
  inventory: 'Stocks',
  finance: 'Finances',
  sanitary: 'Sanitaire',
  alerts: 'Alertes',
  reports: 'Rapports'
};

const categoryLabels: Record<(typeof taskCategories)[number], string> = {
  ALIMENTATION: 'Alimentation',
  SANITAIRE: 'Sanitaire',
  PRODUCTION: 'Production',
  RECOLTE: 'Récolte',
  VENTE: 'Vente',
  STOCK: 'Stock',
  FINANCE: 'Finance',
  MAINTENANCE: 'Maintenance',
  CULTURE: 'Culture',
  REPRODUCTION: 'Reproduction',
  NETTOYAGE: 'Nettoyage',
  CONTROLE: 'Contrôle',
  ADMINISTRATIF: 'Administratif'
};

const priorityLabels: Record<AgendaTaskView['priority'], string> = {
  HIGH: 'Haute',
  MEDIUM: 'Moyenne',
  LOW: 'Basse'
};

const entityTypeLabels: Record<EntityType, string> = {
  FARM: 'Ferme',
  ANIMAL: 'Animal',
  LOT: 'Lot',
  BASSIN: 'Bassin',
  PARCELLE: 'Parcelle',
  CULTURE: 'Culture',
  BATIMENT: 'Bâtiment',
  ENCLOS: 'Enclos',
  STOCK: 'Stock',
  PRODUCTION: 'Production',
  VENTE: 'Vente',
  DEPENSE: 'Dépense',
  SANITARY_EVENT: 'Événement sanitaire',
  RECOLTE: 'Récolte',
  ALERTE: 'Alerte',
  RAPPORT: 'Rapport'
};

type LinkedEntityOption = {
  id: string;
  label: string;
  type: EntityType;
  module: (typeof taskModules)[number] | string;
};

function animalGroupToOption(group: AnimalGroupView): LinkedEntityOption {
  const label = group.name?.trim()
    ? `${group.name} - ${group.identificationNumber}`
    : `${group.identificationNumber} - ${group.species}`;

  return {
    id: group.id,
    label,
    type: group.trackingMode === 'LOT' ? 'LOT' : 'ANIMAL',
    module: 'livestock'
  };
}

function plotToOption(plot: PlotView): LinkedEntityOption {
  return {
    id: plot.id,
    label: `${plot.name} - ${plot.surfaceArea} ha`,
    type: 'PARCELLE',
    module: 'plots'
  };
}

function cropToOption(crop: CropView): LinkedEntityOption {
  return {
    id: crop.id,
    label: `${crop.name} - ${crop.plotName}`,
    type: 'CULTURE',
    module: 'crops'
  };
}

function buildingToOption(building: BuildingView): LinkedEntityOption {
  return {
    id: building.id,
    label: `${building.name} - ${building.buildingType}`,
    type: building.buildingType === 'BASSIN' ? 'BASSIN' : 'BATIMENT',
    module: 'facilities'
  };
}

function enclosureToOption(enclosure: EnclosureView): LinkedEntityOption {
  return {
    id: enclosure.id,
    label: `${enclosure.name} - ${enclosure.enclosureType}`,
    type: enclosure.enclosureType === 'BASSIN_OUVERT' ? 'BASSIN' : 'ENCLOS',
    module: 'facilities'
  };
}

function stockItemToOption(stockItem: StockItemView): LinkedEntityOption {
  return {
    id: stockItem.id,
    label: `${stockItem.name} - ${stockItem.currentQuantity} ${stockItem.unit}`,
    type: 'STOCK',
    module: 'inventory'
  };
}

function transactionToOption(transaction: FinancialTransactionView): LinkedEntityOption {
  return {
    id: transaction.id,
    label: `${transaction.transactionType} - ${transaction.category} - ${transaction.amount.toFixed(0)}`,
    type: transaction.transactionType === 'DEPENSE' ? 'DEPENSE' : 'VENTE',
    module: 'finance'
  };
}

function sanitaryEventToOption(event: SanitaryEventView): LinkedEntityOption {
  return {
    id: event.id,
    label: `${event.eventType} - ${event.animalLabel ?? 'Sans animal'}`,
    type: 'SANITARY_EVENT',
    module: 'sanitary'
  };
}

function reportToOption(report: ReportHistoryView): LinkedEntityOption {
  return {
    id: report.id,
    label: `${report.reportType} - ${report.format}`,
    type: 'RAPPORT',
    module: 'reports'
  };
}

function alertToOption(alert: AlertView): LinkedEntityOption {
  return {
    id: alert.id,
    label: `${alert.title} - ${alert.severity}`,
    type: 'ALERTE',
    module: 'alerts'
  };
}

function productionRecordToOption(record: ProductionRecordView): LinkedEntityOption {
  return {
    id: record.id,
    label: `${record.productionLabel} - ${record.productionDate.slice(0, 10)}`,
    type: 'PRODUCTION',
    module: 'production'
  };
}

function taskTone(task: AgendaTaskView) {
  if (task.status === 'EN_RETARD') {
    return {
      backgroundColor: 'rgba(220, 38, 38, 0.14)',
      borderColor: '#dc2626',
      textColor: '#991b1b'
    };
  }

  if (task.status === 'TERMINEE') {
    return {
      backgroundColor: 'rgba(22, 163, 74, 0.14)',
      borderColor: '#16a34a',
      textColor: '#14532d'
    };
  }

  if (task.status === 'ANNULEE') {
    return {
      backgroundColor: 'rgba(100, 116, 139, 0.16)',
      borderColor: '#64748b',
      textColor: '#334155'
    };
  }

  if (task.priority === 'HIGH') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
      borderColor: '#d97706',
      textColor: '#92400e'
    };
  }

  if (task.priority === 'MEDIUM') {
    return {
      backgroundColor: 'rgba(2, 132, 199, 0.14)',
      borderColor: '#0284c7',
      textColor: '#075985'
    };
  }

  return {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderColor: 'rgba(22, 163, 74, 0.28)',
    textColor: '#166534'
  };
}

export default function FarmAgendaPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState<string>('');
  const [farmName, setFarmName] = useState<string>('Ferme');
  const [agenda, setAgenda] = useState<AgendaViewResponse | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [referenceDataLoaded, setReferenceDataLoaded] = useState(false);
  const [referenceData, setReferenceData] = useState({
    animalGroups: [] as AnimalGroupView[],
    plots: [] as PlotView[],
    crops: [] as CropView[],
    buildings: [] as BuildingView[],
    enclosures: [] as EnclosureView[],
    stockItems: [] as StockItemView[],
    transactions: [] as FinancialTransactionView[],
    sanitaryEvents: [] as SanitaryEventView[],
    reports: [] as ReportHistoryView[],
    alerts: [] as AlertView[],
    productionRecords: [] as ProductionRecordView[]
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as AgendaTaskView['priority'],
    category: 'ADMINISTRATIF',
    status: 'A_FAIRE' as AgendaTaskView['status'],
    linkedModule: '',
    linkedEntityType: '',
    linkedEntityId: '',
    linkedEntityLabel: '',
    reminderPreset: 'AUTO',
    repeatRule: 'NONE',
    repeatEvery: 1,
    notes: '',
    scheduledFor: new Date().toISOString().slice(0, 16)
  });
  const { pushToast } = useToast();

  function refreshAgenda(activeFarmId: string, token: string) {
    return getFarmAgenda(activeFarmId, token).then(setAgenda).catch(() => setAgenda(null));
  }

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    const moduleHint = searchParams.get('module') ?? '';
    const entityTypeHint = searchParams.get('entityType') ?? '';
    const entityIdHint = searchParams.get('entityId') ?? '';
    const entityLabelHint = searchParams.get('entityLabel') ?? '';
    const categoryHint = searchParams.get('category') ?? '';
    const repeatHint = searchParams.get('repeatRule') ?? '';

    if (!moduleHint && !entityTypeHint && !entityIdHint && !entityLabelHint && !categoryHint && !repeatHint) {
      return;
    }

    setTaskForm((current) => ({
      ...current,
      linkedModule: moduleHint || current.linkedModule,
      linkedEntityType: entityTypeHint || current.linkedEntityType,
      linkedEntityId: entityIdHint || current.linkedEntityId,
      linkedEntityLabel: entityLabelHint || current.linkedEntityLabel,
      category: categoryHint || current.category,
      repeatRule: repeatHint || current.repeatRule
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    let cancelled = false;

    getFarm(farmId, session.token)
      .then((farm) => {
        if (!cancelled) {
          setFarmName(farm.name);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFarmName(`Ferme ${farmId}`);
        }
      });

    refreshAgenda(farmId, session.token);

    Promise.all([
      getFarmAnimalGroups(farmId, session.token),
      getFarmPlots(farmId, session.token),
      getFarmCrops(farmId, session.token),
      getFarmFacilities(farmId, session.token),
      getFarmStockItems(farmId, session.token),
      getFarmFinanceTransactions(farmId, session.token),
      getFarmSanitaryEvents(farmId, session.token),
      getFarmReports(farmId, session.token),
      getFarmAlerts(farmId, session.token),
      getFarmProductionOverview(farmId, session.token)
    ])
      .then(([animalGroups, plots, crops, facilities, stockItems, transactions, sanitaryEvents, reports, alerts, production]) => {
        if (cancelled) {
          return;
        }

        setReferenceData({
          animalGroups: animalGroups.items,
          plots: plots.items,
          crops: crops.items,
          buildings: facilities.buildings,
          enclosures: facilities.enclosures,
          stockItems: stockItems.items,
          transactions: transactions.items,
          sanitaryEvents: sanitaryEvents.items,
          reports: reports.items,
          alerts: alerts.items,
          productionRecords: production.records
        });
        setReferenceDataLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReferenceData({
            animalGroups: [],
            plots: [],
            crops: [],
            buildings: [],
            enclosures: [],
            stockItems: [],
            transactions: [],
            sanitaryEvents: [],
            reports: [],
            alerts: [],
            productionRecords: []
          });
          setReferenceDataLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [farmId, session?.token]);

  const allTasks = useMemo(() => {
    const items = [
      ...(agenda?.today ?? []),
      ...(agenda?.upcoming ?? []),
      ...(agenda?.completed ?? []),
      ...(agenda?.overdue ?? []),
      ...(agenda?.cancelled ?? [])
    ];

    const deduped = new Map<string, AgendaTaskView>();
    for (const task of items) {
      deduped.set(task.id, task);
    }

    return Array.from(deduped.values()).sort(
      (left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime()
    );
  }, [agenda]);

  useEffect(() => {
    if (!selectedTaskId && allTasks[0]) {
      setSelectedTaskId(allTasks[0].id);
    }

    if (selectedTaskId && !allTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(allTasks[0]?.id ?? '');
    }
  }, [allTasks, selectedTaskId]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      const matchesModule =
        moduleFilter === 'ALL' ||
        task.linkedModule === moduleFilter ||
        task.sourceModule === moduleFilter;

      return matchesSearch && matchesPriority && matchesStatus && matchesModule;
    });
  }, [allTasks, moduleFilter, priorityFilter, search, statusFilter]);

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ??
    allTasks.find((task) => task.id === selectedTaskId) ??
    null;

  const linkedEntityOptions = useMemo<LinkedEntityOption[]>(() => {
    const farmOption: LinkedEntityOption = {
      id: farmId || 'farm',
      label: farmName ? `Ferme - ${farmName}` : 'Ferme',
      type: 'FARM',
      module: 'farm'
    };

    if (!referenceDataLoaded && taskForm.linkedModule && taskForm.linkedModule !== 'farm' && taskForm.linkedModule !== 'dashboard') {
      return [];
    }

    switch (taskForm.linkedModule) {
      case 'dashboard':
      case 'farm':
      case '':
        return [farmOption];
      case 'livestock':
      case 'layers/production':
        return referenceData.animalGroups.map(animalGroupToOption).concat(
          referenceData.animalGroups.length ? [] : [farmOption]
        );
      case 'pisciculture':
        return [
          ...referenceData.buildings.filter((building) => building.buildingType === 'BASSIN').map(buildingToOption),
          ...referenceData.enclosures
            .filter((enclosure) => enclosure.enclosureType === 'BASSIN_OUVERT')
            .map(enclosureToOption),
          ...(referenceData.buildings.some((building) => building.buildingType === 'BASSIN') ||
          referenceData.enclosures.some((enclosure) => enclosure.enclosureType === 'BASSIN_OUVERT')
            ? []
            : [farmOption])
        ];
      case 'production':
        return referenceData.productionRecords.map(productionRecordToOption).concat(
          referenceData.productionRecords.length ? [] : [farmOption]
        );
      case 'crops':
        return referenceData.crops.map(cropToOption).concat(referenceData.crops.length ? [] : [farmOption]);
      case 'plots':
        return referenceData.plots.map(plotToOption).concat(referenceData.plots.length ? [] : [farmOption]);
      case 'facilities':
        return [
          ...referenceData.buildings.map(buildingToOption),
          ...referenceData.enclosures.map(enclosureToOption),
          ...(referenceData.buildings.length || referenceData.enclosures.length ? [] : [farmOption])
        ];
      case 'inventory':
        return referenceData.stockItems.map(stockItemToOption).concat(
          referenceData.stockItems.length ? [] : [farmOption]
        );
      case 'finance':
        return referenceData.transactions.map(transactionToOption).concat(
          referenceData.transactions.length ? [] : [farmOption]
        );
      case 'sanitary':
        return referenceData.sanitaryEvents.map(sanitaryEventToOption).concat(
          referenceData.sanitaryEvents.length ? [] : [farmOption]
        );
      case 'alerts':
        return referenceData.alerts.map(alertToOption).concat(referenceData.alerts.length ? [] : [farmOption]);
      case 'reports':
        return referenceData.reports.map(reportToOption).concat(referenceData.reports.length ? [] : [farmOption]);
      default:
        return [farmOption];
    }
  }, [farmId, farmName, referenceData, referenceDataLoaded, taskForm.linkedModule]);

  useEffect(() => {
    if (!linkedEntityOptions.length) {
      return;
    }

    setTaskForm((current) => {
      const currentOption = linkedEntityOptions.find((option) => option.id === current.linkedEntityId);
      if (currentOption) {
        const nextModule = current.linkedModule || currentOption.module;
        if (
          current.linkedEntityType === currentOption.type &&
          current.linkedEntityLabel === currentOption.label &&
          current.linkedModule === nextModule
        ) {
          return current;
        }

        return {
          ...current,
          linkedModule: nextModule,
          linkedEntityType: currentOption.type,
          linkedEntityId: currentOption.id,
          linkedEntityLabel: currentOption.label
        };
      }

      const nextOption = linkedEntityOptions[0];
      return {
        ...current,
        linkedModule: current.linkedModule || nextOption.module,
        linkedEntityType: nextOption.type,
        linkedEntityId: nextOption.id,
        linkedEntityLabel: nextOption.label
      };
    });
  }, [linkedEntityOptions]);

  async function patchTask(taskId: string, input: { status?: AgendaTaskView['status']; scheduledFor?: string }) {
    if (!session?.token) {
      return;
    }

    await updateAgendaTaskStatus(farmId, taskId, input, session.token);
    await refreshAgenda(farmId, session.token);
  }

  function updateStatus(task: AgendaTaskView, status: AgendaTaskView['status']) {
    startTransition(async () => {
      await patchTask(task.id, { status });
      pushToast({
        title: 'Tache mise a jour',
        description: `${task.title} est maintenant ${status}.`,
        variant: 'success'
      });
    });
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        const created = await createAgendaTask(
          farmId,
          {
            ...taskForm,
            repeatEvery: taskForm.repeatRule === 'CUSTOM' ? taskForm.repeatEvery : undefined,
            scheduledFor: new Date(taskForm.scheduledFor).toISOString()
          },
          session.token
        );
        setTaskForm({
          title: '',
          description: '',
          priority: 'MEDIUM',
          category: 'ADMINISTRATIF',
          status: 'A_FAIRE',
          linkedModule: '',
          linkedEntityType: '',
          linkedEntityId: '',
          linkedEntityLabel: '',
          reminderPreset: 'AUTO',
          repeatRule: 'NONE',
          repeatEvery: 1,
          notes: '',
          scheduledFor: new Date().toISOString().slice(0, 16)
        });
        await refreshAgenda(farmId, session.token);
        setSelectedTaskId(created.id);
        pushToast({
          title: 'Tâche créée',
          description: `${created.title} a été ajoutée à l’agenda.`,
          variant: 'success'
        });
      } catch (creationError) {
        pushToast({
          title: 'Création impossible',
          description: creationError instanceof Error ? creationError.message : 'La tâche n’a pas pu être créée.',
          variant: 'error'
        });
      }
    });
  }

  function handleEventDrop(eventDrop: EventDropArg) {
    if (!session?.token) {
      eventDrop.revert();
      return;
    }

    startTransition(async () => {
      try {
        const eventDate = eventDrop.event.start;
        if (!eventDate) {
          eventDrop.revert();
          return;
        }

        await patchTask(eventDrop.event.id, {
          scheduledFor: eventDate.toISOString()
        });
      } catch {
        eventDrop.revert();
      }
    });
  }

  const calendarEvents = filteredTasks.map((task) => ({
    id: task.id,
    title: task.title,
    start: task.scheduledFor,
    allDay: true,
    editable: session?.user.role === 'ADMIN' && task.status !== 'TERMINEE' && task.status !== 'ANNULEE',
    extendedProps: {
      description: task.description,
      priority: task.priority,
      status: task.status,
      sourceModule: task.sourceModule
    },
    ...taskTone(task)
  }));

  const alerts = agenda?.alerts ?? [];
  const todayCount = allTasks.filter((task) => task.scheduledLabel.includes("Aujourd'hui")).length;
  const overdueCount = allTasks.filter((task) => task.status === 'EN_RETARD').length;
  const completedCount = allTasks.filter((task) => task.status === 'TERMINEE').length;
  const cancelledCount = allTasks.filter((task) => task.status === 'ANNULEE').length;
  const activeCount = allTasks.filter((task) => task.status === 'EN_COURS').length;
  const manualCount = allTasks.filter((task) => !task.sourceModule).length;
  const alertMeta = (severity: string) => {
    const normalized = severity.toUpperCase();
    if (normalized.includes('CRIT') || normalized.includes('DANGER')) {
      return { label: 'Critique', variant: 'critical' as const, tone: 'critical' };
    }
    if (normalized.includes('WARN') || normalized.includes('ATTEN')) {
      return { label: 'Attention', variant: 'warning' as const, tone: 'warning' };
    }
    return { label: 'Info', variant: 'info' as const, tone: 'info' };
  };

  return (
    <AppShell title={`Agenda avancé - ${farmName}`}>
      <section className="agenda-hero-grid agenda-hero-grid-premium">
        <article className="agenda-hero-card agenda-hero-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Planification intelligente</p>
              <h2 className="farms-section-title agenda-section-title">Un agenda vivant, centré sur l’exécution</h2>
            </div>
            <Badge variant={overdueCount > 0 ? 'warning' : 'success'}>
              {overdueCount > 0 ? `${overdueCount} retard(s)` : 'Flux stable'}
            </Badge>
          </div>
          <p className="hero-copy">
            Visualisez les opérations du jour, replanifiez par glisser-déposer et gardez une
            lecture claire des priorités agricoles et sanitaires.
          </p>
          <div className="agenda-hero-pills">
            <span className="dashboard-hero-pill">
              <Clock3 className="h-4 w-4" />
              {todayCount} tâche(s) aujourd’hui
            </span>
            <span className="dashboard-hero-pill">
              <Workflow className="h-4 w-4" />
              {filteredTasks.length} visible(s)
            </span>
            <span className="dashboard-hero-pill">
              <Target className="h-4 w-4" />
              {completedCount} terminée(s)
            </span>
          </div>
          <div className="agenda-hero-metrics">
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">Jour</span>
              <strong>{todayCount}</strong>
              <span className="agenda-metric-note">Tâches à traiter maintenant</span>
            </article>
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">Retards</span>
              <strong>{overdueCount}</strong>
              <span className="agenda-metric-note">Points d’attention prioritaires</span>
            </article>
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">En cours</span>
              <strong>{activeCount}</strong>
              <span className="agenda-metric-note">Exécution opérationnelle active</span>
            </article>
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">Manuelles</span>
              <strong>{manualCount}</strong>
              <span className="agenda-metric-note">Tâches créées par l’administrateur</span>
            </article>
          </div>
        </article>

        <article className="agenda-focus-card agenda-focus-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Focus</p>
              <h2>{selectedTask?.title ?? 'Sélectionnez une tâche'}</h2>
            </div>
            <div className="farm-module-icon">
              <Waves className="h-5 w-5" />
            </div>
          </div>
          {selectedTask ? (
            <div className="agenda-focus-stack">
              <div className="agenda-focus-tags">
                <Badge
                  variant={
                    selectedTask.status === 'EN_RETARD'
                      ? 'critical'
                      : selectedTask.status === 'TERMINEE'
                        ? 'success'
                        : selectedTask.status === 'ANNULEE'
                          ? 'neutral'
                          : 'info'
                  }
                >
                  {statusLabels[selectedTask.status]}
                </Badge>
                <Badge variant={selectedTask.priority === 'HIGH' ? 'warning' : selectedTask.priority === 'MEDIUM' ? 'info' : 'success'}>
                  Priorité {priorityLabels[selectedTask.priority]}
                </Badge>
              </div>
              <div className="metric-list agenda-metadata-list">
                <span>Date : {new Date(selectedTask.scheduledFor).toLocaleDateString('fr-FR')}</span>
                <span>Catégorie : {categoryLabels[selectedTask.category as keyof typeof categoryLabels] ?? selectedTask.category}</span>
                <span>
                  Module : {moduleLabels[(selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'dashboard') as keyof typeof moduleLabels] ?? selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'Manuelle'}
                </span>
                <span>Élément : {selectedTask.linkedEntityLabel ?? selectedTask.linkedEntityId ?? 'Aucun'}</span>
                <span>
                  Rappel : {reminderLabels[(selectedTask.reminderPreset as keyof typeof reminderLabels) ?? 'AUTO'] ?? selectedTask.reminderPreset ?? 'Automatique'}
                </span>
                <span>Répétition : {repeatLabels[selectedTask.repeatRule as keyof typeof repeatLabels] ?? selectedTask.repeatRule}</span>
              </div>
              <p className="muted">{selectedTask.description}</p>
            </div>
          ) : (
            <p className="muted">Choisissez un élément du planning pour afficher son détail.</p>
          )}
        </article>
      </section>

      <section className="dashboard-kpi-grid">
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <Clock3 className="h-5 w-5" />
            </div>
            <Badge variant="info">Aujourd’hui</Badge>
          </div>
          <p className="eyebrow">Charge du jour</p>
          <strong className="metric-number">{todayCount}</strong>
            <span className="metric-delta">Vue jour, semaine, mois et liste activées</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge variant={overdueCount ? 'warning' : 'success'}>Retards</Badge>
          </div>
          <p className="eyebrow">À régulariser</p>
          <strong className="metric-number">{overdueCount}</strong>
          <span className="metric-delta">Glisser-déposer disponible pour replanifier</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <Badge variant="success">Exécution</Badge>
          </div>
          <p className="eyebrow">Tâches terminées</p>
          <strong className="metric-number">{completedCount}</strong>
          <span className="metric-delta">Planning dynamique synchronisé</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge variant="neutral">Annulées</Badge>
          </div>
          <p className="eyebrow">Tâches annulées</p>
          <strong className="metric-number">{cancelledCount}</strong>
          <span className="metric-delta">Historique conservé dans l’agenda</span>
        </article>
      </section>

      <section className="panel agenda-command-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Filtres intelligents</p>
            <h2>Recherche, couleurs et édition rapide</h2>
          </div>
          <Badge variant="success">FullCalendar actif</Badge>
        </div>
        <div className="agenda-toolbar">
          <label className="agenda-search">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une tâche, un protocole ou une description..."
            />
          </label>
          <div className="agenda-filter-row">
            <span className="agenda-filter-label">
              <Filter className="h-4 w-4" />
              Filtres
            </span>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              <option value="ALL">Tous les modules</option>
              {taskModules.map((module) => (
                <option key={module} value={module}>
                  {moduleLabels[module]}
                </option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}>
              <option value="ALL">Toutes les priorités</option>
              <option value="HIGH">{priorityLabels.HIGH}</option>
              <option value="MEDIUM">{priorityLabels.MEDIUM}</option>
              <option value="LOW">{priorityLabels.LOW}</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="ALL">Tous les statuts</option>
              <option value="A_FAIRE">À faire</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINEE">Terminée</option>
              <option value="EN_RETARD">En retard</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>
        </div>
      </section>

      {session?.user.role === 'ADMIN' ? (
        <section className="module-action-grid agenda-action-grid">
          <article className="module-form-card agenda-form-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Nouvelle tâche</p>
                <h2>Créer une tâche dans l’agenda</h2>
              </div>
              <div className="farm-module-icon">
                <CalendarPlus2 className="h-5 w-5" />
              </div>
            </div>
            <form className="stack-form" onSubmit={submitTask}>
              <div className="field-grid">
                <label className="field">
                  <span>Titre</span>
                  <input
                    value={taskForm.title}
                    onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Ex. : Contrôle du bassin nord"
                  />
                </label>
                <label className="field">
                  <span>Description</span>
                  <input
                    value={taskForm.description}
                    onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Détaillez ce qui doit être fait sur le terrain"
                  />
                </label>
                                <label className="field">
                  <span>Module lié</span>
                  <select
                    value={taskForm.linkedModule}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        linkedModule: event.target.value,
                        linkedEntityType: '',
                        linkedEntityId: '',
                        linkedEntityLabel: ''
                      }))
                    }
                  >
                    <option value="">Choisir un module</option>
                    {taskModules.map((module) => (
                      <option key={module} value={module}>
                        {moduleLabels[module]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Élément concerné</span>
                  <select
                    value={taskForm.linkedEntityId}
                    onChange={(event) => {
                      const nextOption = linkedEntityOptions.find((option) => option.id === event.target.value);
                      setTaskForm((current) => ({
                        ...current,
                        linkedEntityId: event.target.value,
                        linkedEntityType: nextOption?.type ?? current.linkedEntityType,
                        linkedEntityLabel: nextOption?.label ?? current.linkedEntityLabel,
                        linkedModule: nextOption?.module ?? current.linkedModule
                      }));
                    }}
                    disabled={!taskForm.linkedModule && linkedEntityOptions.length === 0}
                  >
                    <option value="">{taskForm.linkedModule ? 'Sélectionner un élément' : 'Choisissez d’abord un module'}</option>
                    {linkedEntityOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <span>Type lié</span>
                  <div className="metric-list" style={{ paddingTop: 8 }}>
                    <Badge variant="neutral">{taskForm.linkedEntityType ? entityTypeLabels[taskForm.linkedEntityType as EntityType] : 'Automatique'}</Badge>
                    <span className="muted">
                      {taskForm.linkedEntityLabel || 'Le type se remplit automatiquement selon l’élément choisi.'}
                    </span>
                  </div>
                </div>
                <label className="field">
                  <span>Catégorie</span>
                  <select
                    value={taskForm.category}
                    onChange={(event) => setTaskForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    {taskCategories.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Priorité</span>
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, priority: event.target.value as AgendaTaskView['priority'] }))
                    }
                  >
                    <option value="HIGH">{priorityLabels.HIGH}</option>
                    <option value="MEDIUM">{priorityLabels.MEDIUM}</option>
                    <option value="LOW">{priorityLabels.LOW}</option>
                  </select>
                </label>
                <label className="field">
                  <span>Statut</span>
                  <select
                    value={taskForm.status}
                    onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as AgendaTaskView['status'] }))}
                  >
                    {taskStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Date et heure</span>
                  <input
                    type="datetime-local"
                    value={taskForm.scheduledFor}
                    onChange={(event) => setTaskForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Rappel</span>
                  <select
                    value={taskForm.reminderPreset}
                    onChange={(event) => setTaskForm((current) => ({ ...current, reminderPreset: event.target.value }))}
                  >
                    {taskReminderPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {reminderLabels[preset]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Répétition</span>
                  <select
                    value={taskForm.repeatRule}
                    onChange={(event) => setTaskForm((current) => ({ ...current, repeatRule: event.target.value }))}
                  >
                    {taskRepeatRules.map((rule) => (
                      <option key={rule} value={rule}>
                        {repeatLabels[rule]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Répéter tous les jours</span>
                  <input
                    type="number"
                    min={1}
                    value={taskForm.repeatEvery}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, repeatEvery: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field field-span-2">
                  <span>Notes</span>
                  <input
                    value={taskForm.notes}
                    onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Contexte, consigne ou précision opérationnelle"
                  />
                </label>
              </div>
              <div className="module-inline-note">
                <span>La tâche sera ajoutée au calendrier, au centre d’exécution, aux alarmes et à la traçabilité.</span>
                <Button className="module-submit-button"
                  type="submit"
                  disabled={
                    isPending ||
                    taskForm.title.trim().length < 3 ||
                    taskForm.description.trim().length < 3 ||
                    !taskForm.scheduledFor
                  }
                >
                  Ajouter la tâche
                </Button>
              </div>
            </form>
          </article>

          <article className="module-list-card agenda-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Création guidée</p>
                <h2>Nouveau workflow agenda</h2>
              </div>
              <Badge variant="success">Actif</Badge>
            </div>
            <div className="metric-list">
              <span>Tâches libres en plus des tâches automatiques</span>
              <span>Priorité, date et rappel intégrés</span>
              <span>Replanification toujours possible en glisser-déposer</span>
            </div>
          </article>
        </section>
      ) : null}

      <section className="agenda-advanced-grid">
        <article className="panel agenda-calendar-shell agenda-calendar-card agenda-calendar-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Calendrier professionnel</p>
              <h2>Vue mois, semaine, jour et liste</h2>
            </div>
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="fr"
            height="auto"
            dayMaxEvents={3}
            editable={session?.user.role === 'ADMIN'}
            droppable={session?.user.role === 'ADMIN'}
            eventDrop={handleEventDrop}
            events={calendarEvents}
            displayEventTime={false}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            buttonText={{
              today: "Aujourd’hui",
              month: 'Mois',
              week: 'Semaine',
              day: 'Jour',
              list: 'Liste'
            }}
            moreLinkContent={(args) => `+${args.num} autres`}
            eventClassNames={(arg) => [
              'agenda-calendar-event',
              `agenda-calendar-event-${String(arg.event.extendedProps.priority ?? 'LOW').toLowerCase()}`,
              `agenda-calendar-event-${String(arg.event.extendedProps.status ?? 'A_FAIRE').toLowerCase()}`
            ]}
            eventClick={(info) => setSelectedTaskId(info.event.id)}
            eventContent={(eventInfo) => (
              <div className="agenda-event-chip">
                <strong>{eventInfo.event.title}</strong>
                <span>{priorityLabels[eventInfo.event.extendedProps.priority as keyof typeof priorityLabels] ?? eventInfo.event.extendedProps.priority}</span>
              </div>
            )}
          />
        </article>

        <article className="panel agenda-side-panel agenda-focus-panel agenda-side-panel-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Édition rapide</p>
              <h2>{selectedTask?.title ?? 'Sélectionnez une tâche'}</h2>
            </div>
            {selectedTask ? (
              <Badge
                variant={
                  selectedTask.status === 'EN_RETARD'
                    ? 'critical'
                    : selectedTask.status === 'ANNULEE'
                      ? 'neutral'
                    : selectedTask.status === 'TERMINEE'
                      ? 'success'
                      : selectedTask.priority === 'HIGH'
                        ? 'warning'
                        : 'info'
                }
              >
                {selectedTask.status}
              </Badge>
            ) : null}
          </div>

          {selectedTask ? (
            <div className="stack-form">
              <div className="metric-list">
                <span>Priorité : {priorityLabels[selectedTask.priority]}</span>
                <span>Date : {new Date(selectedTask.scheduledFor).toLocaleDateString('fr-FR')}</span>
                <span>Catégorie : {categoryLabels[selectedTask.category as keyof typeof categoryLabels] ?? selectedTask.category}</span>
                <span>Module : {moduleLabels[(selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'dashboard') as keyof typeof moduleLabels] ?? selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'Manuelle'}</span>
                <span>Élément : {selectedTask.linkedEntityLabel ?? selectedTask.linkedEntityId ?? 'Aucun'}</span>
                <span>Rappel : {reminderLabels[(selectedTask.reminderPreset as keyof typeof reminderLabels) ?? 'AUTO'] ?? selectedTask.reminderPreset ?? 'Automatique'}</span>
                <span>Répétition : {repeatLabels[selectedTask.repeatRule as keyof typeof repeatLabels] ?? selectedTask.repeatRule}</span>
              </div>
              <p className="muted">{selectedTask.description}</p>
              {session?.user.role === 'ADMIN' ? (
                <div className="action-row">
                  <Button className="agenda-action-button"
                    variant="secondary"
                    size="md"
                    type="button"
                    disabled={isPending}
                    onClick={() => updateStatus(selectedTask, 'EN_COURS')}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Démarrer
                  </Button>
                  <Button className="agenda-action-button"
                    size="md"
                    type="button"
                    disabled={isPending}
                    onClick={() => updateStatus(selectedTask, 'TERMINEE')}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Terminer
                  </Button>
                  <Button className="agenda-action-button"
                    variant="secondary"
                    size="md"
                    type="button"
                    disabled={isPending}
                    onClick={() => updateStatus(selectedTask, 'A_FAIRE')}
                  >
                    Réinitialiser
                  </Button>
                  <Button className="agenda-action-button"
                    variant="secondary"
                    size="md"
                    type="button"
                    disabled={isPending}
                    onClick={() => updateStatus(selectedTask, 'ANNULEE')}
                  >
                    Annuler
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="muted">Aucune tâche ne correspond aux filtres actuels.</p>
          )}

          <div className="agenda-quick-list">
            {filteredTasks.length ? (
              filteredTasks.slice(0, 8).map((task, index) => (
              <motion.button
                  key={task.id}
                  type="button"
                  className={`agenda-snippet agenda-snippet-button ${task.id === selectedTaskId ? 'agenda-snippet-active' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="agenda-snippet-topline">
                    <strong>{task.title}</strong>
                    <Badge
                      variant={
                        task.status === 'EN_RETARD'
                          ? 'critical'
                          : task.status === 'TERMINEE'
                            ? 'success'
                            : task.status === 'ANNULEE'
                              ? 'neutral'
                              : task.priority === 'HIGH'
                                ? 'warning'
                                : 'info'
                      }
                    >
                      {statusLabels[task.status]}
                    </Badge>
                  </div>
                  <span className="muted">{task.scheduledLabel}</span>
                </motion.button>
              ))
            ) : (
              <p className="muted">Aucune tâche visible avec les filtres sélectionnés.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-summary-grid">
        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Signaux de planning</p>
              <h2>Centre d’alertes lié à l’agenda</h2>
            </div>
            <Badge variant={alerts.length ? 'warning' : 'success'}>{alerts.length}</Badge>
          </div>
          {alerts.length ? (
            alerts.map((alert) => (
              <article
                key={alert.id}
                className={`agenda-alert-card agenda-alert-card-premium alert-${alert.severity.toLowerCase()}`}
              >
                <div className="agenda-snippet-topline agenda-alert-topline">
                  <div className="agenda-alert-heading">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>{alert.title}</strong>
                  </div>
                  <Badge variant={alertMeta(alert.severity).variant}>{alertMeta(alert.severity).label}</Badge>
                </div>
                <p className="agenda-alert-message">{alert.message}</p>
              </article>
            ))
          ) : (
            <p className="muted">Aucun signal d’agenda actuellement.</p>
          )}
        </article>

        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Résumé des filtres</p>
              <h2>Résultats courants</h2>
            </div>
            <Badge variant="info">{filteredTasks.length}</Badge>
          </div>
          <div className="metric-list">
            <span>Tâches affichées : {filteredTasks.length}</span>
            <span>En retard : {filteredTasks.filter((task) => task.status === 'EN_RETARD').length}</span>
            <span>Automatiques : {filteredTasks.filter((task) => task.sourceModule !== null).length}</span>
            <span>Recherche : {search || 'Aucune'}</span>
          </div>
        </article>
      </section>
    </AppShell>
  );
}


