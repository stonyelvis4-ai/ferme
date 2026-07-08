import { apiFetch } from './api-client';

export interface AuditLogView {
  id: string;
  farmId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: 'ADMIN' | 'PROPRIETAIRE' | null;
  module: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actionType:
    | 'CREATION'
    | 'MODIFICATION'
    | 'SUPPRESSION'
    | 'ARCHIVAGE'
    | 'CONNEXION'
    | 'DECONNEXION'
    | 'VENTE'
    | 'PAIEMENT'
    | 'TACHE'
    | 'ALERTE'
    | 'SYNC';
  source: 'WEB' | 'MOBILE' | 'SYNCHRONISATION_HORS_LIGNE' | 'SYSTEME';
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  createdAt: string;
}

export function getAuditLogs(
  farmId: string,
  token: string,
  filters: { module?: string; actionType?: string; limit?: number } = {}
) {
  const query = new URLSearchParams();
  query.set('farmId', farmId);
  if (filters.module) query.set('module', filters.module);
  if (filters.actionType) query.set('actionType', filters.actionType);
  if (filters.limit) query.set('limit', String(filters.limit));

  return apiFetch<{ items: AuditLogView[] }>(`/audit/logs?${query.toString()}`, undefined, token);
}

export function getUserHistory(userId: string, token: string) {
  return apiFetch<{ items: Array<{
    id: string;
    actionType: 'CONNEXION' | 'DECONNEXION';
    source: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
  }> }>(`/audit/users/${userId}/history`, undefined, token);
}
