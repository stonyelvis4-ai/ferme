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
  type AgendaTaskView,
  type AgendaViewResponse,
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

const entityTypes = [
  'FARM',
  'ANIMAL',
  'LOT',
  'BASSIN',
  'PARCELLE',
  'CULTURE',
  'BATIMENT',
  'ENCLOS',
  'STOCK',
  'PRODUCTION',
  'VENTE',
  'DEPENSE',
  'SANITARY_EVENT',
  'RECOLTE',
  'ALERTE',
  'RAPPORT'
] as const;

const statusLabels: Record<(typeof taskStatuses)[number], string> = {
  A_FAIRE: 'A faire',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminee',
  EN_RETARD: 'En retard',
  ANNULEE: 'Annulee'
};

const reminderLabels: Record<(typeof taskReminderPresets)[number], string> = {
  AUTO: 'Automatique',
  '24H': '24 h avant',
  '6H': '6 h avant',
  '1H': '1 h avant',
  AT_TIME: 'A l heure',
  OVERDUE: 'En retard'
};

const repeatLabels: Record<(typeof taskRepeatRules)[number], string> = {
  NONE: 'Aucune',
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuelle',
  CUSTOM: 'Personnalisee'
};

const moduleLabels: Record<(typeof taskModules)[number], string> = {
  farm: 'Ferme',
  dashboard: 'Dashboard',
  livestock: 'Elevage',
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
  RECOLTE: 'Recolte',
  VENTE: 'Vente',
  STOCK: 'Stock',
  FINANCE: 'Finance',
  MAINTENANCE: 'Maintenance',
  CULTURE: 'Culture',
  REPRODUCTION: 'Reproduction',
  NETTOYAGE: 'Nettoyage',
  CONTROLE: 'Controle',
  ADMINISTRATIF: 'Administratif'
};

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

    getFarm(farmId, session.token)
      .then((farm) => setFarmName(farm.name))
      .catch(() => setFarmName(`Ferme ${farmId}`));

    refreshAgenda(farmId, session.token);
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
          title: 'Tache creee',
          description: `${created.title} a ete ajoutee a l'agenda.`,
          variant: 'success'
        });
      } catch (creationError) {
        pushToast({
          title: 'Creation impossible',
          description: creationError instanceof Error ? creationError.message : 'La tache na pas pu etre creee.',
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

  return (
    <AppShell title={`Agenda avance - ${farmName}`}>
      <section className="agenda-hero-grid agenda-hero-grid-premium">
        <article className="agenda-hero-card agenda-hero-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Planification intelligente</p>
              <h2 className="farms-section-title">Un agenda vivant, centre sur l execution</h2>
            </div>
            <Badge variant={overdueCount > 0 ? 'warning' : 'success'}>
              {overdueCount > 0 ? `${overdueCount} retard(s)` : 'Flux stable'}
            </Badge>
          </div>
          <p className="hero-copy">
            Visualisez les operations du jour, replanifiez par glisser-deposer et gardez une
            lecture claire des priorites agricoles et sanitaires.
          </p>
          <div className="agenda-hero-pills">
            <span className="dashboard-hero-pill">
              <Clock3 className="h-4 w-4" />
              {todayCount} tache(s) aujourd hui
            </span>
            <span className="dashboard-hero-pill">
              <Workflow className="h-4 w-4" />
              {filteredTasks.length} visible(s)
            </span>
            <span className="dashboard-hero-pill">
              <Target className="h-4 w-4" />
              {completedCount} terminee(s)
            </span>
          </div>
          <div className="agenda-hero-metrics">
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">Jour</span>
              <strong>{todayCount}</strong>
              <span className="agenda-metric-note">Taches a traiter maintenant</span>
            </article>
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">Retards</span>
              <strong>{overdueCount}</strong>
              <span className="agenda-metric-note">Points d attention prioritaires</span>
            </article>
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">En cours</span>
              <strong>{activeCount}</strong>
              <span className="agenda-metric-note">Execution operationnelle active</span>
            </article>
            <article className="agenda-hero-metric">
              <span className="agenda-metric-label">Manuelles</span>
              <strong>{manualCount}</strong>
              <span className="agenda-metric-note">Taches creees par l administrateur</span>
            </article>
          </div>
        </article>

        <article className="agenda-focus-card agenda-focus-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Focus</p>
              <h2>{selectedTask?.title ?? 'Selectionne une tache'}</h2>
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
                  Priorite {selectedTask.priority}
                </Badge>
              </div>
              <div className="metric-list agenda-metadata-list">
                <span>Date: {new Date(selectedTask.scheduledFor).toLocaleDateString('fr-FR')}</span>
                <span>Categorie: {categoryLabels[selectedTask.category as keyof typeof categoryLabels] ?? selectedTask.category}</span>
                <span>
                  Module: {moduleLabels[(selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'dashboard') as keyof typeof moduleLabels] ?? selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'MANUELLE'}
                </span>
                <span>Element: {selectedTask.linkedEntityLabel ?? selectedTask.linkedEntityId ?? 'Aucun'}</span>
                <span>
                  Rappel: {reminderLabels[(selectedTask.reminderPreset as keyof typeof reminderLabels) ?? 'AUTO'] ?? selectedTask.reminderPreset ?? 'AUTO'}
                </span>
                <span>Repetition: {repeatLabels[selectedTask.repeatRule as keyof typeof repeatLabels] ?? selectedTask.repeatRule}</span>
              </div>
              <p className="muted">{selectedTask.description}</p>
            </div>
          ) : (
            <p className="muted">Choisissez un element du planning pour afficher son detail.</p>
          )}
        </article>
      </section>

      <section className="dashboard-kpi-grid">
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <Clock3 className="h-5 w-5" />
            </div>
            <Badge variant="info">Aujourd hui</Badge>
          </div>
          <p className="eyebrow">Charge du jour</p>
          <strong className="metric-number">{todayCount}</strong>
          <span className="metric-delta">Vue jour, semaine, mois et liste activees</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge variant={overdueCount ? 'warning' : 'success'}>Retards</Badge>
          </div>
          <p className="eyebrow">A regulariser</p>
          <strong className="metric-number">{overdueCount}</strong>
          <span className="metric-delta">Drag-and-drop disponible pour replanifier</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <Badge variant="success">Execution</Badge>
          </div>
          <p className="eyebrow">Taches terminees</p>
          <strong className="metric-number">{completedCount}</strong>
          <span className="metric-delta">Planning dynamique synchronise</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <Badge variant="neutral">Annulees</Badge>
          </div>
          <p className="eyebrow">Taches annulees</p>
          <strong className="metric-number">{cancelledCount}</strong>
          <span className="metric-delta">Historique conserve dans l agenda</span>
        </article>
      </section>

      <section className="panel agenda-command-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Filtres intelligents</p>
            <h2>Recherche, couleurs et edition rapide</h2>
          </div>
          <Badge variant="success">FullCalendar actif</Badge>
        </div>
        <div className="agenda-toolbar">
          <label className="agenda-search">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une tache, un protocole ou une description..."
            />
          </label>
          <div className="agenda-filter-row">
            <span className="agenda-filter-label">
              <Filter className="h-4 w-4" />
              Filtres
            </span>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              <option value="ALL">Tous modules</option>
              {taskModules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}>
              <option value="ALL">Toutes priorites</option>
              <option value="HIGH">Haute</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Basse</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="ALL">Tous statuts</option>
              <option value="A_FAIRE">A faire</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINEE">Terminee</option>
              <option value="EN_RETARD">En retard</option>
              <option value="ANNULEE">Annulee</option>
            </select>
          </div>
        </div>
      </section>

      {session?.user.role === 'ADMIN' ? (
        <section className="module-action-grid agenda-action-grid">
          <article className="module-form-card agenda-form-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Nouvelle tache</p>
                <h2>Creer une tache manuelle dans l agenda</h2>
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
                    placeholder="Ex: Controle du bassin nord"
                  />
                </label>
                <label className="field">
                  <span>Description</span>
                  <input
                    value={taskForm.description}
                    onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Detaille ce qui doit etre fait sur le terrain"
                  />
                </label>
                <label className="field">
                  <span>Module lié</span>
                  <select
                    value={taskForm.linkedModule}
                    onChange={(event) => setTaskForm((current) => ({ ...current, linkedModule: event.target.value }))}
                  >
                    <option value="">Aucun</option>
                    {taskModules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Élément lié</span>
                  <input
                    value={taskForm.linkedEntityId}
                    onChange={(event) => setTaskForm((current) => ({ ...current, linkedEntityId: event.target.value }))}
                    placeholder="Id ou code de l'élément"
                  />
                </label>
                <label className="field">
                  <span>Type d'élément</span>
                  <select
                    value={taskForm.linkedEntityType}
                    onChange={(event) => setTaskForm((current) => ({ ...current, linkedEntityType: event.target.value }))}
                  >
                    <option value="">Aucun</option>
                    {entityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Libellé élément</span>
                  <input
                    value={taskForm.linkedEntityLabel}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, linkedEntityLabel: event.target.value }))
                    }
                    placeholder="Nom lisible de l'élément"
                  />
                </label>
                <label className="field">
                  <span>Catégorie</span>
                  <select
                    value={taskForm.category}
                    onChange={(event) => setTaskForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    {taskCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Priorite</span>
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, priority: event.target.value as AgendaTaskView['priority'] }))
                    }
                  >
                    <option value="HIGH">Haute</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="LOW">Basse</option>
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
                        {status}
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
                        {preset}
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
                        {rule}
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
                <span>La tache sera ajoutee au calendrier, au centre d execution, aux alarmes et à la traçabilité.</span>
                <Button className="module-submit-button"
                  type="submit"
                  disabled={
                    isPending ||
                    taskForm.title.trim().length < 3 ||
                    taskForm.description.trim().length < 3 ||
                    !taskForm.scheduledFor
                  }
                >
                  Ajouter la tache
                </Button>
              </div>
            </form>
          </article>

          <article className="module-list-card agenda-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Creation manuelle</p>
                <h2>Nouveau workflow agenda</h2>
              </div>
              <Badge variant="success">Actif</Badge>
            </div>
            <div className="metric-list">
              <span>Taches libres en plus des taches automatiques</span>
              <span>Priorite, date et rappel integres</span>
              <span>Replanification toujours possible en glisser-deposer</span>
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
            editable={session?.user.role === 'ADMIN'}
            droppable={session?.user.role === 'ADMIN'}
            eventDrop={handleEventDrop}
            events={calendarEvents}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            buttonText={{
              today: 'Aujourd hui',
              month: 'Mois',
              week: 'Semaine',
              day: 'Jour',
              list: 'Liste'
            }}
            eventClick={(info) => setSelectedTaskId(info.event.id)}
            eventContent={(eventInfo) => (
              <div className="agenda-event-chip">
                <strong>{eventInfo.event.title}</strong>
                <span>{eventInfo.event.extendedProps.priority}</span>
              </div>
            )}
          />
        </article>

        <article className="panel agenda-side-panel agenda-focus-panel agenda-side-panel-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Edition rapide</p>
              <h2>{selectedTask?.title ?? 'Selectionne une tache'}</h2>
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
                <span>Priorite: {selectedTask.priority}</span>
                <span>Date: {new Date(selectedTask.scheduledFor).toLocaleDateString('fr-FR')}</span>
                <span>Categorie: {selectedTask.category}</span>
                <span>Module: {selectedTask.linkedModule ?? selectedTask.sourceModule ?? 'MANUELLE'}</span>
                <span>Element: {selectedTask.linkedEntityLabel ?? selectedTask.linkedEntityId ?? 'Aucun'}</span>
                <span>Rappel: {selectedTask.reminderPreset ?? 'AUTO'}</span>
                <span>Répétition: {selectedTask.repeatRule}</span>
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
                    Demarrer
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
                    Reinitialiser
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
            <p className="muted">Aucune tache ne correspond aux filtres actuels.</p>
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
              <p className="muted">Aucune tache visible avec les filtres selectionnes.</p>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-summary-grid">
        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Signaux planning</p>
              <h2>Centre d alertes lie a l agenda</h2>
            </div>
            <Badge variant={alerts.length ? 'warning' : 'success'}>{alerts.length}</Badge>
          </div>
          {alerts.length ? (
            alerts.map((alert) => (
              <div key={alert.id} className={`agenda-snippet agenda-alert-card alert-${alert.severity.toLowerCase()}`}>
                <div className="agenda-snippet-topline">
                  <strong>{alert.title}</strong>
                  <span className="status-chip">{alert.severity}</span>
                </div>
                <span>{alert.message}</span>
              </div>
            ))
          ) : (
            <p className="muted">Aucun signal d agenda actuellement.</p>
          )}
        </article>

        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Resume filtre</p>
              <h2>Resultats courants</h2>
            </div>
            <Badge variant="info">{filteredTasks.length}</Badge>
          </div>
          <div className="metric-list">
            <span>Taches affichees: {filteredTasks.length}</span>
            <span>En retard: {filteredTasks.filter((task) => task.status === 'EN_RETARD').length}</span>
            <span>Automatiques: {filteredTasks.filter((task) => task.sourceModule !== null).length}</span>
            <span>Recherche: {search || 'Aucune'}</span>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
