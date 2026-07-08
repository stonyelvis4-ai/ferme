'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState, useTransition } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Scale,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useSession } from '../../../../hooks/use-session';
import {
  archiveFarm,
  assignFarmOwner,
  changeFarmStatus,
  deactivateFarm,
  getFarm,
  getFarmOwnerOptions,
  restoreFarm,
  softDeleteFarm,
  updateFarm,
  type FarmOwnerOption,
  type FarmSummary
} from '../../../../services/farm-client';
import { createOwnerAccount } from '../../../../services/auth-client';
import {
  getFarmBusinessSettings,
  updateFarmBusinessSettings,
  type FarmBusinessSettingsView
} from '../../../../services/settings-client';

type FarmEditForm = {
  name: string;
  description: string;
  location: string;
  surfaceArea: number;
  status: FarmSummary['status'];
  activityType: FarmSummary['activityType'];
};

type BusinessSettingsForm = {
  currency: string;
  stockLowThreshold: number;
  mortalityThresholdPercent: number;
  layingRateThresholdPercent: number;
  eggsBrokenThresholdPercent: number;
  phMin: number;
  phMax: number;
  oxygenMin: number;
  temperatureMin: number;
  temperatureMax: number;
  yieldThresholdPercent: number;
  reminderDefaults: string;
  units: string;
  taskCategories: string;
  taskPriorities: string;
  defaultEggTrayPrice: number;
  defaultFishKgPrice: number;
  defaultHarvestKgPrice: number;
};

const emptyEditForm: FarmEditForm = {
  name: '',
  description: '',
  location: '',
  surfaceArea: 0,
  status: 'ACTIVE',
  activityType: 'MIXTE'
};

