/**
 * A small, durable queue for writes that could not reach the API.  It is
 * deliberately transport-agnostic: callers decide how an operation is sent,
 * then remove it only after the server confirms it.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type OfflineOperationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OfflineOutboxScope {
  userId: string | number;
  farmId: string | number;
}

export interface OfflineOperation<TPayload extends JsonValue = JsonValue> {
  id: string;
  method: OfflineOperationMethod;
  path: string;
  payload: TPayload;
  /** Other operation ids that must be confirmed before this one can run. */
  dependsOn: string[];
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError: string | null;
}

export interface EnqueueOfflineOperation<TPayload extends JsonValue = JsonValue> {
  id?: string;
  method: OfflineOperationMethod;
  path: string;
  payload?: TPayload;
  dependsOn?: readonly string[];
}

interface OfflineOutboxData {
  version: 1;
  operations: OfflineOperation[];
  /** Local entity ids resolved by the server, scoped to a user and farm. */
  idMappings: Record<string, string | number>;
  /** Kept so dependencies remain resolvable after an operation is removed. */
  completedOperationIds: string[];
}

const STORAGE_PREFIX = 'fermplus-offline-outbox:v1:';
const EMPTY_OUTBOX = (): OfflineOutboxData => ({
  version: 1,
  operations: [],
  idMappings: {},
  completedOperationIds: [],
});

function scopeKey(scope: OfflineOutboxScope) {
  const userId = String(scope.userId).trim();
  const farmId = String(scope.farmId).trim();
  if (!userId || !farmId) throw new Error('Une file hors connexion nécessite un utilisateur et une ferme.');
  return `${STORAGE_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(farmId)}`;
}

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function read(scope: OfflineOutboxScope): OfflineOutboxData {
  const raw = storage()?.getItem(scopeKey(scope));
  if (!raw) return EMPTY_OUTBOX();

  try {
    const parsed = JSON.parse(raw) as Partial<OfflineOutboxData>;
    if (parsed.version !== 1 || !Array.isArray(parsed.operations)) return EMPTY_OUTBOX();
    return {
      version: 1,
      operations: parsed.operations.filter(isValidOperation),
      idMappings: parsed.idMappings && typeof parsed.idMappings === 'object' ? parsed.idMappings : {},
      completedOperationIds: Array.isArray(parsed.completedOperationIds)
        ? parsed.completedOperationIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    // A corrupt cache must never prevent the application from starting.
    return EMPTY_OUTBOX();
  }
}

function write(scope: OfflineOutboxScope, outbox: OfflineOutboxData) {
  storage()?.setItem(scopeKey(scope), JSON.stringify(outbox));
}

function isValidOperation(value: unknown): value is OfflineOperation {
  if (!value || typeof value !== 'object') return false;
  const operation = value as Partial<OfflineOperation>;
  return (
    typeof operation.id === 'string' &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(operation.method ?? '') &&
    typeof operation.path === 'string' &&
    Array.isArray(operation.dependsOn) &&
    typeof operation.createdAt === 'string' &&
    typeof operation.updatedAt === 'string' &&
    typeof operation.retryCount === 'number'
  );
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function now() {
  return new Date().toISOString();
}

/** Adds an API write to durable storage. Duplicate dependency ids are removed. */
export function enqueueOfflineOperation<TPayload extends JsonValue = JsonValue>(
  scope: OfflineOutboxScope,
  input: EnqueueOfflineOperation<TPayload>,
): OfflineOperation<TPayload> {
  if (!input.path.startsWith('/')) throw new Error('Le chemin d’une opération hors connexion doit commencer par /.');
  const id = input.id ?? newId();
  const outbox = read(scope);
  if (outbox.operations.some((operation) => operation.id === id)) {
    throw new Error(`Une opération hors connexion utilise déjà l’identifiant ${id}.`);
  }
  const timestamp = now();
  const operation: OfflineOperation<TPayload> = {
    id,
    method: input.method,
    path: input.path,
    payload: (input.payload ?? null) as TPayload,
    dependsOn: [...new Set(input.dependsOn ?? [])].filter((dependency) => dependency !== id),
    createdAt: timestamp,
    updatedAt: timestamp,
    retryCount: 0,
    lastError: null,
  };
  outbox.operations.push(operation);
  write(scope, outbox);
  return operation;
}

export function listOfflineOperations(scope: OfflineOutboxScope): OfflineOperation[] {
  return read(scope).operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Returns only operations whose prerequisite operations were confirmed. */
export function listReadyOfflineOperations(scope: OfflineOutboxScope): OfflineOperation[] {
  const outbox = read(scope);
  const completed = new Set(outbox.completedOperationIds);
  return outbox.operations
    .filter((operation) => operation.dependsOn.every((dependency) => completed.has(dependency)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Removes a successfully confirmed operation and unlocks its dependants. */
export function removeOfflineOperation(scope: OfflineOutboxScope, operationId: string): boolean {
  const outbox = read(scope);
  const index = outbox.operations.findIndex((operation) => operation.id === operationId);
  if (index < 0) return false;
  outbox.operations.splice(index, 1);
  if (!outbox.completedOperationIds.includes(operationId)) outbox.completedOperationIds.push(operationId);
  write(scope, outbox);
  return true;
}

/** Records a failed delivery attempt while retaining the operation for retry. */
export function markOfflineOperationRetry(scope: OfflineOutboxScope, operationId: string, error?: unknown): OfflineOperation | null {
  const outbox = read(scope);
  const operation = outbox.operations.find((candidate) => candidate.id === operationId);
  if (!operation) return null;
  operation.retryCount += 1;
  operation.updatedAt = now();
  operation.lastError = typeof error === 'string' ? error.slice(0, 500) : error ? 'Échec de synchronisation.' : null;
  write(scope, outbox);
  return operation;
}

export function setOfflineIdMapping(scope: OfflineOutboxScope, localId: string | number, serverId: string | number) {
  const outbox = read(scope);
  outbox.idMappings[String(localId)] = serverId;
  write(scope, outbox);
}

export function getOfflineIdMapping(scope: OfflineOutboxScope, localId: string | number): string | number | null {
  const mapping = read(scope).idMappings[String(localId)];
  return mapping === undefined ? null : mapping;
}

/** Replaces a locally created id only when the server has already assigned one. */
export function resolveOfflineId(scope: OfflineOutboxScope, id: string | number): string | number {
  return getOfflineIdMapping(scope, id) ?? id;
}

/** Deletes only this user/farm queue; useful at logout or after explicit user confirmation. */
export function clearOfflineOutbox(scope: OfflineOutboxScope) {
  storage()?.removeItem(scopeKey(scope));
}
