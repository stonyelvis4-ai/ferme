'use client';

import { motion } from 'framer-motion';
import { CalendarDays, Leaf, Scissors, Sprout, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  createCropHarvest,
  createCropOperation,
  createFarmCrop,
  getFarm,
  getFarmCrops,
  getFarmPlots,
  type CropOperationView,
  type CropView,
  type HarvestView,
  type PlotView
} from '../../../../services/farm-client';

type CropFormState = {
  plotId: string;
  name: string;
  variety: string;
  cultivatedArea: number;
  cycleLabel: string;
  plantedAt: string;
  expectedHarvestAt: string;
  status: CropView['status'];
  expectedYield: number;
  notes: string;
};

const defaultCropForm: CropFormState = {
  plotId: '',
  name: '',
  variety: '',
  cultivatedArea: 1,
  cycleLabel: 'Saison principale',
  plantedAt: new Date().toISOString().slice(0, 10),
  expectedHarvestAt: '',
  status: 'ACTIVE',
  expectedYield: 0,
  notes: ''
};

function cropBadge(status: CropView['status']) {
  if (status === 'ACTIVE') {
    return 'success' as const;
  }

  if (status === 'HARVESTED') {
    return 'warning' as const;
  }

  return 'info' as const;
}

function operationBadge(status: CropOperationView['status']) {
  if (status === 'COMPLETED') {
    return 'success' as const;
  }

  if (status === 'CANCELED') {
    return 'critical' as const;
  }

  return 'warning' as const;
}

