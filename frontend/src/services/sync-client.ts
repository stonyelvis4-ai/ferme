import { apiFetch } from './api-client';

export interface SyncQueueItem {
  id: string;
  farmId: string | null;
  userId: string | null;
  module: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  actionType:
    | 'CREATION'
    | 'MODIFICATION'
    | 'SUPPRESSION'
    | 'ARCHIVAGE'
    | 'VENTE'
    | 'PAIEMENT'
    | 'TACHE'
    | 'ALERTE'
    | 'SYNC';
  source: 'WEB' | 'MOBILE' | 'SYNCHRONISATION_HORS_LIGNE' | 'SYSTEME';
  clientMutationId: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPLIED' | 'FAILED';
  errorMessage: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export function getSyncCenter(farmId: string | undefined, token: string) {
  const query = farmId ? `?farmId=${encodeURIComponent(farmId)}` : '';
  return apiFetch<{
    items: SyncQueueItem[];
    summary: { pending: number; applied: number; failed: number };
    offline: boolean;
  }>(`/sync${query}`, undefined, token);
}

export function pushSyncBatch(
  payload: {
    farmId?: string;
    actions: Array<{
      clientMutationId: string;
      module: string;
      entityType: string;
      entityId?: string;
      entityLabel?: string;
      actionType: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION' | 'ARCHIVAGE' | 'VENTE' | 'PAIEMENT' | 'TACHE' | 'ALERTE';
      payload: Record<string, unknown>;
    }>;
  },
  token: string
) {
  return apiFetch<{
    applied: number;
    failed: number;
    items: Array<{ clientMutationId: string; status: 'APPLIED' | 'FAILED'; errorMessage: string | null }>;
  }>(
    '/sync/batch',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    },
    token
  );
}
