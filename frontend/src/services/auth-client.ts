import { apiFetch } from './api-client';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'PROPRIETAIRE';
  assignedFarmIds: string[];
}

export interface SessionResponse {
  token: string;
  user: SessionUser;
}

export interface RegisterAdminPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface CreateOwnerPayload {
  fullName: string;
  email: string;
  password: string;
  farmId?: string;
}

export interface BootstrapStatusView {
  canRegisterAdmin: boolean;
  adminCount: number;
}

export interface LogoutResponse {
  success: boolean;
}

export function login(email: string, password: string) {
  return apiFetch<SessionResponse>('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function registerAdmin(payload: RegisterAdminPayload) {
  return apiFetch<SessionResponse>('/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createOwnerAccount(payload: CreateOwnerPayload, token?: string) {
  return apiFetch<{ owner: SessionUser }>('/auth/create-owner', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, token);
}

export function getBootstrapStatus() {
  return apiFetch<BootstrapStatusView>('/auth/bootstrap-status');
}

export function refreshSession() {
  return apiFetch<SessionResponse>('/auth/refresh', {
    method: 'POST'
  });
}

export function logout() {
  return apiFetch<LogoutResponse>('/auth/logout', {
    method: 'POST'
  });
}

export function getCurrentUser(token?: string) {
  return apiFetch<SessionUser>('/me', undefined, token);
}
