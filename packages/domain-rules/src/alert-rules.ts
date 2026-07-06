export interface AlertRuleResult {
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
}

export function lowStockAlert(itemName: string, quantity: number): AlertRuleResult {
  return {
    type: quantity <= 0 ? 'CRITICAL' : 'WARNING',
    title: `Stock faible: ${itemName}`,
    message: `Le stock disponible est descendu a ${quantity}.`
  };
}

export interface MortalityAlertInput {
  species?: string | null;
  quantity: number;
  baselineCount?: number | null;
  label: string;
}

export interface SanitaryEventAlertInput {
  species?: string | null;
  eventType: 'MALADIE' | 'VACCINATION' | 'TRAITEMENT' | 'CONSULTATION' | 'MORTALITE' | 'CONTROLE';
  eventDate: Date;
  status: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'CRITIQUE';
  notes?: string | null;
  label: string;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function detectSpeciesProfile(species?: string | null) {
  const normalized = normalize(species);

  if (
    normalized.includes('volaille') ||
    normalized.includes('poulet') ||
    normalized.includes('pondeuse')
  ) {
    return 'POULTRY' as const;
  }

  if (normalized.includes('bovin') || normalized.includes('vache') || normalized.includes('boeuf')) {
    return 'CATTLE' as const;
  }

  if (
    normalized.includes('ovin') ||
    normalized.includes('caprin') ||
    normalized.includes('mouton') ||
    normalized.includes('chevre')
  ) {
    return 'SMALL_RUMINANT' as const;
  }

  if (normalized.includes('poisson') || normalized.includes('tilapia') || normalized.includes('aquaculture')) {
    return 'FISH' as const;
  }

  return 'GENERIC' as const;
}

export function mortalityAlert(input: MortalityAlertInput): AlertRuleResult {
  const profile = detectSpeciesProfile(input.species);
  const baseline = Math.max(0, input.baselineCount ?? 0);
  const mortalityRate = baseline > 0 ? input.quantity / baseline : 0;

  const critical =
    (profile === 'POULTRY' && (input.quantity >= 3 || mortalityRate >= 0.05)) ||
    (profile === 'CATTLE' && input.quantity >= 1) ||
    (profile === 'SMALL_RUMINANT' && (input.quantity >= 2 || mortalityRate >= 0.04)) ||
    (profile === 'FISH' && (input.quantity >= 10 || mortalityRate >= 0.1)) ||
    (profile === 'GENERIC' && input.quantity >= 3);

  return {
    type: critical ? 'CRITICAL' : 'WARNING',
    title: critical ? `Alerte mortalite: ${input.label}` : `Mortalite a surveiller: ${input.label}`,
    message: baseline > 0
      ? `${input.quantity} perte(s) enregistree(s) pour ${input.label} (${(mortalityRate * 100).toFixed(1)}% du lot).`
      : `${input.quantity} perte(s) enregistree(s) pour ${input.label}.`
  };
}

export function sanitaryEventAlert(input: SanitaryEventAlertInput): AlertRuleResult | null {
  const now = Date.now();
  const isOverdue = input.eventDate.getTime() < now && input.status !== 'TERMINE';

  if (input.status === 'CRITIQUE') {
    return {
      type: 'CRITICAL',
      title: `Alerte sanitaire critique: ${input.label}`,
      message: input.notes?.trim() || 'Un evenement sanitaire critique requiert une action immediate.'
    };
  }

  if (input.eventType === 'VACCINATION' && isOverdue) {
    return {
      type: 'CRITICAL',
      title: `Vaccination en retard: ${input.label}`,
      message: input.notes?.trim() || 'La vaccination planifiee n a pas ete realisee a la date prevue.'
    };
  }

  if (input.eventType === 'TRAITEMENT' && isOverdue) {
    return {
      type: 'WARNING',
      title: `Traitement en retard: ${input.label}`,
      message: input.notes?.trim() || 'Le traitement planifie est en retard et doit etre execute rapidement.'
    };
  }

  if (input.eventType === 'MORTALITE') {
    return mortalityAlert({
      species: input.species,
      quantity: 1,
      label: input.label
    });
  }

  return null;
}
