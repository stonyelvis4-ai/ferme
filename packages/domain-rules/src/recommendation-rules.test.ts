import { describe, expect, it } from 'vitest';
import { generateFarmRecommendations } from './recommendation-rules.js';

describe('generateFarmRecommendations', () => {
  it('creates actionable stock and finance recommendations', () => {
    const items = generateFarmRecommendations({
      activityType: 'MIXTE',
      lowStockItems: 2,
      outOfStockItems: 1,
      criticalSanitaryEvents: 0,
      overdueTasks: 0,
      unreadCriticalAlerts: 1,
      balance: -2500,
      balanceTrend: -32,
      currentMonthBalance: -2500,
      previousMonthBalance: 1200,
      activeAnimals: 18,
      hasLivestock: true,
      hasCrops: true
    });

    expect(items.some((item) => item.actionKey === 'STOCKS' && item.severity === 'CRITICAL')).toBe(true);
    expect(items.some((item) => item.actionKey === 'FINANCE' && item.severity === 'CRITICAL')).toBe(true);
    expect(items.some((item) => item.actionKey === 'ALERTS')).toBe(true);
  });

  it('returns a stable dashboard recommendation when no signal is active', () => {
    const items = generateFarmRecommendations({
      activityType: 'CULTURE',
      lowStockItems: 0,
      outOfStockItems: 0,
      criticalSanitaryEvents: 0,
      overdueTasks: 0,
      unreadCriticalAlerts: 0,
      balance: 0,
      balanceTrend: 0,
      currentMonthBalance: 0,
      previousMonthBalance: 0,
      activeAnimals: 0,
      hasLivestock: false,
      hasCrops: false
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.actionKey).toBe('DASHBOARD');
    expect(items[0]?.metricValue).toBe('Stable');
  });
});
