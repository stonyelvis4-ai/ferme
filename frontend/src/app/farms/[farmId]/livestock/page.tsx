'use client';

import { motion } from 'framer-motion';
import { Activity, HeartPulse, PawPrint, ShieldAlert, Stethoscope, Wheat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { cn } from '../../../../lib/cn';
import { useSession } from '../../../../hooks/use-session';
import {
  createAnimalEvent,
  createAnimalGroup,
  getFarm,
  getFarmAgenda,
  getFarmAnimalEvents,
  getFarmAnimalGroups,
  type AgendaTaskView,
  type AgendaViewResponse,
  type FarmSummary,
  type AnimalEventView,
  type AnimalGroupView
} from '../../../../services/farm-client';

type AnimalFormState = {
  trackingMode: AnimalGroupView['trackingMode'];
  identificationNumber: string;
  name: string;
  species: string;
  subtype: string;
  breed: string;
  sex: AnimalGroupView['sex'];
  birthDate: string;
  currentWeight: number;
  initialCount: number;
  currentCount: number;
};

const defaultAnimalForm: AnimalFormState = {
  trackingMode: 'LOT',
  identificationNumber: '',
  name: '',
  species: 'Volaille',
  subtype: 'Pondeuses',
  breed: 'Locale',
  sex: 'MIXTE',
  birthDate: new Date().toISOString().slice(0, 10),
  currentWeight: 0,
  initialCount: 20,
  currentCount: 20
};

const eventTypeOptions: Array<AnimalEventView['eventType']> = [
  'NAISSANCE',
  'ACHAT',
  'VENTE',
  'DECES',
  'REPRODUCTION',
  'VACCINATION',
  'TRAITEMENT',
  'PESEE',
  'PRODUCTION'
];

const eventTypeLabels: Record<AnimalEventView['eventType'], string> = {
  NAISSANCE: 'Naissance',
  ACHAT: 'Achat',
  VENTE: 'Vente',
  DECES: 'Décès',
  REPRODUCTION: 'Reproduction',
  VACCINATION: 'Vaccination',
  TRAITEMENT: 'Traitement',
  PESEE: 'Pesée',
  PRODUCTION: 'Production'
};

const fishLotPreset: AnimalFormState = {
  trackingMode: 'LOT',
  identificationNumber: '',
  name: '',
  species: 'Poisson',
  subtype: 'Tilapia',
  breed: 'Nilotica',
  sex: 'MIXTE',
  birthDate: new Date().toISOString().slice(0, 10),
  currentWeight: 0,
  initialCount: 500,
  currentCount: 500
};

function animalStatusBadge(status: string) {
  if (status === 'ACTIF') {
    return 'success' as const;
  }

  if (status === 'SURVEILLANCE') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

function eventBadge(eventType: AnimalEventView['eventType']) {
  if (eventType === 'VACCINATION' || eventType === 'TRAITEMENT' || eventType === 'PESEE') {
    return 'info' as const;
  }

  if (eventType === 'DECES' || eventType === 'VENTE') {
    return 'warning' as const;
  }

  return 'success' as const;
}

function taskBadge(status: AgendaTaskView['status']) {
  if (status === 'EN_RETARD') {
    return 'critical' as const;
  }

  if (status === 'TERMINEE') {
    return 'success' as const;
  }

  if (status === 'EN_COURS') {
    return 'info' as const;
  }

  if (status === 'ANNULEE') {
    return 'neutral' as const;
  }

  return 'warning' as const;
}

export default function LivestockPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [farmActivityType, setFarmActivityType] = useState<FarmSummary['activityType']>('MIXTE');
  const [animals, setAnimals] = useState<AnimalGroupView[]>([]);
  const [events, setEvents] = useState<AnimalEventView[]>([]);
  const [animalForm, setAnimalForm] = useState(defaultAnimalForm);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [agenda, setAgenda] = useState<AgendaViewResponse | null>(null);
  const [eventForm, setEventForm] = useState({
    eventTypes: ['VACCINATION'] as AnimalEventView['eventType'][],
    eventDate: new Date().toISOString().slice(0, 10),
    quantity: 1,
    weight: 0,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string) {
    return Promise.all([getFarmAnimalGroups(activeFarmId, token), getFarmAnimalEvents(activeFarmId, token)]).then(
      ([animalResponse, eventResponse]) => {
        setAnimals(animalResponse.items);
        setEvents(eventResponse.items);
        setSelectedAnimalId((current) => current || animalResponse.items[0]?.id || '');
      }
    );
  }

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    getFarm(farmId, session.token)
      .then((farm) => {
        setFarmName(farm.name);
        setFarmActivityType(farm.activityType);
        if (farm.activityType === 'PISCICULTURE') {
          setAnimalForm((current) => (current.identificationNumber || current.name ? current : fishLotPreset));
        }
      })
      .catch(() => setFarmName(`Ferme ${farmId}`));

    refresh(farmId, session.token).catch(() => {
      setAnimals([]);
      setEvents([]);
    });

    getFarmAgenda(farmId, session.token)
      .then((response) => setAgenda(response))
      .catch(() => setAgenda(null));
  }, [farmId, session?.token]);

  const linkedTasks = useMemo(() => {
    const allTasks: AgendaTaskView[] = [
      ...(agenda?.today ?? []),
      ...(agenda?.upcoming ?? []),
      ...(agenda?.overdue ?? []),
      ...(agenda?.completed ?? []),
      ...(agenda?.cancelled ?? [])
    ];

    return allTasks
      .filter((task) => task.linkedModule === 'livestock' || task.sourceModule === 'livestock')
      .slice(0, 5);
  }, [agenda]);

  const workflowSteps = useMemo(() => {
    if (farmActivityType === 'PISCICULTURE') {
      return [
        { title: 'Bassin', icon: PawPrint },
        { title: 'Croissance', icon: Activity },
        { title: 'Agenda', icon: Stethoscope },
        { title: 'Rentabilité', icon: HeartPulse }
      ];
    }

    return [
      { title: 'Lot', icon: PawPrint },
      { title: 'Mouvement', icon: Stethoscope },
      { title: 'Agenda', icon: Activity },
      { title: 'Suivi', icon: HeartPulse }
    ];
  }, [farmActivityType]);

  function openAgendaComposer() {
    if (!farmId) {
      return;
    }

    router.push(
      `/farms/${farmId}/agenda?compose=1&module=livestock&entityType=${farmActivityType === 'PISCICULTURE' ? 'BASSIN' : 'LOT'}`
    );
  }

  const metrics = useMemo(() => {
    const activeAnimals = animals.filter((animal) => animal.status === 'ACTIF');
    const surveillanceAnimals = animals.filter((animal) => animal.status !== 'ACTIF');
    const totalHeads = animals.reduce((total, animal) => total + (animal.currentCount ?? 1), 0);
    const sanitaryEvents = events.filter(
      (event) => event.eventType === 'VACCINATION' || event.eventType === 'TRAITEMENT'
    );

    return {
      activeAnimals: activeAnimals.length,
      surveillanceAnimals: surveillanceAnimals.length,
      totalHeads,
      sanitaryEvents: sanitaryEvents.length
    };
  }, [animals, events]);

  function submitAnimal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createAnimalGroup(
          farmId,
          {
            ...animalForm,
            currentWeight: animalForm.currentWeight || undefined,
            initialCount: animalForm.trackingMode === 'LOT' ? animalForm.initialCount : 1,
            currentCount: animalForm.trackingMode === 'LOT' ? animalForm.currentCount : 1
          },
          session.token
        );
        setAnimalForm(farmActivityType === 'PISCICULTURE' ? fishLotPreset : defaultAnimalForm);
        await refresh(farmId, session.token);
        pushToast({
          title: 'Elevage mis a jour',
          description: 'Le nouveau lot ou animal a ete ajoute avec succes.',
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Création impossible';
        setError(message);
        pushToast({
          title: 'Création impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !selectedAnimalId) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createAnimalEvent(
          farmId,
          {
            animalGroupId: selectedAnimalId,
            eventTypes: eventForm.eventTypes,
            eventDate: eventForm.eventDate,
            quantity:
              eventForm.eventTypes.some((eventType) => eventType === 'PESEE' || eventType === 'VACCINATION')
                ? undefined
                : eventForm.quantity,
            weight: eventForm.weight || undefined,
            notes: eventForm.notes
          },
          session.token
        );
        setEventForm((current) => ({ ...current, notes: '', quantity: 1, weight: 0 }));
        await refresh(farmId, session.token);
        pushToast({
          title: 'Evenement enregistre',
          description: `${eventForm.eventTypes.length} type(s) ajoute(s) au journal d'elevage.`,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Enregistrement impossible';
        setError(message);
        pushToast({
          title: 'Enregistrement impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  return (
    <AppShell title={`${farmActivityType === 'PISCICULTURE' ? 'Pisciculture' : 'Elevage'} - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid livestock-hero-grid">
        <article className="module-hero-card livestock-hero-card">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Pilotage elevage</p>
              <h2 className="module-hero-title">{farmName}</h2>
            </div>
            <Badge variant={metrics.surveillanceAnimals > 0 ? 'warning' : 'success'}>
              {metrics.surveillanceAnimals > 0 ? `${metrics.surveillanceAnimals} a surveiller` : 'Cheptel stable'}
            </Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            {farmActivityType === 'PISCICULTURE'
              ? "Un poste de commande clair pour suivre les lots de poissons, les bassins, les mouvements et les signaux sanitaires."
              : 'Un poste de commande clair pour suivre les lots, enregistrer les mouvements et garder une lecture immediate du sanitaire.'}
          </p>
          <div className="module-pill-row">
            <span className="module-detail-chip">
              <PawPrint className="h-4 w-4" />
              {farmActivityType === 'PISCICULTURE'
                ? `${animals.length} lot(s) piscicoles`
                : `${animals.length} lot(s) ou animal(aux)`}
            </span>
            <span className="module-detail-chip">
              <HeartPulse className="h-4 w-4" />
              {metrics.sanitaryEvents} action(s) sanitaires
            </span>
            <span className="module-detail-chip">
              <Wheat className="h-4 w-4" />
              {farmActivityType === 'PISCICULTURE'
                ? `${metrics.totalHeads} poisson(s) suivi(s)`
                : `${metrics.totalHeads} tete(s) suivie(s)`}
            </span>
          </div>
          <div className="module-kpi-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Activity className="h-5 w-5" />
                </div>
                <Badge variant="success">Actifs</Badge>
              </div>
              <strong>{metrics.activeAnimals}</strong>
              <span>
                {farmActivityType === 'PISCICULTURE'
                  ? 'lots piscicoles actuellement exploitables'
                  : 'lots ou animaux actuellement exploitables'}
              </span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <Badge variant={metrics.surveillanceAnimals > 0 ? 'warning' : 'success'}>Sanitaire</Badge>
              </div>
              <strong>{metrics.surveillanceAnimals}</strong>
              <span>groupe(s) avec un statut hors normal</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <Badge variant="info">Historique</Badge>
              </div>
              <strong>{events.length}</strong>
              <span>Événement(s) consigné(s) pour la traçabilité</span>
            </article>
          </div>
        </article>

        <article className="module-spotlight-card livestock-spotlight-card">
          <div className="module-card-top">
            <p className="eyebrow">Cadence du jour</p>
            <Badge variant="neutral">Equipe {session?.user.role ?? 'OPERATEUR'}</Badge>
          </div>
          <h2>Saisie terrain rapide</h2>
          <p>
            {farmActivityType === 'PISCICULTURE'
              ? "Les formulaires ci-dessous servent à ouvrir un nouveau lot de poissons, enregistrer un contrôle, une mortalité, une pesée ou une production sans quitter la page."
              : 'Les formulaires ci-dessous servent à ouvrir un nouveau lot, enregistrer un soin, une pesée ou tout autre événement sans quitter la page.'}
          </p>
          <div className="module-detail-list">
            <span>
              {farmActivityType === 'PISCICULTURE'
                ? 'Sélection intelligente du premier bassin ou lot disponible'
                : 'Sélection intelligente du premier lot disponible'}
            </span>
            <span>Historique récent visible en bas de page</span>
            <span>
              {farmActivityType === 'PISCICULTURE'
                ? "Structure prête pour l’alimentation, la biomasse et les mortalités"
                : 'Structure prête pour le sanitaire, la production et la vente'}
            </span>
          </div>
          <div className="module-inline-actions">
            <Button
              className="module-submit-button production-action-button production-action-button-primary"
              type="button"
              onClick={openAgendaComposer}
            >
              Planifier une tâche
            </Button>
            <Button
              className="module-submit-button production-action-button production-action-button-secondary"
              type="button"
              variant="secondary"
              onClick={() => router.push(`/farms/${farmId}/agenda`)}
            >
              Voir l’agenda
            </Button>
          </div>
        </article>
      </section>

      <section className="module-flow-strip livestock-flow-strip">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article key={step.title} className="module-flow-card">
              <div className="module-card-top">
                <span className="module-flow-index">0{index + 1}</span>
                <Badge variant="neutral">{step.title}</Badge>
              </div>
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="module-action-grid">
        <article className="module-form-card livestock-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">
                {farmActivityType === 'PISCICULTURE' ? 'Nouveau lot piscicole' : 'Nouveau lot / animal'}
              </p>
              <h2>
                {farmActivityType === 'PISCICULTURE'
                  ? 'Ajouter un lot de poissons'
                  : 'Ajouter une unité d’élevage'}
              </h2>
            </div>
            <div className="farm-module-icon">
              <PawPrint className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitAnimal}>
            <div className="field-grid">
              <label className="field">
                <span>Mode</span>
                <select
                  value={animalForm.trackingMode}
                  onChange={(input) =>
                    setAnimalForm((current) => ({
                      ...current,
                      trackingMode: input.target.value as AnimalGroupView['trackingMode']
                    }))
                  }
                >
                  <option value="LOT">Lot</option>
                  <option value="INDIVIDUAL">Individuel</option>
                </select>
              </label>
              <label className="field">
                <span>Référence</span>
                <input
                  value={animalForm.identificationNumber}
                  onChange={(input) =>
                    setAnimalForm((current) => ({ ...current, identificationNumber: input.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Nom</span>
                <input
                  value={animalForm.name}
                  onChange={(input) => setAnimalForm((current) => ({ ...current, name: input.target.value }))}
                />
              </label>
              <label className="field">
                <span>Espece</span>
                {farmActivityType === 'PISCICULTURE' ? (
                  <select
                    value={animalForm.species}
                    onChange={(input) => setAnimalForm((current) => ({ ...current, species: input.target.value }))}
                  >
                    <option value="Poisson">Poisson</option>
                    <option value="Tilapia">Tilapia</option>
                    <option value="Silure">Silure</option>
                    <option value="Carpe">Carpe</option>
                  </select>
                ) : (
                  <input
                    value={animalForm.species}
                    onChange={(input) => setAnimalForm((current) => ({ ...current, species: input.target.value }))}
                  />
                )}
              </label>
              <label className="field">
                <span>Sous-type</span>
                {farmActivityType === 'PISCICULTURE' ? (
                  <select
                    value={animalForm.subtype}
                    onChange={(input) => setAnimalForm((current) => ({ ...current, subtype: input.target.value }))}
                  >
                    <option value="Tilapia">Tilapia</option>
                    <option value="Alevins">Alevins</option>
                    <option value="Grossissement">Grossissement</option>
                    <option value="Reproducteurs">Reproducteurs</option>
                  </select>
                ) : (
                  <input
                    value={animalForm.subtype}
                    onChange={(input) => setAnimalForm((current) => ({ ...current, subtype: input.target.value }))}
                  />
                )}
              </label>
              <label className="field">
                <span>Race</span>
                <input
                  value={animalForm.breed}
                  onChange={(input) => setAnimalForm((current) => ({ ...current, breed: input.target.value }))}
                />
              </label>
              <label className="field">
                <span>Sexe</span>
                <select
                  value={animalForm.sex}
                  onChange={(input) =>
                    setAnimalForm((current) => ({
                      ...current,
                      sex: input.target.value as AnimalGroupView['sex']
                    }))
                  }
                >
                  <option value="MIXTE">Mixte</option>
                  <option value="FEMALE">Femelle</option>
                  <option value="MALE">Male</option>
                  <option value="INCONNU">Inconnu</option>
                </select>
              </label>
              <label className="field">
                <span>Naissance</span>
                <input
                  type="date"
                  value={animalForm.birthDate}
                  onChange={(input) => setAnimalForm((current) => ({ ...current, birthDate: input.target.value }))}
                />
              </label>
              <label className="field">
                <span>Poids actuel</span>
                <input
                  type="number"
                  value={animalForm.currentWeight}
                  onChange={(input) =>
                    setAnimalForm((current) => ({ ...current, currentWeight: Number(input.target.value) }))
                  }
                />
              </label>
              {animalForm.trackingMode === 'LOT' ? (
                <>
                  <label className="field">
                    <span>Effectif initial</span>
                    <input
                      type="number"
                      value={animalForm.initialCount}
                      onChange={(input) =>
                        setAnimalForm((current) => ({ ...current, initialCount: Number(input.target.value) }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Effectif actuel</span>
                    <input
                      type="number"
                      value={animalForm.currentCount}
                      onChange={(input) =>
                        setAnimalForm((current) => ({ ...current, currentCount: Number(input.target.value) }))
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
            <div className="module-inline-note">
              <span>
                {farmActivityType === 'PISCICULTURE'
                  ? 'Chaque creation alimente ensuite le suivi des bassins, du sanitaire et de la production.'
                  : 'Chaque creation alimente ensuite le suivi sanitaire et les mouvements.'}
              </span>
              {session?.user.role === 'ADMIN' ? (
                <Button className="module-submit-button" type="submit" disabled={isPending}>
                  Ajouter a l'elevage
                </Button>
              ) : (
                <Badge variant="warning">Lecture seule</Badge>
              )}
            </div>
          </form>
        </article>

        <article className="module-form-card livestock-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Evenement d'elevage</p>
              <h2>Consigner un mouvement ou un soin</h2>
            </div>
            <div className="farm-module-icon">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitEvent}>
            <div className="field-grid">
              <label className="field">
                <span>Animal / lot</span>
                <select value={selectedAnimalId} onChange={(input) => setSelectedAnimalId(input.target.value)}>
                  <option value="">Sélectionner</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.identificationNumber} - {animal.species}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Types de mouvements</span>
                <div className="event-type-grid">
                  {eventTypeOptions.map((eventType) => {
                    const isSelected = eventForm.eventTypes.includes(eventType);
                    return (
                      <button
                        key={eventType}
                        type="button"
                        className={cn('event-type-chip livestock-event-chip', isSelected && 'event-type-chip-active')}
                        onClick={() =>
                          setEventForm((current) => ({
                            ...current,
                            eventTypes: isSelected
                              ? current.eventTypes.filter((item) => item !== eventType)
                              : [...current.eventTypes, eventType]
                          }))
                        }
                      >
                        {eventTypeLabels[eventType]}
                      </button>
                    );
                  })}
                </div>
              </label>
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={eventForm.eventDate}
                  onChange={(input) => setEventForm((current) => ({ ...current, eventDate: input.target.value }))}
                />
              </label>
              <label className="field">
                <span>Quantite</span>
                <input
                  type="number"
                  value={eventForm.quantity}
                  onChange={(input) => setEventForm((current) => ({ ...current, quantity: Number(input.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Poids</span>
                <input
                  type="number"
                  value={eventForm.weight}
                  onChange={(input) => setEventForm((current) => ({ ...current, weight: Number(input.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <input
                  value={eventForm.notes}
                  onChange={(input) => setEventForm((current) => ({ ...current, notes: input.target.value }))}
                />
              </label>
            </div>
            <div className="module-detail-list event-type-summary">
              {eventForm.eventTypes.map((eventType) => (
                <span key={eventType}>{eventTypeLabels[eventType]}</span>
              ))}
            </div>
            <div className="module-inline-note">
              <span>Ideal pour vaccins, ventes, pesees et incidents terrain.</span>
              {session?.user.role === 'ADMIN' ? (
                <Button
                  className="module-submit-button"
                  variant="secondary"
                  type="submit"
                  disabled={isPending || !selectedAnimalId}
                >
                  Enregistrer l’événement
                </Button>
              ) : (
                <Badge variant="warning">Lecture seule</Badge>
              )}
            </div>
          </form>
        </article>
      </section>

      <section className="module-list-card livestock-tasks-card">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Tâches liées</p>
            <h2>Actions opérationnelles du module</h2>
          </div>
          <Badge variant={linkedTasks.length ? 'info' : 'neutral'}>{linkedTasks.length}</Badge>
        </div>
        {linkedTasks.length ? (
          <div className="table-list livestock-table-list">
            {linkedTasks.map((task) => (
              <article key={task.id} className="table-row module-task-row livestock-table-row">
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.linkedEntityLabel ?? task.linkedModule ?? 'Module élevage'} - {task.category}
                  </span>
                </div>
                <span>{task.scheduledLabel}</span>
                <Badge variant={taskBadge(task.status)}>{task.status}</Badge>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Aucune tâche liée à ce module pour le moment.</p>
        )}
      </section>

      <section className="module-catalog-grid livestock-catalog-grid">
        {animals.length ? (
          animals.map((animal, index) => (
            <motion.article
              key={animal.id}
              className="module-catalog-card livestock-catalog-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="module-card-top">
                <p className="eyebrow">
                  {animal.species} - {animal.trackingMode}
                </p>
                <Badge variant={animalStatusBadge(animal.status)}>{animal.status}</Badge>
              </div>
              <h2>{animal.name || animal.identificationNumber}</h2>
              <p>
                {animal.subtype} - {animal.breed} - {animal.sex}
              </p>
              <div className="module-detail-list">
                <span>Âge : {animal.currentAgeDays} jours</span>
                <span>Poids : {animal.currentWeight ?? '-'} kg</span>
                <span>Effectif : {animal.currentCount ?? 1}</span>
                <span>Référence : {animal.identificationNumber || 'Non renseignée'}</span>
              </div>
            </motion.article>
          ))
        ) : (
          <article className="module-catalog-card module-empty-card">
            <div>
              <p className="eyebrow">Démarrage</p>
              <h2>Aucun animal ou lot enregistré</h2>
              <p>Créez un premier lot pour activer le suivi sanitaire, la production et la traçabilité.</p>
            </div>
          </article>
        )}
      </section>

      <section className="module-list-card livestock-history-card">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Historique récent</p>
            <h2>Journal des événements</h2>
          </div>
          <Badge variant="info">{events.length} entree(s)</Badge>
        </div>
        {events.length ? (
          <div className="table-list livestock-table-list">
            {events.map((event) => (
              <article key={event.id} className="table-row livestock-event-row">
                <Badge variant={eventBadge(event.eventType)}>{event.eventType}</Badge>
                <strong>{new Date(event.eventDate).toLocaleDateString('fr-FR')}</strong>
                <span>Quantité : {event.quantity ?? '-'}</span>
                <span>Poids : {event.weight ?? '-'}</span>
                <span>{event.notes || 'Sans note'}</span>
                <span>Par {event.recordedByUserName}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>Aucun événement enregistré pour le moment.</p>
        )}
      </section>
    </AppShell>
  );
}

