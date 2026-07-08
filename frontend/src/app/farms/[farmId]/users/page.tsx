'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { AlertCircle, BadgeCheck, KeyRound, UserPlus2, Users, Clock3, MapPin } from 'lucide-react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useSession } from '../../../../hooks/use-session';
import { getFarms, type FarmSummary } from '../../../../services/farm-client';
import {
  assignUserFarms,
  createOwnerAccount,
  getUser,
  getUsers,
  resetUserPassword,
  setUserStatus,
  type ManagedUserDetail,
  type ManagedUserItem,
  type ManagedUserStatus
} from '../../../../services/user-client';

type CreateOwnerForm = {
  fullName: string;
  email: string;
  password: string;
};

const emptyCreateOwnerForm: CreateOwnerForm = {
  fullName: '',
  email: '',
  password: ''
};

function statusLabel(status: ManagedUserStatus) {
  if (status === 'ACTIVE') {
    return { label: 'Actif', variant: 'success' as const };
  }

  if (status === 'DISABLED') {
    return { label: 'Désactivé', variant: 'critical' as const };
  }

  return { label: 'En attente', variant: 'warning' as const };
}

export default function FarmUsersPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farm, setFarm] = useState<FarmSummary | null>(null);
  const [users, setUsers] = useState<ManagedUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagedUserDetail | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [availableFarms, setAvailableFarms] = useState<FarmSummary[]>([]);
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<{
    search: string;
    role: 'ALL' | 'ADMIN' | 'PROPRIETAIRE';
    status: 'ALL' | 'ACTIVE' | 'DISABLED' | 'PENDING';
  }>({ search: '', role: 'ALL', status: 'ALL' });
  const [createForm, setCreateForm] = useState<CreateOwnerForm>(emptyCreateOwnerForm);
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
      getUsers(session.token, {
        farmId,
        search: filters.search || undefined,
        role: filters.role,
        status: filters.status
      }),
      getFarms(session.token)
    ])
      .then(([userResponse, farmResponse]) => {
        if (cancelled) {
          return;
        }

        setUsers(userResponse.items);
        setAvailableFarms(farmResponse.items);
        setFarm(farmResponse.items.find((item) => item.id === farmId) ?? null);

        if (!selectedUserId && userResponse.items[0]) {
          setSelectedUserId(userResponse.items[0].id);
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
  }, [farmId, filters.role, filters.search, filters.status, selectedUserId, session?.token, session?.user.role]);

  useEffect(() => {
    if (!session?.token || !selectedUserId) {
      setSelectedUser(null);
      return;
    }

    let cancelled = false;
    getUser(selectedUserId, session.token)
      .then((detail) => {
        if (!cancelled) {
          setSelectedUser(detail);
          setSelectedFarmIds(detail.assignedFarms.map((item) => item.id));
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Chargement utilisateur impossible');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, session?.token]);

  const selectedSummary = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const visibleStats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((item) => item.status === 'ACTIVE').length,
      owners: users.filter((item) => item.role === 'PROPRIETAIRE').length,
      pendingReset: users.filter((item) => item.forcePasswordReset).length
    };
  }, [users]);

  function submitCreateOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await createOwnerAccount(
          {
            ...createForm,
            farmIds: selectedFarmIds.length ? selectedFarmIds : [farmId]
          },
          session.token
        );

        setCreateForm(emptyCreateOwnerForm);
        setMessage(`Compte propriétaire créé: ${response.owner.fullName}`);

        const refreshed = await getUsers(session.token, {
          farmId,
          search: filters.search || undefined,
          role: filters.role,
          status: filters.status
        });
        setUsers(refreshed.items);
        setSelectedUserId(response.owner.id);
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : 'Création impossible');
      }
    });
  }

  function updateSelectedUser(action: () => Promise<unknown>, successMessage: string) {
    if (!session?.token || !selectedUserId) {
      return;
    }

    startTransition(async () => {
      try {
        await action();
        setMessage(successMessage);
        const refreshed = await getUsers(session.token, {
          farmId,
          search: filters.search || undefined,
          role: filters.role,
          status: filters.status
        });
        setUsers(refreshed.items);
        const detail = await getUser(selectedUserId, session.token);
        setSelectedUser(detail);
        setSelectedFarmIds(detail.assignedFarms.map((item) => item.id));
      } catch (mutationError) {
        setError(mutationError instanceof Error ? mutationError.message : 'Opération impossible');
      }
    });
  }

  return (
    <AppShell
      title={`Utilisateurs - ${farm?.name ?? 'Ferme'}`}
      actions={
        <Link href={`/farms/${farmId}/settings`}>
          <Button variant="secondary" className="dashboard-action-button dashboard-action-button-secondary">
            Paramètres ferme
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
              <p className="eyebrow">Gouvernance des comptes</p>
              <h2 className="dashboard-hero-title">Administre les propriétaires et leurs accès</h2>
            </div>
            <Badge variant="info">Admin</Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Crée les comptes propriétaires, assigne plusieurs fermes, verrouille les accès et consulte l’historique de
            connexion depuis un seul écran.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <Users className="h-4 w-4" />
              {visibleStats.total} comptes
            </span>
            <span className="dashboard-hero-pill">
              <BadgeCheck className="h-4 w-4" />
              {visibleStats.active} actifs
            </span>
            <span className="dashboard-hero-pill">
              <KeyRound className="h-4 w-4" />
              {visibleStats.pendingReset} à réinitialiser
            </span>
          </div>
          <div className="dashboard-hero-stat-grid">
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Utilisateurs</span>
              <strong>{visibleStats.total}</strong>
              <span>comptes visibles</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Propriétaires</span>
              <strong>{visibleStats.owners}</strong>
              <span>profil lecture seule</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Ferme active</span>
              <strong>{farm?.name ?? 'Sélectionnée'}</strong>
              <span>contexte courant</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Liste</p>
              <h2>Comptes liés à la ferme</h2>
            </div>
            <Badge variant="neutral">{users.length}</Badge>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Recherche</span>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Nom, email..."
              />
            </label>
            <label className="field">
              <span>Rôle</span>
              <select
                value={filters.role}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, role: event.target.value as typeof current.role }))
                }
              >
                <option value="ALL">Tous</option>
                <option value="ADMIN">Administrateur</option>
                <option value="PROPRIETAIRE">Propriétaire</option>
              </select>
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Statut</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value as typeof current.status }))
                }
              >
                <option value="ALL">Tous</option>
                <option value="ACTIVE">Actifs</option>
                <option value="PENDING">En attente</option>
                <option value="DISABLED">Désactivés</option>
              </select>
            </label>
            <label className="field">
              <span>Ferme active</span>
              <input value={farm?.name ?? farmId} disabled />
            </label>
          </div>

          <div className="data-table-shell">
            <div className="data-table-row data-table-head">
              <span>Compte</span>
              <span>Statut</span>
              <span>Fermes</span>
            </div>
            <div className="table-list">
              {users.map((item) => {
                const badge = statusLabel(item.status);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`data-table-row data-table-button ${selectedUserId === item.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedUserId(item.id)}
                  >
                    <span>
                      <strong>{item.fullName}</strong>
                      <small>{item.email}</small>
                    </span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span>{item.assignedFarmCount}</span>
                  </button>
                );
              })}
              {!users.length ? (
                <div className="empty-state-panel">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <strong>Aucun compte trouvé</strong>
                    <p>Essaie un autre filtre ou crée un nouveau propriétaire.</p>
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
              <p className="eyebrow">Détail</p>
              <h2>{selectedSummary?.fullName ?? 'Sélectionne un compte'}</h2>
            </div>
            {selectedSummary ? <Badge variant={statusLabel(selectedSummary.status).variant}>{statusLabel(selectedSummary.status).label}</Badge> : null}
          </div>

          {selectedUser ? (
            <>
              <div className="metric-list">
                <article className="metric-card">
                  <span className="metric-label">Email</span>
                  <strong>{selectedUser.email}</strong>
                </article>
                <article className="metric-card">
                  <span className="metric-label">Dernière activité</span>
                  <strong>{selectedUser.lastActivityAt ? new Date(selectedUser.lastActivityAt).toLocaleString('fr-FR') : 'Aucune'}</strong>
                </article>
                <article className="metric-card">
                  <span className="metric-label">Dernière connexion</span>
                  <strong>{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('fr-FR') : 'Aucune'}</strong>
                </article>
              </div>

              <div className="data-tags">
                {selectedUser.assignedFarms.map((farmItem) => (
                  <span key={farmItem.id} className="dashboard-hero-pill">
                    <MapPin className="h-4 w-4" />
                    {farmItem.name}
                  </span>
                ))}
              </div>

              <div className="hero-actions">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    updateSelectedUser(
                      () => setUserStatus(selectedUser.id, { status: 'ACTIVE' }, session!.token),
                      'Compte activé.'
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
                    updateSelectedUser(
                      () => setUserStatus(selectedUser.id, { status: 'DISABLED', reason: 'Désactivation manuelle' }, session!.token),
                      'Compte désactivé.'
                    )
                  }
                >
                  Désactiver
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    updateSelectedUser(() => resetUserPassword(selectedUser.id, session!.token), 'Mot de passe réinitialisé.')
                  }
                >
                  Réinitialiser le mot de passe
                </Button>
              </div>

              <div className="stack-form">
                <div className="dashboard-inline-actions">
                  <div>
                    <p className="eyebrow">Assignation</p>
                    <h3>Fermes liées</h3>
                  </div>
                </div>
                <div className="field-grid">
                  {availableFarms.map((farmItem) => (
                    <label key={farmItem.id} className="field field-inline-check">
                      <input
                        type="checkbox"
                        checked={selectedFarmIds.includes(farmItem.id)}
                        onChange={(event) => {
                          setSelectedFarmIds((current) =>
                            event.target.checked
                              ? [...current, farmItem.id]
                              : current.filter((id) => id !== farmItem.id)
                          );
                        }}
                      />
                      <span>
                        <strong>{farmItem.name}</strong>
                        <small>{farmItem.location}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="hero-actions">
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      updateSelectedUser(
                        () => assignUserFarms(selectedUser.id, { farmIds: selectedFarmIds }, session!.token),
                        'Fermes assignées.'
                      )
                    }
                  >
                    Enregistrer l’assignation
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state-panel">
              <Users className="h-5 w-5" />
              <div>
                <strong>Choisis un utilisateur</strong>
                <p>Son activité, ses fermes et son historique s’afficheront ici.</p>
              </div>
            </div>
          )}
        </article>

        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Création</p>
              <h2>Créer un propriétaire</h2>
            </div>
            <Badge variant="warning">Admin</Badge>
          </div>

          <form className="stack-form" onSubmit={submitCreateOwner}>
            <div className="field-grid">
              <label className="field">
                <span>Nom complet</span>
                <input
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Nom du propriétaire"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="proprietaire@ferme.com"
                />
              </label>
              <label className="field">
                <span>Mot de passe initial</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Mot de passe temporaire"
                />
              </label>
              <label className="field">
                <span>Fermes à relier</span>
                <select
                  value={selectedFarmIds[0] ?? farmId}
                  onChange={(event) =>
                    setSelectedFarmIds((current) =>
                      [...new Set([farmId, event.target.value, ...current])].filter(Boolean)
                    )
                  }
                >
                  <option value={farmId}>{farm?.name ?? 'Ferme courante'}</option>
                  {availableFarms.map((farmItem) => (
                    <option key={farmItem.id} value={farmItem.id}>
                      {farmItem.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hero-actions">
              <Button type="submit" disabled={isPending}>
                <UserPlus2 className="h-4 w-4" />
                Créer le propriétaire
              </Button>
            </div>
          </form>
        </article>

        <article className="panel dashboard-summary-card">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Connexion</p>
              <h2>Historique du compte</h2>
            </div>
            <Badge variant="neutral">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {selectedUser?.loginHistory.length ?? 0}
            </Badge>
          </div>

          {selectedUser?.loginHistory?.length ? (
            <div className="timeline-list">
              {selectedUser.loginHistory.map((entry) => (
                <article key={entry.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div>
                    <strong>
                      {entry.actionType === 'CONNEXION' ? 'Connexion' : 'Déconnexion'} - {entry.source}
                    </strong>
                    <p>
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : 'Date inconnue'}
                    </p>
                    {entry.userAgent ? <small>{entry.userAgent}</small> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state-panel">
              <KeyRound className="h-5 w-5" />
              <div>
                <strong>Aucun historique</strong>
                <p>Les connexions et déconnexions apparaîtront ici.</p>
              </div>
            </div>
          )}
        </article>
      </section>
    </AppShell>
  );
}