function harvestBadge(quality: NonNullable<HarvestView['quality']> | null | undefined) {
  if (quality === 'EXCELLENT' || quality === 'BONNE') {
    return 'success' as const;
  }

  if (quality === 'MOYENNE') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

const cropWorkflowSteps = [
  {
    title: 'Parcelle',
    description: 'Identifier la surface, la campagne et le point d’ancrage.',
    icon: Leaf
  },
  {
    title: 'Culture',
    description: 'Suivre le semis, l’état de croissance et le calendrier.',
    icon: Sprout
  },
  {
    title: 'Intervention',
    description: 'Planifier irrigation, traitement et opérations culturales.',
    icon: CalendarDays
  },
  {
    title: 'Récolte',
    description: 'Relier la récolte, les rendements et les revenus.',
    icon: TrendingUp
  }
] as const;

export default function FarmCropsPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [plots, setPlots] = useState<PlotView[]>([]);
  const [crops, setCrops] = useState<CropView[]>([]);
  const [operations, setOperations] = useState<CropOperationView[]>([]);
  const [harvests, setHarvests] = useState<HarvestView[]>([]);
  const [stats, setStats] = useState({
    totalCrops: 0,
    activeCrops: 0,
    plannedCrops: 0,
    harvestedCrops: 0,
    cultivatedArea: 0,
    expectedYield: 0,
    actualYield: 0,
    totalHarvestRevenue: 0
  });
  const [cropForm, setCropForm] = useState<CropFormState>(defaultCropForm);
  const [selectedCropId, setSelectedCropId] = useState('');
  const [operationForm, setOperationForm] = useState({
    operationType: 'IRRIGATION' as CropOperationView['operationType'],
    status: 'COMPLETED' as CropOperationView['status'],
    performedAt: new Date().toISOString().slice(0, 10),
    quantity: 0,
    unit: 'L',
    cost: 0,
    notes: ''
  });
  const [harvestForm, setHarvestForm] = useState({
    harvestedAt: new Date().toISOString().slice(0, 10),
    quantity: 0,
    unit: 'kg',
    quality: 'BONNE' as NonNullable<HarvestView['quality']>,
    revenue: 0,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string) {
    return Promise.all([getFarmPlots(activeFarmId, token), getFarmCrops(activeFarmId, token)]).then(
      ([plotResponse, cropResponse]) => {
        setPlots(plotResponse.items);
        setCrops(cropResponse.items);
        setOperations(cropResponse.operations);
        setHarvests(cropResponse.harvests);
        setStats(cropResponse.stats);
        setCropForm((current) => ({
          ...current,
          plotId: current.plotId || plotResponse.items[0]?.id || ''
        }));
        setSelectedCropId((current) => current || cropResponse.items[0]?.id || '');
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
      .then((farm) => setFarmName(farm.name))
      .catch(() => setFarmName(`Ferme ${farmId}`));

    refresh(farmId, session.token).catch(() => {
      setPlots([]);
      setCrops([]);
      setOperations([]);
      setHarvests([]);
    });
  }, [farmId, session?.token]);

  const latestOperation = useMemo(() => operations[0] ?? null, [operations]);
  const latestHarvest = useMemo(() => harvests[0] ?? null, [harvests]);
  const activePlotCount = plots.filter((plot) => plot.status === 'CULTIVATED').length;
  const restingPlotCount = plots.filter((plot) => plot.status === 'RESTING').length;

  function submitCrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createFarmCrop(
          farmId,
          {
            ...cropForm,
            variety: cropForm.variety || undefined,
            cycleLabel: cropForm.cycleLabel || undefined,
            expectedHarvestAt: cropForm.expectedHarvestAt || undefined,
            expectedYield: cropForm.expectedYield || undefined,
            notes: cropForm.notes || undefined
          },
          session.token
        );
        setCropForm((current) => ({ ...defaultCropForm, plotId: current.plotId }));
        await refresh(farmId, session.token);
        pushToast({
          title: 'Culture ajoutee',
          description: 'La campagne culturale a ete creee avec succes.',
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Creation impossible';
        setError(message);
        pushToast({
          title: 'Creation impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function submitOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !selectedCropId) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createCropOperation(
          farmId,
          {
            cropId: selectedCropId,
            operationType: operationForm.operationType,
            status: operationForm.status,
            performedAt: operationForm.performedAt,
            quantity: operationForm.quantity > 0 ? operationForm.quantity : undefined,
            unit: operationForm.unit.trim() || undefined,
            cost: operationForm.cost > 0 ? operationForm.cost : undefined,
            notes: operationForm.notes.trim() || undefined
          },
          session.token
        );
        setOperationForm((current) => ({ ...current, quantity: 0, cost: 0, notes: '' }));
        await refresh(farmId, session.token);
        pushToast({
          title: 'Operation ajoutee',
          description: `${operationForm.operationType} enregistree sur la culture.`,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Operation impossible';
        setError(message);
        pushToast({
          title: 'Operation impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function submitHarvest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !selectedCropId) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createCropHarvest(
          farmId,
          {
            cropId: selectedCropId,
            harvestedAt: harvestForm.harvestedAt,
            quantity: harvestForm.quantity,
            unit: harvestForm.unit,
            quality: harvestForm.quality,
            revenue: harvestForm.revenue > 0 ? harvestForm.revenue : undefined,
            notes: harvestForm.notes.trim() || undefined
          },
          session.token
        );
        setHarvestForm((current) => ({ ...current, quantity: 0, revenue: 0, notes: '' }));
        await refresh(farmId, session.token);
        pushToast({
          title: 'Recolte declaree',
          description: `${harvestForm.quantity} ${harvestForm.unit} ajoutes a l'historique.`,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Recolte impossible';
        setError(message);
        pushToast({
          title: 'Recolte impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  return (
    <AppShell title={`Cultures - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid">
        <article className="module-hero-card crops-hero-card">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Campagnes culturales</p>
              <h2 className="module-hero-title">{farmName}</h2>
            </div>
            <Badge variant={stats.activeCrops > 0 ? 'success' : 'warning'}>
              {stats.activeCrops > 0 ? `${stats.activeCrops} active(s)` : 'A lancer'}
            </Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            Une expérience plus executive pour lancer les cultures, suivre les interventions et
            consolider les récoltes depuis une seule vue.
          </p>
          <div className="module-pill-row">
            <span className="module-detail-chip">
              <Leaf className="h-4 w-4" />
              {stats.totalCrops} campagne(s)
            </span>
            <span className="module-detail-chip">
              <Sprout className="h-4 w-4" />
              {stats.cultivatedArea.toFixed(1)} ha exploités
            </span>
            <span className="module-detail-chip">
              <TrendingUp className="h-4 w-4" />
              {stats.actualYield.toFixed(1)} rendement cumulé
            </span>
          </div>
          <div className="module-kpi-grid crops-hero-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Leaf className="h-5 w-5" />
                </div>
                <Badge variant="success">Actives</Badge>
              </div>
              <strong>{stats.activeCrops}</strong>
              <span>cultures en cours de pilotage</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Sprout className="h-5 w-5" />
                </div>
                <Badge variant="info">Parcelles</Badge>
              </div>
              <strong>{activePlotCount}</strong>
              <span>parcelles actuellement cultivees</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <Badge variant="warning">Repos</Badge>
              </div>
              <strong>{restingPlotCount}</strong>
              <span>parcelles en repos ou maintenance</span>
            </article>
          </div>
          <div className="module-kpi-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Leaf className="h-5 w-5" />
                </div>
                <Badge variant="success">Cultures</Badge>
              </div>
              <strong>{stats.activeCrops}</strong>
              <span>culture(s) en cours de production ou de suivi</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <Badge variant="info">Opérations</Badge>
              </div>
              <strong>{operations.length}</strong>
              <span>intervention(s) historisées sur les campagnes</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <Badge variant="warning">Récoltes</Badge>
              </div>
              <strong>{harvests.length}</strong>
              <span>{stats.totalHarvestRevenue.toFixed(0)} de revenus déclarés</span>
            </article>
          </div>
        </article>

        <article className="module-spotlight-card crops-spotlight-card">
          <div className="module-card-top">
            <p className="eyebrow">Focus production</p>
            <Badge variant="neutral">{plots.length} parcelle(s)</Badge>
          </div>
          <h2>Priorités du cycle cultural</h2>
          <div className="module-detail-list">
            <span>
              Dernière opération: {latestOperation ? latestOperation.operationType : 'Aucune'}
            </span>
            <span>
              Dernière récolte: {latestHarvest ? `${latestHarvest.quantity} ${latestHarvest.unit}` : 'Aucune'}
            </span>
            <span>Rendement attendu: {stats.expectedYield.toFixed(1)}</span>
          </div>
          <div className="module-detail-list module-focus-strip">
            <span>Parcelles actives: {activePlotCount}</span>
            <span>Parcelles au repos: {restingPlotCount}</span>
            <span>Revenu total recoltes: {stats.totalHarvestRevenue.toFixed(1)}</span>
          </div>
          <p>
            Les formulaires sont découpés pour faciliter la saisie terrain: une zone pour la campagne,
            une zone pour les opérations et une zone pour la récolte.
          </p>
        </article>
      </section>

      <section className="module-flow-strip">
        {cropWorkflowSteps.map((step, index) => {
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
              <span>{step.description}</span>
            </article>
          );
        })}
      </section>

      <section className="module-action-grid">
        <article className="module-form-card crops-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouvelle culture</p>
              <h2>Lancer une campagne culturale</h2>
            </div>
            <div className="farm-module-icon">
              <Sprout className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitCrop}>
            <div className="field-grid">
              <label className="field">
                <span>Parcelle</span>
                <select
                  value={cropForm.plotId}
                  onChange={(event) => setCropForm((current) => ({ ...current, plotId: event.target.value }))}
                >
                  <option value="">Sélectionner</option>
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.name} ({plot.surfaceArea} ha)
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Culture</span>
                <input value={cropForm.name} onChange={(event) => setCropForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Variété</span>
                <input value={cropForm.variety} onChange={(event) => setCropForm((current) => ({ ...current, variety: event.target.value }))} />
              </label>
              <label className="field">
                <span>Surface</span>
                <input type="number" value={cropForm.cultivatedArea} onChange={(event) => setCropForm((current) => ({ ...current, cultivatedArea: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Cycle</span>
                <input value={cropForm.cycleLabel} onChange={(event) => setCropForm((current) => ({ ...current, cycleLabel: event.target.value }))} />
              </label>
              <label className="field">
                <span>Plantation</span>
                <input type="date" value={cropForm.plantedAt} onChange={(event) => setCropForm((current) => ({ ...current, plantedAt: event.target.value }))} />
              </label>
              <label className="field">
                <span>Récolte prévue</span>
                <input type="date" value={cropForm.expectedHarvestAt} onChange={(event) => setCropForm((current) => ({ ...current, expectedHarvestAt: event.target.value }))} />
              </label>
              <label className="field">
                <span>Statut</span>
                <select value={cropForm.status} onChange={(event) => setCropForm((current) => ({ ...current, status: event.target.value as CropView['status'] }))}>
                  <option value="PLANNED">Planifiée</option>
                  <option value="ACTIVE">Active</option>
                  <option value="HARVESTED">Récoltée</option>
                  <option value="ARCHIVED">Archivée</option>
                </select>
              </label>
              <label className="field">
                <span>Rendement attendu</span>
                <input type="number" value={cropForm.expectedYield} onChange={(event) => setCropForm((current) => ({ ...current, expectedYield: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Notes</span>
                <input value={cropForm.notes} onChange={(event) => setCropForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="module-inline-note">
              <span>Chaque campagne s'appuie sur une parcelle déjà enregistrée.</span>
              {session?.user.role === 'ADMIN' ? (
                <Button className="module-submit-button" type="submit" disabled={isPending || !cropForm.plotId}>
                  Ajouter la culture
                </Button>
              ) : (
                <Badge variant="warning">Lecture seule</Badge>
              )}
            </div>
          </form>
        </article>

        <article className="module-form-card crops-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Interventions et récoltes</p>
              <h2>Historiser les opérations</h2>
            </div>
            <div className="farm-module-icon">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <div className="stack-form">
            <label className="field">
              <span>Culture cible</span>
              <select value={selectedCropId} onChange={(event) => setSelectedCropId(event.target.value)}>
                <option value="">Sélectionner</option>
                {crops.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name} - {crop.plotName}
                  </option>
                ))}
              </select>
            </label>
            <form className="stack-form" onSubmit={submitOperation}>
              <div className="field-grid">
                <label className="field">
                  <span>Operation</span>
                  <select value={operationForm.operationType} onChange={(event) => setOperationForm((current) => ({ ...current, operationType: event.target.value as CropOperationView['operationType'] }))}>
                  <option value="PREPARATION_SOL">Préparation du sol</option>
                    <option value="SEMIS">Semis</option>
                    <option value="IRRIGATION">Irrigation</option>
                    <option value="FERTILISATION">Fertilisation</option>
                    <option value="TRAITEMENT">Traitement</option>
                    <option value="DESHERBAGE">Désherbage</option>
                    <option value="ENTRETIEN">Entretien</option>
                    <option value="RECOLTE">Récolte</option>
                  </select>
                </label>
                <label className="field">
                  <span>Statut</span>
                  <select value={operationForm.status} onChange={(event) => setOperationForm((current) => ({ ...current, status: event.target.value as CropOperationView['status'] }))}>
                    <option value="COMPLETED">Terminée</option>
                    <option value="PLANNED">Planifiée</option>
                    <option value="CANCELED">Annulée</option>
                  </select>
                </label>
                <label className="field">
                  <span>Date</span>
                  <input type="date" value={operationForm.performedAt} onChange={(event) => setOperationForm((current) => ({ ...current, performedAt: event.target.value }))} />
                </label>
                <label className="field">
              <span>Quantité</span>
                  <input type="number" value={operationForm.quantity} onChange={(event) => setOperationForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Unité</span>
                  <input value={operationForm.unit} onChange={(event) => setOperationForm((current) => ({ ...current, unit: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Coût</span>
                  <input type="number" value={operationForm.cost} onChange={(event) => setOperationForm((current) => ({ ...current, cost: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <input value={operationForm.notes} onChange={(event) => setOperationForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                <span>Enregistre les passages terrain, intrants, soins et entretiens.</span>
                {session?.user.role === 'ADMIN' ? (
                  <Button
                    className="module-submit-button"
                    variant="secondary"
                    type="submit"
                    disabled={isPending || !selectedCropId}
                  >
                    Ajouter l'opération
                  </Button>
                ) : (
                  <Badge variant="warning">Lecture seule</Badge>
                )}
              </div>
            </form>

            <form className="stack-form" onSubmit={submitHarvest}>
              <div className="field-grid">
                <label className="field">
              <span>Récolte</span>
                  <input type="date" value={harvestForm.harvestedAt} onChange={(event) => setHarvestForm((current) => ({ ...current, harvestedAt: event.target.value }))} />
                </label>
                <label className="field">
                <span>Quantité</span>
                  <input type="number" value={harvestForm.quantity} onChange={(event) => setHarvestForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Unité</span>
                  <input value={harvestForm.unit} onChange={(event) => setHarvestForm((current) => ({ ...current, unit: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Qualite</span>
                  <select value={harvestForm.quality} onChange={(event) => setHarvestForm((current) => ({ ...current, quality: event.target.value as NonNullable<HarvestView['quality']> }))}>
                    <option value="EXCELLENT">Excellente</option>
                    <option value="BONNE">Bonne</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="FAIBLE">Faible</option>
                  </select>
                </label>
                <label className="field">
                <span>Revenu</span>
                  <input type="number" value={harvestForm.revenue} onChange={(event) => setHarvestForm((current) => ({ ...current, revenue: Number(event.target.value) }))} />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <input value={harvestForm.notes} onChange={(event) => setHarvestForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
              </div>
              <div className="module-inline-note">
                  <span>La récolte alimente directement les indicateurs de production et de revenu.</span>
                {session?.user.role === 'ADMIN' ? (
                  <Button
                    className="module-submit-button"
                    type="submit"
                    disabled={isPending || !selectedCropId || harvestForm.quantity <= 0}
                  >
                    Déclarer la récolte
                  </Button>
                ) : (
                  <Badge variant="warning">Lecture seule</Badge>
                )}
              </div>
            </form>
          </div>
        </article>
      </section>

      <section className="module-catalog-grid">
        {crops.length ? (
          crops.map((crop, index) => (
            <motion.article
              key={crop.id}
              className="module-catalog-card crops-catalog-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="module-card-top">
                <p className="eyebrow">{crop.plotName}</p>
                <Badge variant={cropBadge(crop.status)}>{crop.status}</Badge>
              </div>
              <h2>{crop.name}</h2>
              <p>{crop.variety || 'Variété non précisée'}</p>
              <div className="module-detail-list">
                <span>Surface: {crop.cultivatedArea} ha</span>
                <span>Cycle: {crop.cycleLabel || '-'}</span>
                <span>Plantée le: {new Date(crop.plantedAt).toLocaleDateString('fr-FR')}</span>
                <span>Rendement: {(crop.actualYield ?? 0).toFixed(1)} / {(crop.expectedYield ?? 0).toFixed(1)}</span>
              </div>
            </motion.article>
          ))
        ) : (
          <article className="module-catalog-card crops-catalog-card module-empty-card">
            <div>
              <p className="eyebrow">Démarrage</p>
              <h2>Aucune culture enregistree</h2>
              <p>Commence par creer une parcelle puis lance une premiere culture.</p>
            </div>
          </article>
        )}
      </section>

      <section className="module-split-grid">
        <article className="module-list-card crops-list-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Operations recentes</p>
              <h2>Calendrier cultural</h2>
            </div>
            <div className="farm-module-icon">
              <Scissors className="h-5 w-5" />
            </div>
          </div>
          {operations.length ? (
            <div className="table-list crops-table-list">
              {operations.map((operation) => (
                <article key={operation.id} className="table-row crops-table-row">
                  <span className="crops-row-title">{operation.operationType}</span>
                  <Badge variant={operationBadge(operation.status)}>{operation.status}</Badge>
                  <span>{operation.cropName}</span>
                  <span>{new Date(operation.performedAt).toLocaleDateString('fr-FR')}</span>
                  <span>{operation.notes || 'Sans note'}</span>
                </article>
              ))}
            </div>
          ) : (
              <p>Aucune opération enregistrée.</p>
          )}
        </article>

        <article className="module-list-card crops-list-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Historique des récoltes</p>
              <h2>Production et revenus</h2>
            </div>
            <div className="farm-module-icon">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          {harvests.length ? (
            <div className="table-list crops-table-list">
              {harvests.map((harvest) => (
                <article key={harvest.id} className="table-row crops-table-row">
                  <span className="crops-row-title">{harvest.cropName}</span>
                  <Badge variant={harvestBadge(harvest.quality)}>{harvest.quality ?? 'NC'}</Badge>
                  <span>{harvest.quantity} {harvest.unit}</span>
                  <span>{harvest.revenue ?? 0}</span>
                  <span>{new Date(harvest.harvestedAt).toLocaleDateString('fr-FR')}</span>
                </article>
              ))}
            </div>
          ) : (
              <p>Aucune récolte déclarée pour le moment.</p>
          )}
        </article>
      </section>
    </AppShell>
  );
}
