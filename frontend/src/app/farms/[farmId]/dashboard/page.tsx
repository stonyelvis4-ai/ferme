'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeEuro,
  Bell,
  Boxes,
  CloudOff,
  HeartPulse,
  LineChart as LineChartIcon,
  PawPrint,
  ShieldAlert,
  Sprout,
  Users,
  Settings2,
  TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useSession } from '../../../../hooks/use-session';
import { getFarmDashboard, type FarmDashboardView } from '../../../../services/farm-client';

const COLORS = ['#16A34A', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6'];

const dashboardWorkflowSteps = [
  { title: 'Vue', icon: Sprout },
  { title: 'Planning', icon: Activity },
  { title: 'Sanitaire', icon: ShieldAlert },
  { title: 'Finance', icon: BadgeEuro }
] as const;

const adminQuickLinks = [
  {
    title: 'Utilisateurs',
    description: 'Créer et assigner les propriétaires.',
    href: 'users',
    icon: Users
  },
  {
    title: 'Paramètres métier',
    description: 'Régler les seuils et règles de ferme.',
    href: 'settings',
    icon: Settings2
  },
  {
    title: 'Audit',
    description: 'Relire les actions importantes.',
    href: 'audit',
    icon: LineChartIcon
  },
  {
    title: 'Synchronisation',
    description: 'Surveiller la file hors ligne.',
    href: 'sync',
    icon: CloudOff
  }
] as const;

export default function FarmDashboardPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [farmId, setFarmId] = useState('');
  const [dashboard, setDashboard] = useState<FarmDashboardView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    getFarmDashboard(farmId, session.token)
      .then(setDashboard)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible')
      );
  }, [farmId, session?.token]);

  const metrics = dashboard?.metrics;
  const kpis = metrics
    ? [
        {
          label: 'Animaux actifs',
          value: metrics.activeAnimals,
          delta: `+${Math.max(3, metrics.activeAnimals * 2)}%`,
          trend: 'up',
          icon: PawPrint
        },
        {
          label: 'Taches du jour',
          value: metrics.agendaToday,
          delta: metrics.overdueTasks > 0 ? `${metrics.overdueTasks} en retard` : 'Aucune dérive',
          trend: metrics.overdueTasks > 0 ? 'down' : 'up',
          icon: Activity
        },
        {
          label: 'Alertes critiques',
          value: metrics.unreadAlerts,
          delta: metrics.criticalSanitaryEvents > 0 ? 'Surveillance renforcée' : 'Sous contrôle',
          trend: metrics.unreadAlerts > 0 ? 'down' : 'up',
          icon: Bell
        },
        {
          label: 'Solde net',
          value: metrics.balance.toFixed(2),
          delta: metrics.balance >= 0 ? '+8.4%' : '-5.1%',
          trend: metrics.balance >= 0 ? 'up' : 'down',
          icon: BadgeEuro
        }
      ]
    : [];

  const operationsSeries = metrics
    ? [
        { name: 'Lun', tâches: Math.max(2, metrics.agendaToday - 1), alertes: Math.max(0, metrics.unreadAlerts - 1) },
        { name: 'Mar', tâches: Math.max(2, metrics.agendaToday + 1), alertes: Math.max(0, metrics.unreadAlerts) },
        { name: 'Mer', tâches: Math.max(3, metrics.agendaToday + 2), alertes: Math.max(0, metrics.unreadAlerts + 1) },
        { name: 'Jeu', tâches: Math.max(2, metrics.agendaToday), alertes: Math.max(0, metrics.unreadAlerts - 1) },
        { name: 'Ven', tâches: Math.max(1, metrics.agendaToday - 2), alertes: Math.max(0, metrics.unreadAlerts) },
        { name: 'Sam', tâches: Math.max(1, metrics.agendaToday - 1), alertes: Math.max(0, metrics.unreadAlerts - 1) }
      ]
    : [];

  const financeSeries = metrics
    ? [
        { name: 'Revenus', value: Math.max(metrics.revenue, 0) },
        { name: 'Depenses', value: Math.max(metrics.expenses, 0) },
        { name: 'Benefice', value: Math.max(metrics.balance, 0) },
        { name: 'Stocks faibles', value: metrics.lowStockItems }
      ]
    : [];

  const radarSeries = metrics
    ? [
        { subject: 'Production', score: Math.max(35, Math.min(100, metrics.activeAnimals * 12 || 45)) },
        { subject: 'Sanitaire', score: Math.max(20, 100 - metrics.criticalSanitaryEvents * 24) },
        { subject: 'Finance', score: metrics.balance >= 0 ? 78 : 34 },
        { subject: 'Stocks', score: Math.max(24, 100 - metrics.lowStockItems * 18) },
        { subject: 'Planning', score: Math.max(26, 100 - metrics.overdueTasks * 21) }
      ]
    : [];

  const compositionSeries = metrics
    ? [
        { name: 'Actifs', value: metrics.activeAnimals },
        { name: 'Stocks faibles', value: metrics.lowStockItems },
        { name: 'Sanitaire critique', value: metrics.criticalSanitaryEvents },
        { name: 'Retards', value: metrics.overdueTasks }
      ]
    : [];

  const heroHighlights = metrics
    ? [
        {
          label: 'Animaux actifs',
          value: metrics.activeAnimals,
          note: 'Suivi des lots en temps réel'
        },
        {
          label: 'Taches du jour',
          value: metrics.agendaToday,
          note: metrics.overdueTasks > 0 ? `${metrics.overdueTasks} en retard` : 'Planning stabilisé'
        },
        {
          label: 'Alertes critiques',
          value: metrics.unreadAlerts,
          note: metrics.criticalSanitaryEvents > 0 ? 'Surveillance renforcée' : 'Risque contenu'
        },
        {
          label: 'Balance',
          value: metrics.balance.toFixed(0),
          note: metrics.balance >= 0 ? 'Marge positive' : 'Marge sous pression'
        }
      ]
    : [];

  return (
    <AppShell title={`Tableau de bord - ${dashboard?.farm.name ?? farmId}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="dashboard-hero-grid">
        <article className="dashboard-hero-card">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Vue exécutive</p>
              <h2 className="dashboard-hero-title">{dashboard?.farm.name ?? 'Tableau de bord de la ferme'}</h2>
            </div>
            <Badge variant={(metrics?.unreadAlerts ?? 0) > 0 ? 'warning' : 'success'}>
              {(metrics?.unreadAlerts ?? 0) > 0 ? `${metrics?.unreadAlerts ?? 0} signal(s)` : 'Stable'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Une lecture immédiate de la santé opérationnelle, du planning, du sanitaire et de la
            performance économique de la ferme.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <Sprout className="h-4 w-4" />
              {dashboard?.farm.activityType ?? 'Mixte'}
            </span>
            <span className="dashboard-hero-pill">
              <TrendingUp className="h-4 w-4" />
              {metrics?.balance ?? 0 >= 0 ? 'Tendance positive' : 'Marge sous pression'}
            </span>
            <span className="dashboard-hero-pill">
              <ShieldAlert className="h-4 w-4" />
              {metrics?.criticalSanitaryEvents ?? 0} critique(s)
            </span>
          </div>
          <div className="dashboard-hero-stat-grid">
            {heroHighlights.map((item, index) => (
              <motion.article
                key={item.label}
                className="dashboard-hero-stat"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="dashboard-hero-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <span>{item.note}</span>
              </motion.article>
            ))}
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Revenus bruts</span>
              <strong>{metrics?.revenue.toFixed(0) ?? '0'}</strong>
              <span>Flux consolidé sur la ferme</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Depenses</span>
              <strong>{metrics?.expenses.toFixed(0) ?? '0'}</strong>
              <span>Sorties suivies et regroupées</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Ferme</p>
              <h2>{dashboard?.farm.location ?? 'Chargement...'}</h2>
            </div>
            <div className="farm-module-icon">
              <LineChartIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="metric-list">
            <span>Statut : {dashboard?.farm.status ?? '-'}</span>
            <span>Activité : {dashboard?.farm.activityType ?? '-'}</span>
            <span>Alertes non lues : {metrics?.unreadAlerts ?? 0}</span>
          </div>
          <div className="hero-actions">
            <Link href={`/farms/${farmId}`}>
              <Button variant="secondary" className="dashboard-action-button dashboard-action-button-secondary">
                Retour à la fiche ferme
              </Button>
            </Link>
            <Link href={`/farms/${farmId}/reports`}>
              <Button className="dashboard-action-button dashboard-action-button-primary">
                Exporter un rapport
              </Button>
            </Link>
          </div>
        </article>
      </section>

      <section className="module-flow-strip">
        {dashboardWorkflowSteps.map((step, index) => {
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

      <section className="dashboard-kpi-grid">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.article
              key={kpi.label}
              className="metric-tile dashboard-kpi-tile"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="metric-header">
                <div className="metric-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={kpi.trend === 'up' ? 'metric-delta metric-delta-up' : 'metric-delta metric-delta-down'}>
                  <ArrowUpRight className={kpi.trend === 'down' ? 'inline h-4 w-4 rotate-90' : 'inline h-4 w-4'} />
                  {kpi.delta}
                </span>
              </div>
              <p className="eyebrow">{kpi.label}</p>
              <strong className="metric-number">{kpi.value}</strong>
            </motion.article>
          );
        })}
      </section>

      <section className="dashboard-summary-grid">
        <article className={`panel dashboard-summary-card ${(metrics?.balance ?? 0) < 0 ? 'alert-warning' : ''}`}>
          <p className="eyebrow">Finance</p>
          <h2>Solde {metrics ? metrics.balance.toFixed(2) : '0.00'}</h2>
          <div className="metric-list">
            <span>Revenus: {metrics ? metrics.revenue.toFixed(2) : '0.00'}</span>
            <span>Depenses: {metrics ? metrics.expenses.toFixed(2) : '0.00'}</span>
          </div>
          <Link href={`/farms/${farmId}/finance`} className="inline-link">
            Ouvrir les finances
          </Link>
        </article>
        <article className={`panel dashboard-summary-card ${(metrics?.overdueTasks ?? 0) > 0 ? 'alert-warning' : ''}`}>
          <p className="eyebrow">Agenda</p>
          <h2>{metrics?.agendaToday ?? 0} tâches du jour</h2>
          <div className="metric-list">
            <span>En retard: {metrics?.overdueTasks ?? 0}</span>
          </div>
          <Link href={`/farms/${farmId}/agenda`} className="inline-link">
            Voir l agenda
          </Link>
        </article>
        <article className={`panel dashboard-summary-card ${(metrics?.lowStockItems ?? 0) > 0 ? 'alert-warning' : ''}`}>
          <p className="eyebrow">Stocks</p>
          <h2>{metrics?.stockItems ?? 0} articles</h2>
          <div className="metric-list">
            <span>Seuil faible: {metrics?.lowStockItems ?? 0}</span>
          </div>
          <Link href={`/farms/${farmId}/inventory`} className="inline-link">
            Voir les stocks
          </Link>
        </article>
        <article className={`panel dashboard-summary-card ${(metrics?.criticalSanitaryEvents ?? 0) > 0 ? 'alert-critical' : ''}`}>
          <p className="eyebrow">Sanitaire</p>
          <h2>{metrics?.sanitaryEvents ?? 0} événements</h2>
          <div className="metric-list">
            <span>Critiques: {metrics?.criticalSanitaryEvents ?? 0}</span>
          </div>
          <Link href={`/farms/${farmId}/sanitary`} className="inline-link">
            Voir le suivi sanitaire
          </Link>
        </article>
      </section>

      <section className="dashboard-summary-grid dashboard-admin-grid">
        {adminQuickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.title} className="panel dashboard-summary-card dashboard-admin-card">
              <div className="dashboard-inline-actions">
                <div>
                  <p className="eyebrow">Administration</p>
                  <h2>{item.title}</h2>
                </div>
                <div className="farm-module-icon">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="muted">{item.description}</p>
              <Link href={`/farms/${farmId}/${item.href}`} className="inline-link">
                Ouvrir
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="dashboard-chart-grid">
        <article className="panel chart-panel dashboard-chart-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Flux operationnel</p>
              <h2>Charge de travail et alertes</h2>
            </div>
            <Badge variant="info">Semaine</Badge>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={operationsSeries}>
                <defs>
                  <linearGradient id="tasksFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(100,116,139,0.18)" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip />
                <Area type="monotone" dataKey="taches" stroke="#16A34A" fill="url(#tasksFill)" strokeWidth={3} />
                <Area type="monotone" dataKey="alertes" stroke="#F59E0B" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel dashboard-chart-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Performance</p>
              <h2>Radar de sante globale</h2>
            </div>
            <Badge variant="success">Score ferme</Badge>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarSeries}>
                <PolarGrid stroke="rgba(100,116,139,0.2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12 }} />
                <Radar dataKey="score" stroke="#16A34A" fill="#16A34A" fillOpacity={0.22} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboard-chart-grid">
        <article className="panel chart-panel dashboard-chart-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Repartition</p>
              <h2>Composition des signaux</h2>
            </div>
            <Badge variant="neutral">Live</Badge>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={compositionSeries} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={4}>
                  {compositionSeries.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chart-panel dashboard-chart-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Comparatif</p>
              <h2>Vue revenus / charges / risques</h2>
            </div>
            <Badge variant="info">Filtre 30j</Badge>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeSeries}>
                <CartesianGrid vertical={false} stroke="rgba(100,116,139,0.18)" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#16A34A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel dashboard-alerts-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Alertes recentes</p>
            <h2>Centre de vigilance</h2>
          </div>
          <Link href={`/farms/${farmId}/alerts`}>
            <Button variant="secondary" className="dashboard-action-button dashboard-action-button-secondary">
              Toutes les alertes
            </Button>
          </Link>
        </div>
        {dashboard?.recentAlerts.length ? (
          <div className="dashboard-alerts-grid">
            {dashboard.recentAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`table-row dashboard-alert-card ${alert.severity === 'CRITICAL' ? 'alert-critical' : alert.severity === 'WARNING' ? 'alert-warning' : 'alert-info'}`}
              >
                <div className="dashboard-inline-actions">
                  <strong>{alert.title}</strong>
                  <Badge
                    variant={
                      alert.severity === 'CRITICAL'
                        ? 'critical'
                        : alert.severity === 'WARNING'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {alert.severity}
                  </Badge>
                </div>
                <span>{new Date(alert.createdAt).toLocaleDateString('fr-FR')}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Aucune alerte recente.</p>
        )}
      </section>

      <section className="dashboard-insights-grid">
        <article className="insight-card alert-warning">
          <AlertTriangle className="mb-3 h-5 w-5 text-[var(--warning)]" />
          <strong>Risque prioritaire</strong>
          <p className="muted">
            {(metrics?.lowStockItems ?? 0) > 0
              ? `${metrics?.lowStockItems ?? 0} stock(s) faible(s) exigent un reapprovisionnement rapide.`
              : 'Aucun risque stock immediat n est remonte.'}
          </p>
        </article>
        <article className="insight-card alert-info">
          <Boxes className="mb-3 h-5 w-5 text-[var(--info)]" />
          <strong>Capacite d execution</strong>
          <p className="muted">
            {(metrics?.agendaToday ?? 0) > 0
              ? `${metrics?.agendaToday ?? 0} action(s) planifiee(s) aujourd hui pour garder le cap.`
              : 'Le planning du jour est encore leger, tu peux anticiper la semaine.'}
          </p>
        </article>
        <article className="insight-card alert-critical">
          <HeartPulse className="mb-3 h-5 w-5 text-[var(--critical)]" />
          <strong>Signal sanitaire</strong>
          <p className="muted">
            {(metrics?.criticalSanitaryEvents ?? 0) > 0
              ? `${metrics?.criticalSanitaryEvents ?? 0} événement(s) critique(s) doivent être traités sans attendre.`
              : 'Le niveau sanitaire remonte actuellement une situation stable.'}
          </p>
        </article>
      </section>
    </AppShell>
  );
}