const emptyBusinessSettingsForm: BusinessSettingsForm = {
  currency: 'FCFA',
  stockLowThreshold: 25,
  mortalityThresholdPercent: 3,
  layingRateThresholdPercent: 80,
  eggsBrokenThresholdPercent: 4,
  phMin: 6.5,
  phMax: 8.5,
  oxygenMin: 5,
  temperatureMin: 24,
  temperatureMax: 32,
  yieldThresholdPercent: 70,
  reminderDefaults: '24,6,1',
  units: 'kg,litre,plateau,sac,tonne',
  taskCategories: 'ALIMENTATION,SANITAIRE,PRODUCTION,RECOLTE,VENTE,STOCK,FINANCE,MAINTENANCE,CULTURE,REPRODUCTION,NETTOYAGE,CONTROLE,ADMINISTRATIF',
  taskPriorities: 'LOW,MEDIUM,HIGH',
  defaultEggTrayPrice: 0,
  defaultFishKgPrice: 0,
  defaultHarvestKgPrice: 0
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

function toBusinessSettingsForm(view: FarmBusinessSettingsView): BusinessSettingsForm {
  const fishRules = view.fishRules as {
    waterQuality?: { phMin?: number; phMax?: number; oxygenMin?: number; temperatureMin?: number; temperatureMax?: number };
  };
  return {
    currency: view.currency,
    stockLowThreshold: Number((view.stockRules as { lowStockThreshold?: number }).lowStockThreshold ?? 25),
    mortalityThresholdPercent: Number((view.livestockRules as { mortalityThresholdPercent?: number }).mortalityThresholdPercent ?? 3),
    layingRateThresholdPercent: Number((view.livestockRules as { layingRateThresholdPercent?: number }).layingRateThresholdPercent ?? 80),
    eggsBrokenThresholdPercent: Number((view.livestockRules as { eggsBrokenThresholdPercent?: number }).eggsBrokenThresholdPercent ?? 4),
    phMin: Number(fishRules.waterQuality?.phMin ?? 6.5),
    phMax: Number(fishRules.waterQuality?.phMax ?? 8.5),
    oxygenMin: Number(fishRules.waterQuality?.oxygenMin ?? 5),
    temperatureMin: Number(fishRules.waterQuality?.temperatureMin ?? 24),
    temperatureMax: Number(fishRules.waterQuality?.temperatureMax ?? 32),
    yieldThresholdPercent: Number((view.cropRules as { rendementThresholdPercent?: number }).rendementThresholdPercent ?? 70),
    reminderDefaults: view.reminderDefaults.join(','),
    units: view.units.join(','),
    taskCategories: view.taskCatalog.categories.join(','),
    taskPriorities: view.taskCatalog.priorities.join(','),
    defaultEggTrayPrice: Number(view.defaultPrices.eggTray ?? 0),
    defaultFishKgPrice: Number(view.defaultPrices.fishKg ?? 0),
    defaultHarvestKgPrice: Number(view.defaultPrices.harvestKg ?? 0)
  };
}

export default function FarmSettingsPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farm, setFarm] = useState<FarmSummary | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<FarmOwnerOption[]>([]);
  const [businessSettings, setBusinessSettings] = useState<FarmBusinessSettingsView | null>(null);
  const [businessForm, setBusinessForm] = useState<BusinessSettingsForm>(emptyBusinessSettingsForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [ownerForm, setOwnerForm] = useState({
    fullName: '',
    email: '',
    password: '',
    assignToCurrentFarm: true
  });

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    let cancelled = false;

    getFarm(farmId, session.token)
      .then((farmResponse) => {
        if (cancelled) {
          return;
        }

        setFarm(farmResponse);
        setEditForm({
          name: farmResponse.name,
          description: farmResponse.description,
          location: farmResponse.location,
          surfaceArea: farmResponse.surfaceArea,
          status: farmResponse.status,
          activityType: farmResponse.activityType
        });
        setSelectedOwnerId(farmResponse.ownerUserId ?? '');
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

    getFarmBusinessSettings(farmId, session.token)
      .then((settingsResponse) => {
        if (!cancelled) {
          setBusinessSettings(settingsResponse);
          setBusinessForm(toBusinessSettingsForm(settingsResponse));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBusinessSettings(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [farmId, session?.token, session?.user.role]);

  const isOwner = session?.user.role === 'PROPRIETAIRE';
  const ownerLabel =
    ownerOptions.find((owner) => owner.id === farm?.ownerUserId)?.fullName ??
    (farm?.ownerUserId ? 'Proprietaire assigne' : 'Aucun proprietaire');

  function applyFarmUpdate(nextFarm: FarmSummary, message: string) {
    setFarm(nextFarm);
    setEditForm({
      name: nextFarm.name,
      description: nextFarm.description,
      location: nextFarm.location,
      surfaceArea: nextFarm.surfaceArea,
      status: nextFarm.status,
      activityType: nextFarm.activityType
    });
    setSelectedOwnerId(nextFarm.ownerUserId ?? '');
    setSuccess(message);
    setError(null);
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !farmId) {
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateFarm(farmId, editForm, session.token);
        applyFarmUpdate(updated, 'Ferme mise a jour.');
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Mise a jour impossible');
      }
    });
  }

  function submitOwnerAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !farmId) {
      return;
    }

    startTransition(async () => {
      try {
        const updated = await assignFarmOwner(farmId, selectedOwnerId || null, session.token);
        applyFarmUpdate(updated, 'Proprietaire mis a jour.');
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Assignation impossible');
      }
    });
  }

  function submitOwnerCreation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !farmId) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await createOwnerAccount(
          {
            fullName: ownerForm.fullName,
            email: ownerForm.email,
            password: ownerForm.password,
            farmId: ownerForm.assignToCurrentFarm ? farmId : undefined
          },
          session.token
        );

        setOwnerForm({
          fullName: '',
          email: '',
          password: '',
          assignToCurrentFarm: true
        });

        const [updatedFarm, refreshedOwners] = await Promise.all([
          getFarm(farmId, session.token),
          getFarmOwnerOptions(session.token)
        ]);

        setOwnerOptions(refreshedOwners.items);
        applyFarmUpdate(updatedFarm, 'Proprietaire cree.');

        if (ownerForm.assignToCurrentFarm) {
          setSelectedOwnerId(response.owner.id);
          setSuccess('Proprietaire cree et assigne a la ferme.');
        } else {
          setSuccess("Proprietaire cree. Vous pouvez maintenant l'assigner.");
        }
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Creation impossible');
      }
    });
  }

  function submitBusinessSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !farmId) {
      return;
    }

    startTransition(async () => {
      try {
        const nextSettings = await updateFarmBusinessSettings(
          farmId,
          {
            currency: businessForm.currency,
            stockRules: {
              lowStockThreshold: businessForm.stockLowThreshold,
              ruptureThreshold: Math.max(1, Math.round(businessForm.stockLowThreshold / 5))
            },
            livestockRules: {
              mortalityThresholdPercent: businessForm.mortalityThresholdPercent,
              layingRateThresholdPercent: businessForm.layingRateThresholdPercent,
              eggsBrokenThresholdPercent: businessForm.eggsBrokenThresholdPercent
            },
            fishRules: {
              mortalityThresholdPercent: businessForm.mortalityThresholdPercent,
              waterQuality: {
                phMin: businessForm.phMin,
                phMax: businessForm.phMax,
                oxygenMin: businessForm.oxygenMin,
                temperatureMin: businessForm.temperatureMin,
                temperatureMax: businessForm.temperatureMax
              }
            },
            cropRules: {
              rendementThresholdPercent: businessForm.yieldThresholdPercent
            },
            reminderDefaults: businessForm.reminderDefaults
              .split(',')
              .map((item) => Number(item.trim()))
              .filter((item) => Number.isFinite(item)),
            units: businessForm.units
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            defaultPrices: {
              eggTray: businessForm.defaultEggTrayPrice,
              fishKg: businessForm.defaultFishKgPrice,
              harvestKg: businessForm.defaultHarvestKgPrice
            },
            taskCatalog: {
              categories: businessForm.taskCategories
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              priorities: businessForm.taskPriorities
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            },
            alertRules: {
              lowStock: true,
              mortality: true,
              layingRate: true,
              waterQuality: true,
              cropYield: true
            }
          },
          session.token
        );

        setBusinessSettings(nextSettings);
        setBusinessForm(toBusinessSettingsForm(nextSettings));
        setSuccess('Paramètres métier enregistrés.');
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Enregistrement impossible');
      }
    });
  }

  function runFarmAction(action: () => Promise<FarmSummary>, message: string) {
    startTransition(async () => {
      try {
        const updated = await action();
        applyFarmUpdate(updated, message);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Operation impossible');
      }
    });
  }

  return (
    <AppShell
      title={`Parametres - ${farm?.name ?? farmId}`}
      actions={
        <Link href={`/farms/${farmId}`}>
          <Button variant="secondary" className="dashboard-action-button dashboard-action-button-secondary">
            Retour a la ferme
          </Button>
        </Link>
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="muted">{success}</p> : null}

      <section className="dashboard-hero-grid">
        <article className="dashboard-hero-card">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Administration dediee</p>
              <h2 className="dashboard-hero-title">Reglages et gouvernance de la ferme</h2>
            </div>
            <Badge variant={farm?.status === 'ACTIVE' ? 'success' : 'warning'}>
              {farm?.status ?? 'Chargement'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Les parametres sensibles, les changements de statut et la gestion du proprietaire
            vivent ici pour garder le tableau de bord operationnel plus clair.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <Settings2 className="h-4 w-4" />
              Espace admin
            </span>
            <span className="dashboard-hero-pill">
              <ShieldAlert className="h-4 w-4" />
              Actions tracees
            </span>
            <span className="dashboard-hero-pill">
              <ArrowRight className="h-4 w-4" />
              Vue separee
            </span>
          </div>
          <div className="dashboard-hero-stat-grid">
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Statut</span>
              <strong>{farm?.status ?? 'En attente'}</strong>
              <span>etat actuel de la ferme</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Activite</span>
              <strong>{formatActivityLabel(farm?.activityType ?? 'MIXTE')}</strong>
              <span>orientation principale</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Proprietaire</span>
              <strong>{ownerLabel}</strong>
              <span>responsable relie</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Resume</p>
              <h2>{farm?.name ?? 'Chargement de la ferme'}</h2>
            </div>
            <div className="farm-module-icon">
              <Settings2 className="h-5 w-5" />
            </div>
          </div>
          <div className="metric-list">
            <span>
              <MapPin className="inline h-4 w-4" /> {farm?.location ?? 'Localisation en attente'}
            </span>
            <span>
              <Scale className="inline h-4 w-4" /> {farm?.surfaceArea ?? 0} ha
            </span>
            <span>
              <BadgeCheck className="inline h-4 w-4" /> {ownerLabel}
            </span>
          </div>
          <div className="hero-actions">
            <Button
              variant="secondary"
              className="dashboard-action-button dashboard-action-button-secondary"
              type="button"
              onClick={() =>
                runFarmAction(() => changeFarmStatus(farmId, 'ACTIVE', session!.token), 'Statut passe a ACTIVE.')
              }
              disabled={isPending || isOwner}
            >
              Activer
            </Button>
            <Button
              className="dashboard-action-button dashboard-action-button-primary"
              type="button"
              onClick={() =>
                runFarmAction(() => changeFarmStatus(farmId, 'SUSPENDUE', session!.token), 'Statut passe a SUSPENDUE.')
              }
              disabled={isPending || isOwner}
            >
              Suspendre
            </Button>
          </div>
          <div className="farm-detail-flags">
            {farm?.archivedAt ? <Badge variant="warning">Archivee</Badge> : null}
            {farm?.deactivatedAt ? <Badge variant="warning">Desactivee</Badge> : null}
            {farm?.deletedAt ? <Badge variant="critical">Supprimee logiquement</Badge> : null}
          </div>
        </article>
      </section>

      {!isOwner ? (
        <section className="dashboard-summary-grid">
          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Statut</p>
                <h2>Actions de gouvernance</h2>
              </div>
              <Badge variant="neutral">Admin</Badge>
            </div>
            <div className="farm-admin-actions">
              <Button
                variant="secondary"
                type="button"
                disabled={isPending}
                onClick={() => runFarmAction(() => archiveFarm(farmId, session!.token), 'Ferme archivee.')}
              >
                Archiver
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={isPending}
                onClick={() => runFarmAction(() => deactivateFarm(farmId, session!.token), 'Ferme desactivee.')}
              >
                Desactiver
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={isPending}
                onClick={() => runFarmAction(() => restoreFarm(farmId, session!.token), 'Ferme restauree.')}
              >
                Restaurer
              </Button>
              <Button
                variant="danger"
                type="button"
                disabled={isPending}
                onClick={() => runFarmAction(() => softDeleteFarm(farmId, session!.token), 'Suppression logique appliquee.')}
              >
                Supprimer
              </Button>
            </div>
          </article>

          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Ferme</p>
                <h2>Modifier la fiche</h2>
              </div>
              <Badge variant="info">Edition</Badge>
            </div>
            <form className="stack-form" onSubmit={submitEdit}>
              <label className="field">
                <span>Nom</span>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Localisation</span>
                  <input
                    value={editForm.location}
                    onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Superficie</span>
                  <input
                    type="number"
                    value={editForm.surfaceArea}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, surfaceArea: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Statut</span>
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        status: event.target.value as typeof current.status
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
                    value={editForm.activityType}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        activityType: event.target.value as typeof current.activityType
                      }))
                    }
                  >
                    <option value="ELEVAGE">Elevage</option>
                    <option value="CULTURE">Culture</option>
                    <option value="MIXTE">Mixte</option>
                    <option value="PISCICULTURE">Pisciculture</option>
                  </select>
                </label>
              </div>
              <div className="hero-actions">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </article>

          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Proprietaire</p>
                <h2>Assigner un compte</h2>
              </div>
              <Badge variant="success">Lien ferme</Badge>
            </div>
            <form className="stack-form" onSubmit={submitOwnerAssignment}>
              <label className="field">
                <span>Proprietaire assigne</span>
                <select value={selectedOwnerId} onChange={(event) => setSelectedOwnerId(event.target.value)}>
                  <option value="">Aucun proprietaire</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.fullName} ({owner.email})
                    </option>
                  ))}
                </select>
              </label>
              <div className="hero-actions">
                <Button type="submit" disabled={isPending}>
                  Appliquer
                </Button>
              </div>
            </form>
          </article>

          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Nouveau proprietaire</p>
                <h2>Creer un compte lie</h2>
              </div>
              <Badge variant="warning">Admin uniquement</Badge>
            </div>
            <form className="stack-form" onSubmit={submitOwnerCreation}>
              <div className="field-grid">
                <label className="field">
                  <span>Nom complet</span>
                  <input
                    value={ownerForm.fullName}
                    onChange={(event) =>
                      setOwnerForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={ownerForm.email}
                    onChange={(event) =>
                      setOwnerForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Mot de passe initial</span>
                  <input
                    type="password"
                    value={ownerForm.password}
                    onChange={(event) =>
                      setOwnerForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Assignation immediate</span>
                  <select
                    value={ownerForm.assignToCurrentFarm ? 'YES' : 'NO'}
                    onChange={(event) =>
                      setOwnerForm((current) => ({
                        ...current,
                        assignToCurrentFarm: event.target.value === 'YES'
                      }))
                    }
                  >
                    <option value="YES">Creer et assigner a cette ferme</option>
                    <option value="NO">Creer sans assigner</option>
                  </select>
                </label>
              </div>
              <div className="hero-actions">
                <Button type="submit" disabled={isPending}>
                  Creer le proprietaire
                </Button>
              </div>
            </form>
          </article>

          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Paramètres métier</p>
                <h2>Règles automatiques de la ferme</h2>
              </div>
              <Badge variant="info">Configurable</Badge>
            </div>
            <form className="stack-form" onSubmit={submitBusinessSettings}>
              <div className="field-grid">
                <label className="field">
                  <span>Devise</span>
                  <input
                    value={businessForm.currency}
                    onChange={(event) => setBusinessForm((current) => ({ ...current, currency: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Seuil stock faible</span>
                  <input
                    type="number"
                    value={businessForm.stockLowThreshold}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, stockLowThreshold: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Mortalité max (%)</span>
                  <input
                    type="number"
                    value={businessForm.mortalityThresholdPercent}
                    onChange={(event) =>
                      setBusinessForm((current) => ({
                        ...current,
                        mortalityThresholdPercent: Number(event.target.value)
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Taux de ponte min (%)</span>
                  <input
                    type="number"
                    value={businessForm.layingRateThresholdPercent}
                    onChange={(event) =>
                      setBusinessForm((current) => ({
                        ...current,
                        layingRateThresholdPercent: Number(event.target.value)
                      }))
                    }
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Œufs cassés max (%)</span>
                  <input
                    type="number"
                    value={businessForm.eggsBrokenThresholdPercent}
                    onChange={(event) =>
                      setBusinessForm((current) => ({
                        ...current,
                        eggsBrokenThresholdPercent: Number(event.target.value)
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>pH min</span>
                  <input
                    type="number"
                    step="0.1"
                    value={businessForm.phMin}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, phMin: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>pH max</span>
                  <input
                    type="number"
                    step="0.1"
                    value={businessForm.phMax}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, phMax: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Oxygène min</span>
                  <input
                    type="number"
                    step="0.1"
                    value={businessForm.oxygenMin}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, oxygenMin: Number(event.target.value) }))
                    }
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Température min</span>
                  <input
                    type="number"
                    step="0.1"
                    value={businessForm.temperatureMin}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, temperatureMin: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Température max</span>
                  <input
                    type="number"
                    step="0.1"
                    value={businessForm.temperatureMax}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, temperatureMax: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Rappels par défaut</span>
                  <input
                    value={businessForm.reminderDefaults}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, reminderDefaults: event.target.value }))
                    }
                    placeholder="24,6,1"
                  />
                </label>
                <label className="field">
                  <span>Unités</span>
                  <input
                    value={businessForm.units}
                    onChange={(event) => setBusinessForm((current) => ({ ...current, units: event.target.value }))}
                    placeholder="kg,litre,plateau..."
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Catégories de tâches</span>
                  <textarea
                    value={businessForm.taskCategories}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, taskCategories: event.target.value }))
                    }
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Priorités de tâches</span>
                  <textarea
                    value={businessForm.taskPriorities}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, taskPriorities: event.target.value }))
                    }
                    rows={3}
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Prix plateau d’œufs</span>
                  <input
                    type="number"
                    value={businessForm.defaultEggTrayPrice}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, defaultEggTrayPrice: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Prix kg poisson</span>
                  <input
                    type="number"
                    value={businessForm.defaultFishKgPrice}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, defaultFishKgPrice: Number(event.target.value) }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Prix kg récolte</span>
                  <input
                    type="number"
                    value={businessForm.defaultHarvestKgPrice}
                    onChange={(event) =>
                      setBusinessForm((current) => ({ ...current, defaultHarvestKgPrice: Number(event.target.value) }))
                    }
                  />
                </label>
                <div className="field">
                  <span>Dernière mise à jour</span>
                  <input value={businessSettings?.updatedAt ? new Date(businessSettings.updatedAt).toLocaleString('fr-FR') : 'Jamais'} disabled />
                </div>
              </div>

              <div className="hero-actions">
                <Button type="submit" disabled={isPending}>
                  Enregistrer les paramètres
                </Button>
              </div>
            </form>
          </article>
        </section>
      ) : (
        <section className="dashboard-summary-grid">
          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Lecture seule</p>
                <h2>Accès propriétaire</h2>
              </div>
              <Badge variant="info">Contrôle limité</Badge>
            </div>
            <p className="muted">
              Les propriétaires voient ici le contexte de la ferme, mais les changements sensibles restent réservés à
              l’administration.
            </p>
          </article>

          <article className="panel dashboard-summary-card">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Paramètres métier</p>
                <h2>Règles de la ferme</h2>
              </div>
              <Badge variant="neutral">Lecture seule</Badge>
            </div>
            <div className="metric-list">
              <article className="metric-card">
                <span className="metric-label">Devise</span>
                <strong>{businessSettings?.currency ?? 'FCFA'}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">Stock faible</span>
                <strong>{businessSettings?.stockRules && typeof businessSettings.stockRules === 'object' ? String((businessSettings.stockRules as { lowStockThreshold?: number }).lowStockThreshold ?? 25) : '25'}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">Rappels</span>
                <strong>{businessSettings?.reminderDefaults?.join(', ') ?? '24, 6, 1'}</strong>
              </article>
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}
