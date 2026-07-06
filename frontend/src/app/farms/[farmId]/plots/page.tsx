'use client';

import { motion } from 'framer-motion';
import { Layers2, MapPinned, Sprout, Waves } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import { createFarmPlot, getFarm, getFarmPlots, type PlotView } from '../../../../services/farm-client';

const plotWorkflowSteps = [
  {
    title: 'Parcelle',
    description: 'Nommer, localiser et dimensionner la zone.',
    icon: MapPinned
  },
  {
    title: 'Rotation',
    description: 'Contrôler les périodes actives et de repos.',
    icon: Waves
  },
  {
    title: 'Culture',
    description: 'Relier la parcelle à une campagne concrète.',
    icon: Sprout
  },
  {
    title: 'Disponibilité',
    description: 'Visualiser rapidement les zones prêtes à l’emploi.',
    icon: Layers2
  }
] as const;

type PlotFormState = {
  name: string;
  location: string;
  surfaceArea: number;
  soilType: string;
  irrigationType: string;
  status: PlotView['status'];
  notes: string;
};

const defaultPlotForm: PlotFormState = {
  name: '',
  location: '',
  surfaceArea: 1,
  soilType: 'Argilo-limoneux',
  irrigationType: 'Goutte a goutte',
  status: 'AVAILABLE',
  notes: ''
};

function plotBadge(status: PlotView['status']) {
  if (status === 'CULTIVATED') {
    return 'success' as const;
  }

  if (status === 'RESTING' || status === 'MAINTENANCE') {
    return 'warning' as const;
  }

  return 'info' as const;
}

