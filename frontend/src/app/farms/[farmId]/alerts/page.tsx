'use client';

import { motion } from 'framer-motion';
import { BellRing, CheckCheck, ShieldAlert, Siren, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useAlertSound } from '../../../../hooks/use-alert-sound';
import { useSession } from '../../../../hooks/use-session';
import {
  acknowledgeAlert,
  getFarm,
  getFarmAlerts,
  ignoreAlert,
  markAlertAsRead,
  resolveAlert,
  type AlertView
} from '../../../../services/farm-client';

const alertWorkflowSteps = [
  { title: 'Détection', icon: BellRing },
  { title: 'Priorité', icon: Siren },
  { title: 'Action', icon: CheckCheck },
  { title: 'Son', icon: Volume2 }
] as const;

export default function FarmAlertsPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const hasPlayedInitialAlertSound = useRef(false);
  const { isEnabled, playAlertSound, primeAudio, toggleEnabled } = useAlertSound();

  function refreshAlerts(activeFarmId: string, token: string) {
    return getFarmAlerts(activeFarmId, token).then((response) => setAlerts(response.items));
  }

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    primeAudio();
  }, [primeAudio]);

  useEffect(() => {
    hasPlayedInitialAlertSound.current = false;
  }, [farmId]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    getFarm(farmId, session.token)
      .then((farm) => setFarmName(farm.name))
      .catch(() => setFarmName(`Ferme ${farmId}`));

    refreshAlerts(farmId, session.token).catch(() => setAlerts([]));
  }, [farmId, session?.token]);

  function handleMarkRead(alertId: string) {
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      await markAlertAsRead(farmId, alertId, session.token);
      await refreshAlerts(farmId, session.token);
    });
  }

  function handleTransition(
    alertId: string,
    action: 'acknowledge' | 'resolve' | 'ignore'
  ) {
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      if (action === 'acknowledge') {
        await acknowledgeAlert(farmId, alertId, session.token);
      } else if (action === 'resolve') {
        await resolveAlert(farmId, alertId, session.token);
      } else {
        await ignoreAlert(farmId, alertId, session.token);
      }

      await refreshAlerts(farmId, session.token);
    });
  }

  const actionableAlerts = alerts.filter(
    (alert) => alert.status !== 'RESOLVED' && alert.status !== 'IGNORED'
  );
  const unreadAlerts = alerts.filter((alert) => !alert.readAt);
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'CRITICAL');
  const warningAlerts = alerts.filter((alert) => alert.severity === 'WARNING');
  const acknowledgedAlerts = alerts.filter((alert) => alert.status === 'ACKNOWLEDGED');
  const resolvedAlerts = alerts.filter((alert) => alert.status === 'RESOLVED');

  useEffect(() => {
    if (!unreadAlerts.length || hasPlayedInitialAlertSound.current) {
      return;
    }

    hasPlayedInitialAlertSound.current = true;
    void playAlertSound();
  }, [unreadAlerts.length, playAlertSound]);

  return (
    <AppShell title={`Centre d'alertes - ${farmName}`}>
      <section className="dashboard-hero-grid">
        <article className="dashboard-hero-card">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Centre d’attention</p>
              <h2 className="dashboard-hero-title">Des alertes plus claires, plus actionnables</h2>
            </div>
            <Badge variant={criticalAlerts.length ? 'critical' : unreadAlerts.length ? 'warning' : 'success'}>
              {criticalAlerts.length ? 'Urgence active' : unreadAlerts.length ? 'À traiter' : 'Sous contrôle'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Centralisez les signaux critiques, priorisez les alertes métier et accusez leur
            réception dans une interface plus lisible.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <Siren className="h-4 w-4" />
              {criticalAlerts.length} critique(s)
            </span>
            <span className="dashboard-hero-pill">
              <BellRing className="h-4 w-4" />
              {warningAlerts.length} avertissement(s)
            </span>
            <span className="dashboard-hero-pill">
              <CheckCheck className="h-4 w-4" />
              {acknowledgedAlerts.length} accusée(s)
            </span>
          </div>
          <div className="dashboard-hero-stat-grid dashboard-alerts-hero-grid">
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Non lues</span>
              <strong>{unreadAlerts.length}</strong>
              <span>Signalement à traiter en priorité</span>
            </article>
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Actives</span>
              <strong>{actionableAlerts.length}</strong>
              <span>Alertes encore en cours de traitement</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Résolues</span>
              <strong>{resolvedAlerts.length}</strong>
              <span>Historique déjà clôturé</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">État courant</p>
              <h2>{farmName}</h2>
            </div>
            <div className="farm-module-icon">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="metric-list">
            <span>Total : {alerts.length}</span>
            <span>Actives : {actionableAlerts.length}</span>
            <span>Critiques : {criticalAlerts.length}</span>
          </div>
          <div className="alert-sound-controls">
              <Button type="button" variant="secondary" className="alert-action-button alert-action-button-primary" onClick={() => void playAlertSound()}>
              <BellRing className="h-4 w-4" />
              Tester l’alarme
            </Button>
            <Button type="button" variant="ghost" className="alert-action-button alert-action-button-secondary" onClick={toggleEnabled}>
              {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {isEnabled ? 'Couper le son' : 'Activer le son'}
            </Button>
          </div>
          <p className="muted">
            Alarme sonore {isEnabled ? 'active' : 'désactivée'} pour les nouvelles alertes.
          </p>
        </article>
      </section>

      <section className="module-flow-strip">
        {alertWorkflowSteps.map((step, index) => {
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
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <BellRing className="h-5 w-5" />
            </div>
            <Badge variant="info">Flux</Badge>
          </div>
          <p className="eyebrow">Alertes totales</p>
          <strong className="metric-number">{alerts.length}</strong>
          <span className="metric-delta">{actionableAlerts.length} encore actives</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <Badge variant={criticalAlerts.length ? 'critical' : 'success'}>Priorité</Badge>
          </div>
          <p className="eyebrow">Critiques</p>
          <strong className="metric-number">{criticalAlerts.length}</strong>
          <span className="metric-delta">Réactions immédiates requises</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <CheckCheck className="h-5 w-5" />
            </div>
            <Badge variant={unreadAlerts.length ? 'warning' : 'success'}>Traitement</Badge>
          </div>
          <p className="eyebrow">Non lues</p>
          <strong className="metric-number">{unreadAlerts.length}</strong>
          <span className="metric-delta">Éléments en attente d’accusé</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <CheckCheck className="h-5 w-5" />
            </div>
            <Badge variant={resolvedAlerts.length ? 'info' : 'neutral'}>Suivi</Badge>
          </div>
          <p className="eyebrow">Résolues</p>
          <strong className="metric-number">{resolvedAlerts.length}</strong>
          <span className="metric-delta">{acknowledgedAlerts.length} accusées en suivi</span>
        </article>
      </section>

      <section className="panel dashboard-alerts-panel">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Flux d’alertes</p>
            <h2>Traitement, priorisation et accusé de réception</h2>
          </div>
          <Badge variant={unreadAlerts.length ? 'warning' : 'success'}>
            {unreadAlerts.length ? 'Intervention recommandée' : 'Tout est sous contrôle'}
          </Badge>
        </div>
        <div className="alerts-list">
          {alerts.length ? (
            alerts.map((alert, index) => (
              <motion.article
                key={alert.id}
                className={`panel alert-card alert-premium alert-${alert.severity.toLowerCase()} ${
                  alert.readAt ? 'alert-read' : ''
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="alert-card-head">
                  <div>
                    <p className="eyebrow">Alerte {alert.severity}</p>
                    <h2>{alert.title}</h2>
                  </div>
                  <Badge
                    variant={
                      alert.readAt
                        ? 'neutral'
                        : alert.severity === 'CRITICAL'
                          ? 'critical'
                          : alert.severity === 'WARNING'
                            ? 'warning'
                            : 'info'
                    }
                  >
                    {formatAlertStatus(alert.status)}
                  </Badge>
                </div>
                <p>{alert.message}</p>
                <div className="metric-list">
                  <span>Type : {formatAlertType(alert.type)}</span>
                  <span>Priorité : {formatAlertPriority(alert.priority)}</span>
                  {alert.sourceModule ? <span>Module : {alert.sourceModule}</span> : null}
                </div>
                {alert.dueAt ? (
                  <p className="muted">Échéance : {new Date(alert.dueAt).toLocaleString('fr-FR')}</p>
                ) : null}
                <p className="muted">Créée le {new Date(alert.createdAt).toLocaleString('fr-FR')}</p>
                <div className="dashboard-inline-actions">
                  {!alert.readAt ? (
                    <Button type="button" disabled={isPending} className="alert-action-button alert-action-button-primary" onClick={() => handleMarkRead(alert.id)}>
                      <CheckCheck className="h-4 w-4" />
                      Marquer comme lue
                    </Button>
                  ) : null}
                  {alert.status !== 'ACKNOWLEDGED' && alert.status !== 'RESOLVED' && alert.status !== 'IGNORED' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      className="alert-action-button alert-action-button-secondary"
                      onClick={() => handleTransition(alert.id, 'acknowledge')}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Accuser réception
                    </Button>
                  ) : null}
                  {alert.status !== 'RESOLVED' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      className="alert-action-button alert-action-button-secondary"
                      onClick={() => handleTransition(alert.id, 'resolve')}
                    >
                      Résoudre
                    </Button>
                  ) : null}
                  {alert.status !== 'IGNORED' && alert.status !== 'RESOLVED' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isPending}
                      className="alert-action-button alert-action-button-ghost"
                      onClick={() => handleTransition(alert.id, 'ignore')}
                    >
                      Ignorer
                    </Button>
                  ) : null}
                </div>
              </motion.article>
            ))
          ) : (
            <p className="muted">Aucune alerte disponible pour cette ferme.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function formatAlertStatus(status: AlertView['status']) {
  switch (status) {
    case 'NEW':
      return 'NOUVELLE';
    case 'PENDING':
      return 'EN ATTENTE';
    case 'ACKNOWLEDGED':
      return 'ACCUSEE';
    case 'RESOLVED':
      return 'RESOLUE';
    case 'IGNORED':
      return 'IGNOREE';
    default:
      return status;
  }
}

function formatAlertType(type: AlertView['type']) {
  switch (type) {
    case 'REMINDER':
      return 'Rappel';
    case 'OPERATIONAL':
      return 'Opérationnelle';
    case 'SYSTEM':
      return 'Système';
    default:
      return type;
  }
}

function formatAlertPriority(priority: AlertView['priority']) {
  switch (priority) {
    case 'LOW':
      return 'Faible';
    case 'MEDIUM':
      return 'Moyenne';
    case 'HIGH':
      return 'Haute';
    case 'URGENT':
      return 'Urgente';
    default:
      return priority;
  }
}

