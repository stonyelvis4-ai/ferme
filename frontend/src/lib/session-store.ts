import type { SessionResponse } from '../services/auth-client';

const SESSION_KEY = 'ferm-plus-session';

export function saveSession(session: SessionResponse) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession(): SessionResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionResponse) : null;
}

export function clearSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export function hasSession() {
  return readSession() !== null;
}
