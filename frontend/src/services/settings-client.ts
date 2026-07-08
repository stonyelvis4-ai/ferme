import { apiFetch } from './api-client';

export interface FarmBusinessSettingsView {
  farmId: string;
  currency: string;
  stockRules: Record<string, unknown>;
  livestockRules: Record<string, unknown>;
  fishRules: Record<string, unknown>;
  cropRules: Record<string, unknown>;
  reminderDefaults: number[];
  units: string[];
  defaultPrices: Record<string, number>;
  taskCatalog: {
    categories: string[];
    priorities: string[];
  };
  alertRules: Record<string, unknown>;
  updatedAt: string;
}

export interface UpdateFarmBusinessSettingsInput {
  currency?: string;
  stockRules?: Record<string, unknown>;
  livestockRules?: Record<string, unknown>;
  fishRules?: Record<string, unknown>;
  cropRules?: Record<string, unknown>;
  reminderDefaults?: number[];
  units?: string[];
  defaultPrices?: Record<string, number>;
  taskCatalog?: {
    categories?: string[];
    priorities?: string[];
  };
  alertRules?: Record<string, unknown>;
}

export function getFarmBusinessSettings(farmId: string, token: string) {
  return apiFetch<FarmBusinessSettingsView>(`/farms/${farmId}/business-settings`, undefined, token);
}

export function updateFarmBusinessSettings(
  farmId: string,
  input: UpdateFarmBusinessSettingsInput,
  token: string
) {
  return apiFetch<FarmBusinessSettingsView>(
    `/farms/${farmId}/business-settings`,
    {
      method: 'PUT',
      body: JSON.stringify(input)
    },
    token
  );
}
