'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState, useTransition } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  ClipboardList,
  HeartPulse,
  Leaf,
  LineChart,
  MapPin,
  Package,
  Scale,
  Settings2,
  Sprout,
  Tractor,
  Wallet,
  Warehouse
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppShell } from '../../../components/app-shell';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { useSession } from '../../../hooks/use-session';
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
} from '../../../services/farm-client';
import { createOwnerAccount } from '../../../services/auth-client';

type FarmEditForm = {
  name: string;
  description: string;
  location: string;
  surfaceArea: number;
  status: FarmSummary['status'];
  activityType: FarmSummary['activityType'];
};

const emptyEditForm: FarmEditForm = {
  name: '',
  description: '',
  location: '',
  surfaceArea: 0,
  status: 'ACTIVE' as const,
  activityType: 'MIXTE' as const
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

type FarmModuleCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  icon: LucideIcon;
};

const moduleCards: FarmModuleCard[] = [
  {
    eyebrow: 'Dashboard',
    title: 'Pilotage global',
    description: 'Consulte les indicateurs cles, risques et tendances de la ferme.',
    href: 'dashboard',
    linkLabel: 'Ouvrir le dashboard',
    icon: LineChart
  },
  {
    eyebrow: 'Agenda',
    title: 'Operations du jour',
    description: 'Le cockpit agenda est deja accessible pour la ferme selectionnee.',
    href: 'agenda',
    linkLabel: 'Voir l agenda',
    secondaryHref: 'alerts',
    secondaryLabel: 'Ouvrir le centre d alertes',
    icon: ClipboardList
  },
  {
    eyebrow: 'Elevage',
    title: 'Suivi des animaux et poissons',
    description: "Gere les lots, animaux, poissons et evenements d'exploitation depuis un meme espace.",
    href: 'livestock',
    linkLabel: "Ouvrir l'elevage",
    icon: Tractor
  },
  {
    eyebrow: 'Production',
    title: 'Rendement, stock et ventes',
    description: 'Suis la production, la tracabilite, les ventes et la marge depuis un seul cockpit.',
    href: 'production',
    linkLabel: 'Ouvrir la production',
    icon: Package
  },
  {
    eyebrow: 'Cultures',
    title: 'Parcelles et campagnes',
    description: 'Pilote les parcelles, cycles, operations et rendements.',
    href: 'crops',
    linkLabel: 'Ouvrir les cultures',
    secondaryHref: 'plots',
    secondaryLabel: 'Gerer les parcelles',
    icon: Leaf
  },
  {
    eyebrow: 'Infrastructures',
    title: 'Batiments et enclos',
    description: "Administre les capacites, affectations et etats des zones d'accueil.",
    href: 'facilities',
    linkLabel: 'Ouvrir les infrastructures',
    icon: Building2
  },
  {
    eyebrow: 'Stocks',
    title: 'Suivi des ressources',
    description: 'Consulte le stock disponible et les alertes de seuil faible.',
    href: 'inventory',
    linkLabel: 'Ouvrir les stocks',
    icon: Warehouse
  },
  {
    eyebrow: 'Finances',
    title: 'Recettes et depenses',
    description: 'Suis les transactions, le solde et la marge de la ferme.',
    href: 'finance',
    linkLabel: 'Ouvrir les finances',
    icon: Wallet
  },
  {
    eyebrow: 'Sanitaire',
    title: 'Suivi de sante',
    description: 'Historise vaccinations, traitements, consultations et cas critiques.',
    href: 'sanitary',
    linkLabel: 'Ouvrir le suivi sanitaire',
    icon: HeartPulse
  },
  {
    eyebrow: 'Rapports',
    title: 'Exports et syntheses',
    description: 'Genere des rapports techniques, sanitaires et financiers a la demande.',
    href: 'reports',
    linkLabel: 'Ouvrir les rapports',
    icon: BadgeCheck
  },
  {
    eyebrow: 'Recommandations',
    title: 'Conseils intelligents',
    description: 'Obtiens des recommandations basees sur l etat reel de la ferme.',
    href: 'recommendations',
    linkLabel: 'Ouvrir les recommandations',
    icon: Sprout
  }
];

