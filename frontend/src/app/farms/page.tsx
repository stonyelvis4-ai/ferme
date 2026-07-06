'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  Plus,
  Sprout,
  Tractor,
  Trees,
  Waves,
  Warehouse
} from 'lucide-react';
import { FormEvent, useEffect, useState, useTransition } from 'react';
import { AppShell } from '../../components/app-shell';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast-provider';
import { useSession } from '../../hooks/use-session';
import {
  createFarm,
  getFarmOwnerOptions,
  getFarms,
  type CreateFarmInput,
  type FarmOwnerOption,
  type FarmSummary
} from '../../services/farm-client';

const defaultFarmForm: CreateFarmInput = {
  name: '',
  description: '',
  location: '',
  surfaceArea: 0,
  status: 'ACTIVE' as const,
  activityType: 'MIXTE' as const,
  ownerUserId: ''
};

function formatActivityLabel(activityType: FarmSummary['activityType']) {
  if (activityType === 'ELEVAGE') {
    return 'Elevage';
  }

  if (activityType === 'CULTURE') {
    return 'Culture';
  }

  if (activityType === 'PISCICULTURE') {
    return 'Pisciculture';
  }

  return 'Mixte';
}

export default function FarmsPage() {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<FarmOwnerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultFarmForm);
  const { pushToast } = useToast();

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    let cancelled = false;

    getFarms(session.token)
      .then((response) => {
        if (!cancelled) {
          setFarms(response.items);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Chargement impossible');
        }
      });

    if (session.user.role === 'ADMIN') {
      getFarmOwnerOptions(session.token)
        .then((response) => {
          if (!cancelled) {
            setOwnerOptions(response.items);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOwnerOptions([]);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [session?.token, session?.user.role]);

  function submitFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      setError('Veuillez vous connecter.');
      pushToast({
        title: 'Connexion requise',
        description: 'Reconnecte-toi avant de creer une nouvelle ferme.',
        variant: 'error'
      });
      return;
    }

    startTransition(async () => {
      try {
        const farm = await createFarm(form, session.token);
        setFarms((current) => [...current, farm]);
        setForm(defaultFarmForm);
        setShowCreate(false);
        setError(null);
        pushToast({
          title: 'Ferme creee',
          description: `${farm.name} a ete ajoutee avec succes.`,
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

  const activeFarms = farms.filter((farm) => farm.status === 'ACTIVE').length;
  const totalSurfaceArea = farms.reduce((total, farm) => total + farm.surfaceArea, 0);
  const mixedFarms = farms.filter((farm) => farm.activityType === 'MIXTE').length;
  const fishFarms = farms.filter((farm) => farm.activityType === 'PISCICULTURE').length;

  return (
    <AppShell
      title="Vos fermes"
      actions={
        session?.user.role === 'ADMIN' ? (
          <Button type="button" size="lg" className="farms-top-action-button" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle ferme
          </Button>
        ) : undefined
      }
    >
      <section className="farms-hero-grid">
        <article className="farms-hero-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Pilotage agricole</p>
              <h2 className="farms-section-title">Un portefeuille de fermes plus clair et plus premium</h2>
            </div>
            <Badge variant="success">{activeFarms} actives</Badge>
          </div>
          <p className="hero-copy">
            Visualisez vos exploitations, comparez rapidement leur surface suivie et accedez au
            dashboard operationnel en un seul geste.
          </p>
          <div className="login-hero-pills farms-hero-pills">
            <span className="module-detail-chip">Pilotage centralise</span>
            <span className="module-detail-chip">{activeFarms} fermes actives</span>
            <span className="module-detail-chip">{totalSurfaceArea.toFixed(0)} ha suivis</span>
          </div>
          <div className="farms-stat-grid">
            <article className="farm-stat-card">
              <div className="metric-icon">
                <Trees className="h-5 w-5" />
              </div>
              <strong>{farms.length}</strong>
              <span>fermes visibles</span>
            </article>
            <article className="farm-stat-card">
              <div className="metric-icon">
                <Waves className="h-5 w-5" />
              </div>
              <strong>{totalSurfaceArea.toFixed(0)} ha</strong>
              <span>surface totale</span>
            </article>
            <article className="farm-stat-card">
              <div className="metric-icon">
                <Warehouse className="h-5 w-5" />
              </div>
              <strong>{mixedFarms}</strong>
              <span>fermes mixtes</span>
            </article>
            <article className="farm-stat-card">
              <div className="metric-icon">
                <Sprout className="h-5 w-5" />
              </div>
              <strong>{fishFarms}</strong>
              <span>sites piscicoles</span>
            </article>
          </div>
        </article>

        <article className="farms-session-card">
          <p className="eyebrow">Session active</p>
          <div className="farms-session-head">
            <div className="farms-session-avatar">
              {session?.user.fullName?.slice(0, 1).toUpperCase() ?? 'F'}
            </div>
            <div>
              <strong>{session?.user.fullName ?? 'Session non chargee'}</strong>
              <p className="muted">Acces securise au workspace FERM+</p>
            </div>
          </div>
          <div className="farms-session-meta">
            <Badge variant="info">{session?.user.role ?? 'Aucun role'}</Badge>
            <span>{activeFarms > 0 ? 'Parc pret pour le pilotage' : 'Aucune ferme active'}</span>
          </div>
          <div className="farms-session-mini">
            <span>Connexion</span>
            <strong>{session?.user.email ?? 'Compte non synchronise'}</strong>
          </div>
        </article>
      </section>

      {showCreate ? (
        <section className="panel create-panel farms-create-panel">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouvelle ferme</p>
              <h2 className="farms-section-title">Ajoutez une exploitation en quelques champs</h2>
            </div>
            <Badge variant="neutral">Attribution du proprietaire incluse</Badge>
          </div>
          <form className="stack-form" onSubmit={submitFarm}>
            <label className="field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Localisation</span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Superficie</span>
                <input
                  type="number"
                  value={form.surfaceArea}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      surfaceArea: Number(event.target.value)
                    }))
                  }
                />
              </label>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Statut</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as typeof form.status
                    }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="EN_PREPARATION">En preparation</option>
                  <option value="SUSPENDUE">Suspendue</option>
                  <option value="FERMEE">Fermee</option>
                </select>
              </label>
              <label className="field">
                <span>Activite</span>
                <select
                  value={form.activityType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      activityType: event.target.value as typeof form.activityType
                    }))
                  }
                >
                  <option value="ELEVAGE">Elevage</option>
                  <option value="CULTURE">Culture</option>
                  <option value="MIXTE">Mixte</option>
                  <option value="PISCICULTURE">Pisciculture</option>
                </select>
              </label>
              <label className="field">
                <span>Proprietaire</span>
                <select
                  value={form.ownerUserId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ownerUserId: event.target.value
                    }))
                  }
                >
                  <option value="">Aucun proprietaire</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.fullName} ({owner.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="hero-actions farms-create-actions">
              <Button className="farms-create-button" type="submit" disabled={isPending}>
                {isPending ? 'Creation...' : 'Creer la ferme'}
              </Button>
              <Button variant="secondary" type="button" className="farms-cancel-button" onClick={() => setShowCreate(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <section className="grid-list farms-grid">
        {farms.map((farm, index) => (
          <motion.div
            key={farm.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link href={`/farms/${farm.id}`} className="farm-card farm-card-modern farms-card-link">
              <div className="farm-card-band" />
              <div className="farm-card-head farms-card-top">
                <div className="farm-card-badges">
                  <Badge variant={farm.status === 'ACTIVE' ? 'success' : 'warning'}>{farm.status}</Badge>
                  <Badge variant="neutral">{formatActivityLabel(farm.activityType)}</Badge>
                </div>
                <div className="farm-card-mini-icon">
                  <Sprout className="h-4 w-4" />
                </div>
              </div>

              <div className="farm-card-main">
                <p className="farm-card-overline">Exploitation</p>
                <h2>{farm.name}</h2>
                <p className="muted farm-card-description">{farm.description}</p>
              </div>

              <div className="farm-card-details">
                <span className="farm-card-detail">
                  <MapPin className="h-4 w-4" />
                  {farm.location}
                </span>
                <span className="farm-card-detail">
                  <Tractor className="h-4 w-4" />
                  {farm.surfaceArea} ha
                </span>
              </div>

              {farm.archivedAt || farm.deactivatedAt ? (
                <div className="farm-card-flags">
                  {farm.archivedAt ? <span className="status-chip">Archivee</span> : null}
                  {farm.deactivatedAt ? <span className="status-chip">Desactivee</span> : null}
                </div>
              ) : null}

              <div className="dashboard-inline-actions farm-card-footer">
                <span className="inline-link">
                  Ouvrir la fiche ferme
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="metric-delta metric-delta-up">
                  <Sprout className="mr-1 inline h-4 w-4" />
                  Operationnelle
                </span>
              </div>
            </Link>
          </motion.div>
        ))}

        {session && farms.length === 0 ? (
          <article className="panel empty-state farms-empty-state">
            <h2>Aucune ferme visible</h2>
            <p className="muted">
              Creez votre premiere ferme ou connectez-vous avec un compte proprietaire deja assigne.
            </p>
          </article>
        ) : null}
      </section>
    </AppShell>
  );
}
