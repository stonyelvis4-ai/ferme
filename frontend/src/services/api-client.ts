import { clearSession, readSession, saveSession } from '../lib/session-store';

export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }

  return 'http://localhost:4000/api';
}

const API_URL = getApiBaseUrl();

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        clearSession();
        return false;
      }

      const session = (await response.json()) as {
        token: string;
        user: {
          id: string;
          fullName: string;
          email: string;
          role: 'ADMIN' | 'PROPRIETAIRE';
          assignedFarmIds: string[];
        };
      };
      saveSession(session);
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  token?: string
): Promise<T> {
  const session = readSession();
  const authToken = token ?? session?.token;
  const executeFetch = (currentToken?: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...(init?.headers ?? {})
      },
      credentials: 'include',
      cache: 'no-store'
    });

  let response = await executeFetch(authToken);

  if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/session' && path !== '/auth/logout') {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await executeFetch(readSession()?.token);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    const message = await response.text();
    throw new Error(message || `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
