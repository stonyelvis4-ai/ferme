'use client';

import { useMemo } from 'react';
import type { FarmSummary } from '../services/farm-client';

export function useActiveFarm(farms: FarmSummary[], farmId?: string) {
  return useMemo(() => farms.find((farm) => farm.id === farmId) ?? null, [farmId, farms]);
}
