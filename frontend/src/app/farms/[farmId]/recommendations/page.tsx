'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, BarChart3, HeartPulse, PackageSearch, Sparkles, Tractor } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useSession } from '../../../../hooks/use-session';
import {
  getFarm,
  getFarmRecommendations,
  type FarmRecommendationView
} from '../../../../services/farm-client';

function severityBadge(severity: FarmRecommendationView['severity']) {
  if (severity === 'CRITICAL') {
    return 'critical' as const;
  }

  if (severity === 'WARNING') {
    return 'warning' as const;
  }

  return 'info' as const;
}

function categoryIcon(category: FarmRecommendationView['category']) {
  switch (category) {
    case 'SANITAIRE':
      return HeartPulse;
    case 'STOCK':
      return PackageSearch;
    case 'FINANCE':
      return BarChart3;
    case 'PRODUCTION':
      return Tractor;
    default:
      return Sparkles;
  }
}

function categoryLabel(category: FarmRecommendationView['category']) {
  switch (category) {
    case 'OPERATIONS':
      return 'Operations';
    case 'SANITAIRE':
      return 'Sanitaire';
    case 'STOCK':
      return 'Stocks';
    case 'FINANCE':
      return 'Finance';
    case 'PRODUCTION':
      return 'Production';
  }
}

function actionHref(farmId: string, actionKey: FarmRecommendationView['actionKey']) {
  switch (actionKey) {
    case 'AGENDA':
      return `/farms/${farmId}/agenda`;
    case 'ALERTS':
      return `/farms/${farmId}/alerts`;
    case 'SANITARY':
      return `/farms/${farmId}/sanitary`;
    case 'STOCKS':
      return `/farms/${farmId}/inventory`;
    case 'FINANCE':
      return `/farms/${farmId}/finance`;
    case 'LIVESTOCK':
      return `/farms/${farmId}/livestock`;
    case 'CROPS':
      return `/farms/${farmId}/crops`;
    case 'DASHBOARD':
    default:
      return `/farms/${farmId}/dashboard`;
  }
}

export default function FarmRecommendationsPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [items, setItems] = useState<FarmRecommendationView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    Promise.all([getFarm(farmId, session.token), getFarmRecommendations(farmId, session.token)])
      .then(([farm, recommendations]) => {
        setFarmName(farm.name);
        setItems(recommendations.items);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible')
      );
  }, [farmId, session?.token]);

  const metrics = useMemo(() => {
    const critical = items.filter((item) => item.severity === 'CRITICAL').length;
    const warning = items.filter((item) => item.severity === 'WARNING').length;
    const grouped = new Set(items.map((item) => item.category)).size;

    return { critical, warning, grouped };
  }, [items]);

  const headline = items[0] ?? null;

  return (
    <AppShell title={`Recommandations - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid recommendations-hero-grid">
        <article className="module-hero-card recommendations-hero-card">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Conseils intelligents</p>
              <h2 className="module-hero-title">{farmName}</h2>
            </div>
            <Badge variant={metrics.critical > 0 ? 'critical' : 'success'}>
              {metrics.critical > 0 ? `${metrics.critical} priorite(s) critique(s)` : 'Lecture stable'}
            </Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            Cette vue consolide les signaux issus des taches, alertes, stocks, finances et evenements
            sanitaires pour proposer des priorites plus actionnables.
          </p>
          <div className="module-pill-row">
            <span className="module-detail-chip">
              <Sparkles className="h-4 w-4" />
              {items.length} recommandation(s)
            </span>
            <span className="module-detail-chip">
              <AlertTriangle className="h-4 w-4" />
              {metrics.warning} point(s) a surveiller
            </span>
            <span className="module-detail-chip">
              <BarChart3 className="h-4 w-4" />
              {metrics.grouped} domaine(s) couverts
            </span>
          </div>
          <div className="module-kpi-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge variant="info">Insights</Badge>
              </div>
              <strong>{items.length}</strong>
              <span>signal(s) interpretes et transformes en recommandations</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <Badge variant={metrics.critical > 0 ? 'critical' : 'warning'}>Urgence</Badge>
              </div>
              <strong>{metrics.critical}</strong>
              <span>point(s) demandant une action rapide ou un arbitrage</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <Badge variant="success">Couverture</Badge>
              </div>
              <strong>{metrics.grouped}</strong>
              <span>domaine(s) metier pris en compte dans l'analyse</span>
            </article>
          </div>
        </article>

        <article className="module-spotlight-card recommendations-spotlight-card">
          <div className="module-card-top">
            <p className="eyebrow">Priorite actuelle</p>
            <Badge variant={headline ? severityBadge(headline.severity) : 'info'}>
              {headline ? categoryLabel(headline.category) : 'En attente'}
            </Badge>
          </div>
          <h2>{headline?.title ?? 'Aucune recommandation immediate'}</h2>
          <p>
            {headline?.message ??
              'La plateforme ne remonte aucune tension particuliere pour le moment. Les nouveaux signaux apparaitront ici automatiquement.'}
          </p>
          {headline ? (
            <div className="hero-actions">
              <Badge variant={severityBadge(headline.severity)}>
                {headline.metricLabel}: {headline.metricValue}
              </Badge>
              <Link href={actionHref(farmId, headline.actionKey)}>
              <Button className="recommendations-action-button" variant="secondary">
                  {headline.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : null}
        </article>
      </section>

      <section className="module-catalog-grid">
        {items.length ? (
          items.map((item, index) => {
            const Icon = categoryIcon(item.category);

            return (
              <motion.article
                key={`${item.title}-${index}`}
                className="module-catalog-card recommendations-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="module-card-top">
                  <p className="eyebrow">{categoryLabel(item.category)}</p>
                  <Badge variant={severityBadge(item.severity)}>{item.severity}</Badge>
                </div>
                <div className="farm-module-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <h2>{item.title}</h2>
                <p>{item.message}</p>
                <div className="module-detail-list">
                  <span>
                    {item.metricLabel}: {item.metricValue}
                  </span>
                </div>
                <Link href={actionHref(farmId, item.actionKey)}>
                  <Button className="recommendations-action-button" variant="secondary" type="button">
                    {item.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.article>
            );
          })
        ) : (
          <article className="module-catalog-card recommendations-card module-empty-card">
            <div>
              <p className="eyebrow">Analyse</p>
              <h2>Aucune recommandation disponible</h2>
              <p>Les prochains signaux croises entre agenda, stocks, finances et sanitaire apparaitront ici.</p>
            </div>
          </article>
        )}
      </section>

      <section className="module-list-card recommendations-list-card">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Liste detaillee</p>
            <h2>Journal des recommandations</h2>
          </div>
          <Badge variant="info">{items.length} entree(s)</Badge>
        </div>
        {items.length ? (
          <div className="table-list">
            {items.map((item, index) => (
              <article
                key={`${item.title}-row-${index}`}
                className={`table-row ${item.severity === 'CRITICAL' ? 'alert-critical' : item.severity === 'WARNING' ? 'alert-warning' : 'alert-info'}`}
              >
                <Badge variant={severityBadge(item.severity)}>{item.severity}</Badge>
                <strong>{item.title}</strong>
                <span>{categoryLabel(item.category)}</span>
                <span>
                  {item.metricLabel}: {item.metricValue}
                </span>
                <span>{item.message}</span>
                <Link href={actionHref(farmId, item.actionKey)}>
                  <Button className="recommendations-action-button" variant="ghost" type="button">
                    {item.actionLabel}
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p>Aucune recommandation disponible pour le moment.</p>
        )}
      </section>
    </AppShell>
  );
}