export default function FarmPlotsPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [plots, setPlots] = useState<PlotView[]>([]);
  const [stats, setStats] = useState({
    totalPlots: 0,
    totalSurfaceArea: 0,
    cultivatedPlots: 0,
    restingPlots: 0
  });
  const [form, setForm] = useState<PlotFormState>(defaultPlotForm);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string) {
    return getFarmPlots(activeFarmId, token).then((response) => {
      setPlots(response.items);
      setStats(response.stats);
    });
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

    refresh(farmId, session.token).catch(() => setPlots([]));
  }, [farmId, session?.token]);

  const availablePlots = useMemo(() => plots.filter((plot) => plot.status === 'AVAILABLE').length, [plots]);

  function submitPlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createFarmPlot(
          farmId,
          {
            ...form,
            location: form.location || undefined,
            soilType: form.soilType || undefined,
            irrigationType: form.irrigationType || undefined,
            notes: form.notes || undefined
          },
          session.token
        );
        setForm(defaultPlotForm);
        await refresh(farmId, session.token);
        pushToast({
          title: 'Parcelle ajoutee',
          description: 'La nouvelle parcelle a ete creee avec succes.',
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

  return (
    <AppShell title={`Parcelles - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid">
        <article className="module-hero-card plots-hero-card">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Cartographie agricole</p>
              <h2 className="module-hero-title">{farmName}</h2>
            </div>
            <Badge variant={stats.restingPlots > 0 ? 'warning' : 'success'}>
              {stats.totalSurfaceArea.toFixed(1)} ha suivis
            </Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            Une lecture claire du foncier, des rotations et de la disponibilite des zones de culture
            pour accelerer la planification.
          </p>
          <div className="module-pill-row">
            <span className="module-detail-chip">
              <Layers2 className="h-4 w-4" />
              {stats.totalPlots} parcelle(s)
            </span>
            <span className="module-detail-chip">
              <Sprout className="h-4 w-4" />
              {stats.cultivatedPlots} en exploitation
            </span>
            <span className="module-detail-chip">
              <Waves className="h-4 w-4" />
              {stats.restingPlots} en rotation
            </span>
          </div>
          <div className="module-kpi-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <MapPinned className="h-5 w-5" />
                </div>
                <Badge variant="info">Surface</Badge>
              </div>
              <strong>{stats.totalSurfaceArea.toFixed(1)} ha</strong>
              <span>superficie totale cartographiee dans la ferme</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Sprout className="h-5 w-5" />
                </div>
                <Badge variant="success">Actives</Badge>
              </div>
              <strong>{stats.cultivatedPlots}</strong>
              <span>parcelles avec culture en cours ou en preparation</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Waves className="h-5 w-5" />
                </div>
                <Badge variant="warning">Disponibles</Badge>
              </div>
              <strong>{availablePlots}</strong>
              <span>zones pretes a accueillir une prochaine campagne</span>
            </article>
          </div>
        </article>

        <article className="module-spotlight-card plots-spotlight-card">
          <div className="module-card-top">
            <p className="eyebrow">Lecture terrain</p>
            <Badge variant="neutral">Parcellaire</Badge>
          </div>
          <h2>Organisation fonciere plus nette</h2>
          <p>
            Chaque parcelle conserve sa superficie, son type de sol, son irrigation et son nombre de
            cultures actives pour preparer les decisions terrain.
          </p>
          <div className="module-detail-list">
            <span>Vue orientee production et rotation</span>
            <span>Base solide pour les campagnes culturales</span>
            <span>Compatible avec la suite cultures deja en place</span>
          </div>
        </article>
      </section>

      <section className="module-flow-strip">
        {plotWorkflowSteps.map((step, index) => {
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
        <article className="module-form-card plots-form-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouvelle parcelle</p>
              <h2>Structurer le foncier agricole</h2>
            </div>
            <div className="farm-module-icon">
              <MapPinned className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitPlot}>
            <div className="field-grid">
              <label className="field">
                <span>Nom</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Localisation</span>
                <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
              </label>
              <label className="field">
                <span>Superficie</span>
                <input type="number" value={form.surfaceArea} onChange={(event) => setForm((current) => ({ ...current, surfaceArea: Number(event.target.value) }))} />
              </label>
              <label className="field">
                <span>Type de sol</span>
                <input value={form.soilType} onChange={(event) => setForm((current) => ({ ...current, soilType: event.target.value }))} />
              </label>
              <label className="field">
                <span>Irrigation</span>
                <input value={form.irrigationType} onChange={(event) => setForm((current) => ({ ...current, irrigationType: event.target.value }))} />
              </label>
              <label className="field">
                <span>Statut</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PlotView['status'] }))}>
                  <option value="AVAILABLE">Disponible</option>
                  <option value="CULTIVATED">Cultivee</option>
                  <option value="RESTING">Repos</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </label>
              <label className="field">
                <span>Notes</span>
                <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="module-inline-note">
              <span>Cette fiche sera ensuite reutilisee dans les modules cultures et rendements.</span>
              {session?.user.role === 'ADMIN' ? (
                <Button className="module-submit-button" type="submit" disabled={isPending}>
                  Ajouter la parcelle
                </Button>
              ) : (
                <Badge variant="warning">Lecture seule</Badge>
              )}
            </div>
          </form>
        </article>

        <article className="module-list-card plots-list-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Synthese portefeuille</p>
              <h2>Repartition des usages</h2>
            </div>
            <Badge variant="info">{plots.length} parcelle(s)</Badge>
          </div>
          <div className="metric-list">
            <span>Disponibles: {availablePlots}</span>
            <span>En culture: {stats.cultivatedPlots}</span>
            <span>Au repos: {stats.restingPlots}</span>
            <span>Surface moyenne: {stats.totalPlots ? (stats.totalSurfaceArea / stats.totalPlots).toFixed(1) : '0.0'} ha</span>
          </div>
          <p>
            Cette vue met en avant l'equilibre entre production active, rotation et reserve fonciere
            pour les prochaines campagnes.
          </p>
        </article>
      </section>

      <section className="module-catalog-grid">
        {plots.length ? (
          plots.map((plot, index) => (
            <motion.article
              key={plot.id}
              className="module-catalog-card plots-catalog-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="module-card-top">
                <p className="eyebrow">{plot.location || 'Localisation a preciser'}</p>
                <Badge variant={plotBadge(plot.status)}>{plot.status}</Badge>
              </div>
              <h2>{plot.name}</h2>
              <p>
                Sol: {plot.soilType || 'NC'} | Irrigation: {plot.irrigationType || 'NC'}
              </p>
              <div className="module-detail-list">
                <span>Surface: {plot.surfaceArea} ha</span>
                <span>Cultures actives: {plot.activeCropCount}</span>
                <span>{plot.notes || 'Aucune note terrain'}</span>
              </div>
            </motion.article>
          ))
        ) : (
          <article className="module-catalog-card plots-catalog-card module-empty-card">
            <div>
              <p className="eyebrow">Demarrage</p>
              <h2>Aucune parcelle enregistree</h2>
              <p>Ajoute une premiere parcelle pour commencer le suivi des cultures et de la rotation.</p>
            </div>
          </article>
        )}
      </section>
    </AppShell>
  );
}
