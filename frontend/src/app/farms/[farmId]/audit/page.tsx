'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { ClipboardList, Filter, History, ShieldCheck, UserCheck2 } from 'lucide-react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useSession } from '../../../../hooks/use-session';
import { getAuditLogs, type AuditLogView } from '../../../../services/audit-client';
import { getFarm, type FarmSummary } from '../../../../services/farm-client';

export default function FarmAuditPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farm, setFarm] = useState<FarmSummary | null>(null);
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [filters, setFilters] = useState({ module: '', actionType: '', limit: 60 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    let cancelled = false;

    Promise.all([
      getFarm(farmId, session.token),
      getAuditLogs(farmId, session.token, filters)
    ])
      .then(([farmResponse, auditResponse]) => {
        if (cancelled) {
          return;
        }

        setFarm(farmResponse);
        setLogs(auditResponse.items);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Chargement impossible');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [farmId, filters.actionType, filters.limit, filters.module, session?.token]);

  const summary = useMemo(
    () => ({
      total: logs.length,
      creations: logs.filter((item) => item.actionType === 'CREATION').length,
      updates: logs.filter((item) => item.actionType === 'MODIFICATION').length,
      syncs: logs.filter((item) => item.actionType === 'SYNC').length
    }),
    [logs]
  );

  function refreshLogs() {
    if (!session?.token || !farmId) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await getAuditLogs(farmId, session.token, filters);
        setLogs(response.items);
        setMessage('Journal actualisé.');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Actualisation impossible');
      }
    });
  }

  return (
    <AppShell
      title={`Journal d’audit - ${farm?.name ?? 'Ferme'}`}
      actions={
        <Link href={`/farms/${farmId}/users`}>
          <Button variant="secondary" className="dashboard-action-button dashboard-action-button-secondary">
            Voir les utilisateurs
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
              <p className="eyebrow">Traçabilité globale</p>
              <h2 className="dashboard-hero-title">Tout ce qui compte est tracé</h2>
            </div>
            <Badge variant="info">Audit</Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Les opérations de fermes, utilisateurs, tâches, stocks, finances et synchronisation convergent ici dans
            un journal unique, filtrable et lisible.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <ShieldCheck className="h-4 w-4" />
              Sécurité
            </span>
            <span className="dashboard-hero-pill">
              <History className="h-4 w-4" />
              Historique
            </span>
            <span className="dashboard-hero-pill">
              <UserCheck2 className="h-4 w-4" />
              Action utilisateur
            </span>
          </div>
          <div className="dashboard-hero-stat-grid">
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Actions</span>
              <strong>{summary.total}</strong>
              <span>sur la sélection</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Créations</span>
              <strong>{summary.creations}</strong>
              <span>nouvelles traces</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Mises à jour</span>
              <strong>{summary.updates}</strong>
              <span>modifications suivies</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Filtres</p>
              <h2>Affiner le journal</h2>
            </div>
            <Badge variant="neutral">
              <Filter className="mr-1 h-3.5 w-3.5" />
              {summary.syncs} sync
            </Badge>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Module</span>
              <input
                value={filters.module}
                onChange={(event) => setFilters((current) => ({ ...current, module: event.target.value }))}
                placeholder="users, settings, production..."
              />
            </label>
            <label className="field">
              <span>Action</span>
              <select
                value={filters.actionType}
                onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))}
              >
                <option value="">Toutes</option>
                <option value="CREATION">Création</option>
                <option value="MODIFICATION">Modification</option>
                <option value="SUPPRESSION">Suppression</option>
                <option value="ARCHIVAGE">Archivage</option>
                <option value="CONNEXION">Connexion</option>
                <option value="DECONNEXION">Déconnexion</option>
                <option value="SYNC">Synchronisation</option>
              </select>
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Limite</span>
              <select
                value={filters.limit}
                onChange={(event) => setFilters((current) => ({ ...current, limit: Number(event.target.value) }))}
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={60}>60</option>
                <option value={100}>100</option>
              </select>
            </label>
            <div className="hero-actions">
              <Button type="button" variant="secondary" onClick={refreshLogs} disabled={isPending}>
                Actualiser
              </Button>
            </div>
          </div>

          <div className="data-table-shell">
            <div className="data-table-row data-table-head">
              <span>Action</span>
              <span>Utilisateur</span>
              <span>Date</span>
            </div>
            <div className="table-list">
              {logs.map((log) => (
                <article key={log.id} className="data-table-row audit-log-row">
                  <span>
                    <strong>{log.entityLabel ?? log.entityType}</strong>
                    <small>
                      {log.module} • {log.entityType}
                    </small>
                  </span>
                  <span>
                    <strong>{log.userName ?? 'Système'}</strong>
                    <small>{log.userEmail ?? log.source}</small>
                  </span>
                  <span>{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                </article>
              ))}
              {!logs.length ? (
                <div className="empty-state-panel">
                  <ClipboardList className="h-5 w-5" />
                  <div>
                    <strong>Aucune entrée</strong>
                    <p>Les actions importantes apparaîtront ici.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
