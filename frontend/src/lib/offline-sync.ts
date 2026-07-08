export type OfflineActionType =
  | 'CREATION'
  | 'MODIFICATION'
  | 'SUPPRESSION'
  | 'ARCHIVAGE'
  | 'VENTE'
  | 'PAIEMENT'
  | 'TACHE'
  | 'ALERTE';

export interface OfflineQueueEntry {
  id: string;
  farmId?: string;
  module: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  actionType: OfflineActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string | null;
}

const OFFLINE_QUEUE_KEY = 'ferm-plus-offline-queue';
const OFFLINE_STATE_EVENT = 'ferm-plus-offline-state';

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function emitQueueChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(OFFLINE_STATE_EVENT));
}

export function readOfflineQueue(): OfflineQueueEntry[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as OfflineQueueEntry[];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueEntry[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  emitQueueChange();
}

export function enqueueOfflineAction(
  action: Omit<OfflineQueueEntry, 'id' | 'createdAt' | 'status'>
) {
  const nextEntry: OfflineQueueEntry = {
    ...action,
    id: globalThis.crypto?.randomUUID?.() ?? `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    status: 'PENDING'
  };

  const nextQueue = [nextEntry, ...readOfflineQueue()];
  saveOfflineQueue(nextQueue);
  return nextEntry;
}

export function updateOfflineEntry(id: string, patch: Partial<OfflineQueueEntry>) {
  const nextQueue = readOfflineQueue().map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
  saveOfflineQueue(nextQueue);
}

export function removeOfflineEntry(id: string) {
  const nextQueue = readOfflineQueue().filter((entry) => entry.id !== id);
  saveOfflineQueue(nextQueue);
}

export function clearOfflineQueue() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(OFFLINE_QUEUE_KEY);
  emitQueueChange();
}

export function getOfflineQueueCount() {
  return readOfflineQueue().length;
}

export function subscribeOfflineQueue(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => callback();
  window.addEventListener(OFFLINE_STATE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(OFFLINE_STATE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
