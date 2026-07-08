'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { CloudCog, CloudOff, DatabaseZap, RefreshCw, Smartphone } from 'lucide-react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useNetworkStatus } from '../../../../hooks/use-network-status';
import { useSession } from '../../../../hooks/use-session';
import { getFarm, type FarmSummary } from '../../../../services/farm-client';
import { enqueueOfflineAction, readOfflineQueue, clearOfflineQueue } from '../../../../lib/offline-sync';
import { getSyncCenter, pushSyncBatch, type SyncQueueItem } from '../../../../services/sync-client';

export default function FarmSyncPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const { online, queueCount } = useNetworkStatus();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farm, setFarm] = useState<FarmSummary | null>(null);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [localQueue, setLocalQueue] = useState(readOfflineQueue());
  const [summary, setSummary] = useState({ pending: 0, applied: 0, failed: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    setLocalQueue(readOfflineQueue());
    const handleQueueUpdate = () => setLocalQueue(readOfflineQueue());
    window.addEventListener('ferm-plus-offline-state', handleQueueUpdate);
    window.addEventListener('storage', handleQueueUpdate);

    return () => {
      window.removeEventListener('ferm-plus-offline-state', handleQueueUpdate);
      window.removeEventListener('storage', handleQueueUpdate);
    };
  }, []);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    let cancelled = false;
    Promise.all([
      getFarm(farmId, session.token),
      getSyncCenter(farmId, session.token)
    ])
      .then(([farmResponse, syncResponse]) => {
        if (cancelled) {
          return;
        }

        setFarm(farmResponse);
        setQueueItems(syncResponse.items);
        setSummary(syncResponse.summary);
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

  const localSummary = useMemo(
    () => ({
      pending: localQueue.filter((item) => item.status === 'PENDING').length,
      syncing: localQueue.filter((item) => item.status === 'SYNCING').length,
      failed: localQueue.filter((item) => item.status === 'FAILED').length
    }),
    [localQueue]
  );

  function pushLocalQueue() {
    if (!session?.token || !farmId) {
      return;
    }

    const actions = localQueue.map((item) => ({
      clientMutationId: item.id,
      module: item.module,
      entityType: item.entityType,
      entityId: item.entityId,
      entityLabel: item.entityLabel,
      actionType: item.actionType,
      payload: {
        ...item.payload,
        localCreatedAt: item.createdAt
      }
    }));

    startTransition(async () => {
      try {
        const response = await pushSyncBatch(
          {
            farmId,
            actions
          },
          session.token
        );

        clearOfflineQueue();
        setLocalQueue(readOfflineQueue());
        const syncResponse = await getSyncCenter(farmId, session.token);
        setQueueItems(syncResponse.items);
        setSummary(syncResponse.summary);
        setMessage(`Synchronisation terminée: ${response.applied} appliquée(s), ${response.failed} en erreur.`);
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : 'Synchronisation impossible');
      }
    });
  }

  function simulateOfflineAction() {
    enqueueOfflineAction({
      farmId,
      module: 'agenda',
      entityType: 'AgendaTask',
      entityId: `task-${Date.now()}`,
      entityLabel: 'Suivi terrain local',
      actionType: 'TACHE',
      payload: {
        title: 'Suivi terrain local',
        description: 'Action créée hors ligne pour test',
        priority: 'HIGH'
      }
    });
    setLocalQueue(readOfflineQueue());
    setMessage('Action locale ajoutée à la file.');
  }

  return (
    <AppShell
      title={`Synchronisation - ${farm?.name ?? 'Ferme'}`}
      actions={
        <Link href={`/farms/${farmId}/audit`}>
          <Button variant="secondary" className="dashboard-action-button dashboard-action-button-secondary">
            Voir le journal
          </Button>
        </Link>
      }
    >
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}

      <section className="dashboard-hero-grid">
        <article className="dashboard-hero-card">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Terrain et synchronisation</p>
              <h2 className="dashboard-hero-title">{online ? 'Connexion stable' : 'Mode hors-ligne actif'}</h2>
            </div>
            <Badge variant={online ? 'success' : 'critical'}>
              {online ? <CloudCog className="mr-1 h-3.5 w-3.5" /> : <CloudOff className="mr-1 h-3.5 w-3.5" />}
              {online ? 'En ligne' : 'Hors-ligne'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Les actions terrain peuvent être mises en file locale puis renvoyées vers le backend quand la connexion
            revient. Le système évite les doublons via un identifiant de mutation unique.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <Smartphone className="h-4 w-4" />
              File locale
            </span>
            <span className="dashboard-hero-pill">
              <DatabaseZap className="h-4 w-4" />
              Synchronisation
            </span>
            <span className="dashboard-hero-pill">
              <RefreshCw className="h-4 w-4" />
              Doublons évités
            </span>
          </div>
          <div className="dashboard-hero-stat-grid">
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Local</span>
              <strong>{queueCount}</strong>
              <span>actions en attente</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Backend</span>
              <strong>{summary.applied}</strong>
              <span>actions appliquées</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Erreurs</span>
              <strong>{summary.failed + localSummary.failed}</strong>
              <span>à traiter</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">File locale</p>
              <h2>{localQueue.length} action(s) enregistrée(s)</h2>
            </div>
            <Badge variant="neutral">
              {localSummary.pending} en attente
            </Badge>
          </div>

          <div className="hero-actions">
            <Button type="button" variant="secondary" onClick={simulateOfflineAction}>
              Ajouter une action locale test
            </Button>
            <Button type="button" onClick={pushLocalQueue} disabled={!localQueue.length || isPending}>
              Synchroniser maintenant
            </Button>
          </div>

          <div className="data-table-shell">
            <div className="data-table-row data-table-head">
              <span>Action locale</span>
              <span>Module</span>
              <span>État</span>
            </div>
            <div className="table-list">
              {localQueue.map((entry) => (
                <article key={entry.id} className="data-table-row audit-log-row">
                  <span>
                    <strong>{entry.entityLabel ?? entry.entityType}</strong>
                    <small>{entry.actionType}</small>
                  </span>
                  <span>
                    <strong>{entry.module}</strong>
                    <small>{entry.farmId ?? farmId}</small>
                  </span>
                  <span>
                    <Badge
                      variant={
                        entry.status === 'FAILED'
                          ? 'critical'
                          : entry.status === 'SYNCED'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {entry.status}
                    </Badge>
                  </span>
                </article>
              ))}
              {!localQueue.length ? (
                <div className="empty-state-panel">
                  <CloudOff className="h-5 w-5" />
                  <div>
                    <strong>Aucune action locale</strong>
                    <p>Ajoute une action test ou attends qu’une page métier mette une action en file.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-summary-grid">
        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Backend</p>
              <h2>Synchronisation reçue</h2>
            </div>
            <Badge variant="info">{queueItems.length}</Badge>
          </div>

          <div className="data-table-shell">
            <div className="data-table-row data-table-head">
              <span>Élément</span>
              <span>Statut</span>
              <span>Date</span>
            </div>
            <div className="table-list">
              {queueItems.map((item) => (
                <article key={item.id} className="data-table-row audit-log-row">
                  <span>
                    <strong>{item.entityLabel ?? item.entityType}</strong>
                    <small>{item.module}</small>
                  </span>
                  <span>
                    <Badge
                      variant={
                        item.status === 'FAILED'
                          ? 'critical'
                          : item.status === 'APPLIED'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {item.status}
                    </Badge>
                  </span>
                  <span>{new Date(item.createdAt).toLocaleString('fr-FR')}</span>
                </article>
              ))}
              {!queueItems.length ? (
                <div className="empty-state-panel">
                  <DatabaseZap className="h-5 w-5" />
                  <div>
                    <strong>Aucune donnée synchronisée</strong>
                    <p>Le serveur n’a encore reçu aucune file de synchronisation pour cette ferme.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </article>

        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Conseil terrain</p>
              <h2>Mode hors-ligne prêt</h2>
            </div>
            <Badge variant={online ? 'success' : 'critical'}>{online ? 'Connecté' : 'Déconnecté'}</Badge>
          </div>
          <p className="hero-copy">
            Lorsque tu ajoutes ensuite une action hors-ligne dans les modules opérationnels, elle doit d’abord rester
            locale puis remonter ici pour être envoyée au backend dès que le réseau revient.
          </p>
          <div className="hero-actions">
            <Button variant="secondary" type="button" onClick={() => setLocalQueue(readOfflineQueue())}>
              Recharger la file locale
            </Button>
            <Button variant="secondary" type="button" onClick={() => clearOfflineQueue()}>
              Vider la file locale
            </Button>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
