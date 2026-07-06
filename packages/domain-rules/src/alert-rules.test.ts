import { describe, expect, it, vi } from 'vitest';
import { mortalityAlert, sanitaryEventAlert } from './alert-rules.js';

describe('alert rules', () => {
  it('marks bovine mortality as critical from the first death', () => {
    const result = mortalityAlert({
      species: 'Bovin',
      quantity: 1,
      baselineCount: 20,
      label: 'Lot bovin'
    });

    expect(result.type).toBe('CRITICAL');
    expect(result.title).toContain('Alerte mortalite');
  });

  it('marks fish mortality as warning below critical threshold', () => {
    const result = mortalityAlert({
      species: 'Tilapia',
      quantity: 4,
      baselineCount: 200,
      label: 'Bassin tilapia'
    });

    expect(result.type).toBe('WARNING');
  });

  it('escalates overdue vaccination as critical', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T08:00:00.000Z'));

    const result = sanitaryEventAlert({
      species: 'Volaille',
      eventType: 'VACCINATION',
      eventDate: new Date('2026-07-09T08:00:00.000Z'),
      status: 'PLANIFIE',
      notes: '',
      label: 'Vaccination Newcastle'
    });

    expect(result?.type).toBe('CRITICAL');
    expect(result?.title).toContain('Vaccination en retard');

    vi.useRealTimers();
  });
});
