'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  CloudOff,
  HeartPulse,
  Leaf,
  LineChart,
  MapPin,
  Package,
  Scale,
  Settings2,
  Sprout,
  Tractor,
  Users,
  Wallet,
  Warehouse
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppShell } from '../../../components/app-shell';
import { Badge } from '../../../components/ui/badge';
import { useSession } from '../../../hooks/use-session';
import { getFarm, type FarmSummary } from '../../../services/farm-client';

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
  },
  {
    eyebrow: 'Parametres',
    title: 'Reglages de la ferme',
    description: 'Centralise le statut, le proprietaire et les actions d administration dans un espace dedie.',
    href: 'settings',
    linkLabel: 'Ouvrir les parametres',
    icon: Settings2
  }
];

const adminWorkflowCards: FarmModuleCard[] = [
  {
    eyebrow: 'Utilisateurs',
    title: 'Comptes et proprietaires',
    description: 'Creer un proprietaire, relier ses fermes et conserver un accès lecture seule côté propriétaire.',
    href: 'users',
    linkLabel: 'Gerer les utilisateurs',
    icon: Users
  },
  {
    eyebrow: 'Traçabilité',
    title: 'Journal d audit',
    description: 'Revoir chaque mutation importante de la ferme, du planning aux opérations terrain.',
    href: 'audit',
    linkLabel: 'Ouvrir le journal',
    icon: ClipboardList
  },
  {
    eyebrow: 'Synchronisation',
    title: 'Mode hors ligne',
    description: 'Contrôler la file d attente locale, la remontée et l état de synchronisation.',
    href: 'sync',
    linkLabel: 'Ouvrir la synchronisation',
    icon: CloudOff
  }
];

function formatActivityLabel(activityType: FarmSummary['activityType']) {
  if (activityType === 'ELEVAGE') return 'Elevage';
  if (activityType === 'CULTURE') return 'Culture';
  if (activityType === 'PISCICULTURE') return 'Pisciculture';
  return 'Mixte';
}

export default function FarmDetailPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [farmId, setFarmId] = useState('');
  const [farm, setFarm] = useState<FarmSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) {
          setFarm(farmResponse);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Chargement impossible');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [farmId, session?.token]);

  const ownerLabel = farm?.ownerUserId ? 'Proprietaire assigne' : 'Aucun proprietaire';

  return (
    <AppShell title={farm ? farm.name : `Workspace ${farmId}`}>
      {error ? <p className="error-text">{error}</p> : null}

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
                <Sprout className="h-5 w-5" />
              </div>
              <strong>{formatActivityLabel(farm?.activityType ?? 'MIXTE')}</strong>
              <span>orientation principale</span>
            </article>
            <article className="farm-detail-kpi">
              <div className="metric-icon">
                <ClipboardList className="h-5 w-5" />
              </div>
              <strong>Vue separee</strong>
              <span>reglages dans leur propre espace</span>
            </article>
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
      </section>

      <section className="farm-module-grid">
        <article className="farm-module-card farm-module-card-spotlight">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Flux admin</p>
              <h2>Étapes de gouvernance</h2>
            </div>
            <Badge variant="info">ADMIN</Badge>
          </div>
          <p className="muted">
            Les écrans d administration sont reliés au cycle réel de la ferme pour garder la
            configuration, les accès et la traçabilité au même niveau que les modules métier.
          </p>
          <div className="farm-workflow-admin-grid">
            {adminWorkflowCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="farm-workflow-admin-card">
                  <div className="farm-module-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="eyebrow">{card.eyebrow}</p>
                  <h3>{card.title}</h3>
                  <p className="muted">{card.description}</p>
                  <Link href={`/farms/${farmId}/${card.href}`} className="inline-link">
                    {card.linkLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
