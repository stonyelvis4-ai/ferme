import { apiFetch } from './api-client';

export type ManagedUserRole = 'ADMIN' | 'PROPRIETAIRE';
export type ManagedUserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

export interface UserFarmSummary {
  id: string;
  name: string;
  status: string;
}

export interface ManagedUserItem {
  id: string;
  fullName: string;
  email: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  isActive: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  passwordChangedAt: string | null;
  forcePasswordReset: boolean;
  assignedFarmCount: number;
  assignedFarms: UserFarmSummary[];
}

export interface ManagedUserDetail extends ManagedUserItem {
  loginHistory: Array<{
    id: string;
    actionType: 'CONNEXION' | 'DECONNEXION';
    source: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export interface ListUsersResponse {
  items: ManagedUserItem[];
}

export interface CreateOwnerInput {
  fullName: string;
  email: string;
  password: string;
  farmIds?: string[];
}

export interface SetUserStatusInput {
  status: ManagedUserStatus;
  reason?: string;
}

export interface AssignFarmsInput {
  farmIds: string[];
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

export function getUsers(
  token: string,
  filters: {
    farmId?: string;
    search?: string;
    role?: 'ALL' | ManagedUserRole;
    status?: 'ALL' | ManagedUserStatus;
  } = {}
) {
  const query = new URLSearchParams();
  if (filters.farmId) query.set('farmId', filters.farmId);
  if (filters.search) query.set('search', filters.search);
  if (filters.role && filters.role !== 'ALL') query.set('role', filters.role);
  if (filters.status && filters.status !== 'ALL') query.set('status', filters.status);

  return apiFetch<ListUsersResponse>(`/users${query.toString() ? `?${query.toString()}` : ''}`, undefined, token);
}

export function getUser(userId: string, token: string) {
  return apiFetch<ManagedUserDetail>(`/users/${userId}`, undefined, token);
}

export function createOwnerAccount(payload: CreateOwnerInput, token: string) {
  return apiFetch<{ owner: { id: string; fullName: string; email: string; role: ManagedUserRole } }>(
    '/users/owners',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    },
    token
  );
}

export function setUserStatus(userId: string, payload: SetUserStatusInput, token: string) {
  return apiFetch<ManagedUserItem>(
    `/users/${userId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    },
    token
  );
}

export function assignUserFarms(userId: string, payload: AssignFarmsInput, token: string) {
  return apiFetch<ManagedUserItem>(
    `/users/${userId}/farms`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    },
    token
  );
}

export function resetUserPassword(userId: string, token: string) {
  return apiFetch<ResetPasswordResponse>(
    `/users/${userId}/password/reset`,
    {
      method: 'POST'
    },
    token
  );
}

export function getUserHistory(userId: string, token: string) {
  return apiFetch<{ items: ManagedUserDetail['loginHistory'] }>(`/users/${userId}/history`, undefined, token);
}
