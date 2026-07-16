/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DEFAULT_API_BASE_URL = '/api/v1';
const AUTH_TOKEN_KEY = 'fermplus_token';
const AUTH_USER_KEY = 'fermplus_user';
const COOKIE_AUTH_MARKER = 'cookie-session';

function readSessionValue(key: string) {
  return sessionStorage.getItem(key);
}

function writeSessionValue(key: string, value: string) {
  sessionStorage.setItem(key, value);
}

function removeSessionValue(key: string) {
  sessionStorage.removeItem(key);
}

export function getApiBaseUrl() {
  return (
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_FERM_API_URL ||
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL ||
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, '');
}

export function getStoredAuthToken() {
  const sessionToken = readSessionValue(AUTH_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (legacyToken) {
    writeSessionValue(AUTH_TOKEN_KEY, legacyToken);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  return legacyToken ?? '';
}

export function setStoredAuthToken(token: string) {
  writeSessionValue(AUTH_TOKEN_KEY, token || COOKIE_AUTH_MARKER);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function clearStoredAuthToken() {
  removeSessionValue(AUTH_TOKEN_KEY);
  removeSessionValue(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function shouldSendBearerToken(token?: string) {
  return Boolean(token && token !== COOKIE_AUTH_MARKER);
}

export function getStoredAuthUser<T = AuthUser>() {
  const raw = readSessionValue(AUTH_USER_KEY) ?? localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as T;
    if (!readSessionValue(AUTH_USER_KEY)) {
      writeSessionValue(AUTH_USER_KEY, raw);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    return user;
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser) {
  writeSessionValue(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.removeItem(AUTH_USER_KEY);
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  token = getStoredAuthToken()
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(shouldSendBearerToken(token) ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Impossible de joindre l'API FERM+. Vérifiez que le backend Laravel est démarré et que la configuration API du frontend est correcte."
      );
    }

    throw error;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message ?? 'Request failed.')
        : 'Request failed.';
    throw new Error(message);
  }

  return payload as T;
}

type ApiResponse<T> = {
  data?: T;
  message?: string;
  [key: string]: unknown;
};

export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  role: 'admin' | 'owner';
  account_status?: string;
  is_active?: boolean;
  farm_id?: number | string | null;
  last_login_at?: string | null;
  last_activity_at?: string | null;
};

export type WorkspaceSnapshot = {
  dashboard: unknown;
  farms: unknown;
  users: unknown;
  settings: unknown;
  tasks: unknown;
  alerts: unknown;
  audit: unknown;
  stocks: unknown;
  finances: unknown;
  sanitary: unknown;
  layers: unknown;
  ponds: unknown;
  cultures: unknown;
  infrastructures: unknown;
  reports: unknown;
  sync: unknown;
};

export async function login(payload: { email: string; password: string }) {
  return requestJson<ApiResponse<{ token: string; user: AuthUser }>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, '');
}

export async function registerAdmin(payload: { name: string; email: string; password: string }) {
  return requestJson<ApiResponse<{ token?: string; user: AuthUser }>>('/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, '');
}

export async function logout(token?: string) {
  return requestJson<ApiResponse<null>>('/auth/logout', { method: 'POST' }, token);
}

export async function changePassword(
  payload: { current_password: string; password: string; password_confirmation: string },
  token?: string
) {
  return requestJson<ApiResponse<null>>('/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function loadWorkspaceSnapshot(token: string): Promise<WorkspaceSnapshot> {
  const [
    dashboard,
    farms,
    users,
    settings,
    tasks,
    alerts,
    audit,
    stocks,
    finances,
    sanitary,
    layers,
    ponds,
    cultures,
    infrastructures,
    reports,
    sync,
  ] = await Promise.allSettled([
    requestJson<ApiResponse<Record<string, number>>>('/dashboard', {}, token),
    requestJson<ApiResponse<unknown[]>>('/farms', {}, token),
    requestJson<ApiResponse<unknown[]>>('/users', {}, token),
    requestJson<ApiResponse<Record<string, unknown> | null>>('/settings', {}, token),
    requestJson<ApiResponse<unknown[]>>('/tasks', {}, token),
    requestJson<ApiResponse<unknown[]>>('/alerts', {}, token),
    requestJson<ApiResponse<unknown[]>>('/audit', {}, token),
    requestJson<ApiResponse<{ items?: unknown[]; movements?: unknown[] }>>('/stocks', {}, token),
    requestJson<ApiResponse<unknown[]>>('/finances', {}, token),
    requestJson<ApiResponse<unknown[]>>('/sanitary', {}, token),
    requestJson<ApiResponse<unknown>>('/pondeuses', {}, token),
    requestJson<ApiResponse<unknown>>('/pisciculture', {}, token),
    requestJson<ApiResponse<unknown[]>>('/cultures', {}, token),
    requestJson<ApiResponse<Record<string, unknown[]>>>('/infrastructures', {}, token),
    requestJson<ApiResponse<unknown>>('/reports', {}, token),
    requestJson<ApiResponse<unknown>>('/sync', {}, token),
  ]);

  const unwrap = <T>(result: PromiseSettledResult<ApiResponse<T>>) =>
    result.status === 'fulfilled' ? result.value : { data: undefined };

  return {
    dashboard: unwrap(dashboard),
    farms: unwrap(farms),
    users: unwrap(users),
    settings: unwrap(settings),
    tasks: unwrap(tasks),
    alerts: unwrap(alerts),
    audit: unwrap(audit),
    stocks: unwrap(stocks),
    finances: unwrap(finances),
    sanitary: unwrap(sanitary),
    layers: unwrap(layers),
    ponds: unwrap(ponds),
    cultures: unwrap(cultures),
    infrastructures: unwrap(infrastructures),
    reports: unwrap(reports),
    sync: unwrap(sync),
  };
}

export async function patchJson<T>(path: string, payload: unknown, token?: string) {
  return requestJson<ApiResponse<T>>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}

export async function putJson<T>(path: string, payload: unknown, token?: string) {
  return requestJson<ApiResponse<T>>(path, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function postJson<T>(path: string, payload: unknown, token?: string) {
  return requestJson<ApiResponse<T>>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function postForm<T>(path: string, payload: FormData, token?: string) {
  return requestJson<ApiResponse<T>>(path, {
    method: 'POST',
    body: payload,
  }, token);
}

export async function patchForm<T>(path: string, payload: FormData, token?: string) {
  return requestJson<ApiResponse<T>>(path, {
    method: 'POST',
    headers: {
      'X-HTTP-Method-Override': 'PATCH',
    },
    body: payload,
  }, token);
}

export async function deleteJson<T>(path: string, token?: string) {
  return requestJson<ApiResponse<T>>(path, {
    method: 'DELETE',
  }, token);
}