export default function FarmDetailPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState<string>('');
  const [farm, setFarm] = useState<FarmSummary | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<FarmOwnerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showOwnerAssignment, setShowOwnerAssignment] = useState(false);
  const [showOwnerCreation, setShowOwnerCreation] = useState(false);
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
        setShowEdit(false);
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
        setShowOwnerAssignment(false);
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
        setShowOwnerCreation(false);

        const [updatedFarm, refreshedOwners] = await Promise.all([
          getFarm(farmId, session.token),
          getFarmOwnerOptions(session.token)
        ]);
        setOwnerOptions(refreshedOwners.items);
        applyFarmUpdate(updatedFarm, 'Proprietaire cree et disponible pour assignation.');
        if (ownerForm.assignToCurrentFarm) {
          setSelectedOwnerId(response.owner.id);
        }

        if (ownerForm.assignToCurrentFarm) {
          setSuccess('Proprietaire cree et assigne a la ferme.');
        } else {
          setSuccess('Proprietaire cree. Vous pouvez maintenant l\'assigner.');
        }
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Creation impossible');
      }
    });
  }

  function runFarmAction(
    action: () => Promise<FarmSummary>,
    message: string,
    options?: { closeEdit?: boolean; closeOwner?: boolean }
  ) {
    startTransition(async () => {
      try {
        const updated = await action();
        applyFarmUpdate(updated, message);
        if (options?.closeEdit) {
          setShowEdit(false);
        }
        if (options?.closeOwner) {
          setShowOwnerAssignment(false);
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Operation impossible');
      }
    });
  }

  return (
    <AppShell
      title={farm ? farm.name : `Workspace ${farmId}`}
      actions={
        isOwner ? null : (
          <>
            <Button variant="secondary" type="button" onClick={() => setShowEdit((current) => !current)}>
              Modifier
            </Button>
            <Button type="button" onClick={() => setShowOwnerAssignment((current) => !current)}>
              Assigner un proprietaire
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowOwnerCreation((current) => !current)}>
              Créer un propriétaire
            </Button>
          </>
        )
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="muted">{success}</p> : null}

      {!isOwner && showEdit ? (
        <section className="panel create-panel farm-management-panel">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Modifier la ferme</p>
              <h2 className="farms-section-title">Mettez a jour la fiche sans perdre l historique</h2>
            </div>
            <Badge variant="info">Edition securisee</Badge>
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
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Localisation</span>
                <input
                  value={editForm.location}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Superficie</span>
                <input
                  type="number"
                  value={editForm.surfaceArea}
                  onChange={(event) =>
                    setEditForm((current) => ({
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
              <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {!isOwner && showOwnerAssignment ? (
        <section className="panel create-panel farm-management-panel">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Assignation proprietaire</p>
              <h2 className="farms-section-title">Reliez cette ferme a son responsable</h2>
            </div>
            <Badge variant="neutral">Workflow proprietaire</Badge>
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
                {isPending ? 'Affectation...' : 'Appliquer'}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setShowOwnerAssignment(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {!isOwner && showOwnerCreation ? (
        <section className="panel create-panel farm-management-panel">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouveau propriétaire</p>
              <h2 className="farms-section-title">Créer un compte propriétaire prêt à l’emploi</h2>
            </div>
            <Badge variant="success">Admin uniquement</Badge>
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
                <span>Assignation immédiate</span>
                <select
                  value={ownerForm.assignToCurrentFarm ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setOwnerForm((current) => ({
                      ...current,
                      assignToCurrentFarm: event.target.value === 'YES'
                    }))
                  }
                >
                  <option value="YES">Créer et assigner à cette ferme</option>
                  <option value="NO">Créer sans assigner</option>
                </select>
              </label>
            </div>
            <div className="hero-actions">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Création...' : 'Créer le propriétaire'}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setShowOwnerCreation(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="farm-detail-hero">
        <article className="farm-detail-hero-card">
          <div className="farm-detail-topline">
            <Badge variant={farm?.status === 'ACTIVE' ? 'success' : 'warning'}>
              {farm?.status ?? 'Chargement'}
            </Badge>
            <Badge variant="neutral">{formatActivityLabel(farm?.activityType ?? 'MIXTE')}</Badge>
          </div>
          <h2 className="farm-detail-title">{farm?.name ?? 'Chargement de la ferme'}</h2>
          <p className="hero-copy farm-detail-copy">
            {farm?.description ?? "La configuration de cette ferme est en cours d'analyse et d'activation."}
          </p>
          <div className="farm-detail-summary">
            <span className="farm-detail-summary-item">
              <MapPin className="h-4 w-4" />
              {farm?.location ?? 'Localisation en attente'}
            </span>
            <span className="farm-detail-summary-item">
              <Scale className="h-4 w-4" />
              {farm?.surfaceArea ?? 0} ha
            </span>
            <span className="farm-detail-summary-item">
              <BadgeCheck className="h-4 w-4" />
              {ownerLabel}
            </span>
          </div>
          <div className="farm-detail-kpis">
            <article className="farm-detail-kpi">
              <div className="metric-icon">
                <Activity className="h-5 w-5" />
              </div>
              <strong>{farm?.status === 'ACTIVE' ? 'Active' : 'A suivre'}</strong>
              <span>etat operationnel</span>
            </article>
            <article className="farm-detail-kpi">
              <div className="metric-icon">
                <BellRing className="h-5 w-5" />
              </div>
              <strong>{farm?.archivedAt || farm?.deactivatedAt ? 'Surveillee' : 'Stable'}</strong>
              <span>niveau d attention</span>
            </article>
            <article className="farm-detail-kpi">
              <div className="metric-icon">
                <Sprout className="h-5 w-5" />
              </div>
              <strong>{formatActivityLabel(farm?.activityType ?? 'MIXTE')}</strong>
              <span>orientation principale</span>
            </article>
          </div>
        </article>

        <article className="farm-admin-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Administration</p>
              <h2 className="farms-section-title">Workflow de gestion</h2>
            </div>
            <div className="farm-admin-icon">
              <Settings2 className="h-5 w-5" />
            </div>
          </div>
          <p className="muted">
            Change le statut, archive, desactive ou restaure cette ferme sans perdre l historique.
          </p>
          <div className="farm-admin-actions">
            {!isOwner ? (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runFarmAction(
                      () => changeFarmStatus(farmId, 'ACTIVE', session!.token),
                      'Statut passe a ACTIVE.'
                    )
                  }
                >
                  Activer
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runFarmAction(
                      () => changeFarmStatus(farmId, 'SUSPENDUE', session!.token),
                      'Statut passe a SUSPENDUE.'
                    )
                  }
                >
                  Suspendre
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runFarmAction(() => archiveFarm(farmId, session!.token), 'Ferme archivee.')
                  }
                >
                  Archiver
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runFarmAction(() => deactivateFarm(farmId, session!.token), 'Ferme desactivee.')
                  }
                >
                  Desactiver
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runFarmAction(() => restoreFarm(farmId, session!.token), 'Ferme restauree.')
                  }
                >
                  Restaurer
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runFarmAction(
                      () => softDeleteFarm(farmId, session!.token),
                      'Suppression logique appliquee.'
                    )
                  }
                >
                  Supprimer
                </Button>
              </>
            ) : (
              <div className="farm-detail-readonly">
                Les controles d action sont masques pour respecter le role lecture seule.
              </div>
            )}
          </div>
          <div className="farm-detail-flags">
            {farm?.archivedAt ? <Badge variant="warning">Archivee</Badge> : null}
            {farm?.deactivatedAt ? <Badge variant="warning">Desactivee</Badge> : null}
            {farm?.deletedAt ? <Badge variant="critical">Supprimee logiquement</Badge> : null}
          </div>
        </article>
      </section>

      <section className="farm-module-grid">
        {moduleCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="farm-module-card">
              <div className="dashboard-inline-actions">
                <div>
                  <p className="eyebrow">{card.eyebrow}</p>
                  <h2>{card.title}</h2>
                </div>
                <div className="farm-module-icon">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="muted">{card.description}</p>
              <div className="farm-module-links">
                <Link href={`/farms/${farmId}/${card.href}`} className="inline-link">
                  {card.linkLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {card.secondaryHref ? (
                  <Link href={`/farms/${farmId}/${card.secondaryHref}`} className="inline-link farm-module-secondary">
                    {card.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}

        <article className="farm-module-card farm-module-card-accent">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Lecture</p>
              <h2>{isOwner ? 'Mode proprietaire actif' : 'Mode administrateur actif'}</h2>
            </div>
            <div className="farm-module-icon">
              <BadgeCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="muted">
            {isOwner
              ? 'Vous consultez les donnees de la ferme dans un mode securise et centré sur la lecture.'
              : 'Vous pouvez desormais administrer la ferme, son statut et son proprietaire depuis cet ecran.'}
          </p>
        </article>
      </section>
    </AppShell>
  );
}
