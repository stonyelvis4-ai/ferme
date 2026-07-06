export interface SanitaryCalendarRuleInput {
  species: string;
  subtype?: string | null;
  breed?: string | null;
  currentAgeDays?: number | null;
}

export interface SanitaryCalendarRule {
  ruleCode: string;
  protocolLabel: string;
  eventType: 'VACCINATION' | 'TRAITEMENT' | 'CONTROLE';
  label: string;
  offsetDays: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string;
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function poultrySanitaryCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'poultry-newcastle-primo',
      protocolLabel: 'Protocole volaille',
      eventType: 'VACCINATION',
      label: 'Vaccination Newcastle',
      offsetDays: 7,
      priority: 'HIGH',
      notes: 'Administrer la primo-vaccination Newcastle pour proteger le lot.'
    },
    {
      ruleCode: 'poultry-gumboro',
      protocolLabel: 'Protocole volaille',
      eventType: 'VACCINATION',
      label: 'Vaccination Gumboro',
      offsetDays: 14,
      priority: 'HIGH',
      notes: 'Programmer la vaccination Gumboro sur le lot en croissance.'
    },
    {
      ruleCode: 'poultry-newcastle-booster',
      protocolLabel: 'Protocole volaille',
      eventType: 'VACCINATION',
      label: 'Rappel vaccinal Newcastle',
      offsetDays: 28,
      priority: 'HIGH',
      notes: 'Effectuer le rappel Newcastle pour maintenir la couverture sanitaire.'
    },
    {
      ruleCode: 'poultry-growth-check',
      protocolLabel: 'Protocole volaille',
      eventType: 'CONTROLE',
      label: 'Controle sanitaire de croissance',
      offsetDays: 21,
      priority: 'MEDIUM',
      notes: 'Verifier croissance, ventilation, abreuvement et etat du lot.'
    }
  ];
}

function cattleSanitaryCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'cattle-initial-check',
      protocolLabel: 'Protocole bovin',
      eventType: 'CONTROLE',
      label: 'Controle sanitaire bovin initial',
      offsetDays: 0,
      priority: 'MEDIUM',
      notes: "Realiser l'evaluation sanitaire de depart du lot bovin."
    },
    {
      ruleCode: 'cattle-deworming-1',
      protocolLabel: 'Protocole bovin',
      eventType: 'TRAITEMENT',
      label: 'Vermifugation bovine',
      offsetDays: 30,
      priority: 'HIGH',
      notes: 'Programmer la premiere vermifugation sur le lot bovin.'
    },
    {
      ruleCode: 'cattle-vaccination-1',
      protocolLabel: 'Protocole bovin',
      eventType: 'VACCINATION',
      label: 'Vaccination bovine de routine',
      offsetDays: 45,
      priority: 'HIGH',
      notes: 'Prevoir la vaccination bovine selon le protocole du cheptel.'
    },
    {
      ruleCode: 'cattle-deworming-2',
      protocolLabel: 'Protocole bovin',
      eventType: 'TRAITEMENT',
      label: 'Vermifugation de rappel',
      offsetDays: 120,
      priority: 'MEDIUM',
      notes: 'Planifier le rappel de vermifugation bovine.'
    }
  ];
}

function smallRuminantCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'small-ruminant-check',
      protocolLabel: 'Protocole ovin/caprin',
      eventType: 'CONTROLE',
      label: 'Controle sanitaire de troupeau',
      offsetDays: 0,
      priority: 'MEDIUM',
      notes: 'Verifier boiteries, etat corporel et hygiene generale.'
    },
    {
      ruleCode: 'small-ruminant-deworming',
      protocolLabel: 'Protocole ovin/caprin',
      eventType: 'TRAITEMENT',
      label: 'Vermifugation ovins/caprins',
      offsetDays: 21,
      priority: 'HIGH',
      notes: 'Programmer la vermifugation de routine du troupeau.'
    },
    {
      ruleCode: 'small-ruminant-vaccine',
      protocolLabel: 'Protocole ovin/caprin',
      eventType: 'VACCINATION',
      label: 'Vaccination de prevention',
      offsetDays: 60,
      priority: 'MEDIUM',
      notes: 'Planifier la vaccination preventive du troupeau.'
    }
  ];
}

function swineCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'swine-check',
      protocolLabel: 'Protocole porcin',
      eventType: 'CONTROLE',
      label: 'Controle sanitaire porcin',
      offsetDays: 0,
      priority: 'MEDIUM',
      notes: 'Verifier respiration, croissance et confort thermique du lot.'
    },
    {
      ruleCode: 'swine-preventive-treatment',
      protocolLabel: 'Protocole porcin',
      eventType: 'TRAITEMENT',
      label: 'Traitement preventif porcin',
      offsetDays: 28,
      priority: 'HIGH',
      notes: 'Programmer le traitement preventif adapte au lot porcin.'
    }
  ];
}

function genericAquacultureCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'aquaculture-water-control',
      protocolLabel: 'Protocole aquacole',
      eventType: 'CONTROLE',
      label: "Controle sanitaire et qualite d'eau",
      offsetDays: 7,
      priority: 'HIGH',
      notes: "Verifier la qualite d'eau, l'oxygenation et la sante des poissons."
    },
    {
      ruleCode: 'aquaculture-preventive-treatment',
      protocolLabel: 'Protocole aquacole',
      eventType: 'TRAITEMENT',
      label: 'Traitement preventif aquacole',
      offsetDays: 30,
      priority: 'MEDIUM',
      notes: 'Prevoir un traitement preventif si le protocole sanitaire le recommande.'
    }
  ];
}

function rabbitCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'rabbit-check',
      protocolLabel: 'Protocole cunicole',
      eventType: 'CONTROLE',
      label: 'Controle sanitaire cunicole',
      offsetDays: 0,
      priority: 'MEDIUM',
      notes: 'Examiner hygiene, abreuvement et signes digestifs.'
    },
    {
      ruleCode: 'rabbit-vaccine',
      protocolLabel: 'Protocole cunicole',
      eventType: 'VACCINATION',
      label: 'Vaccination cunicole',
      offsetDays: 35,
      priority: 'HIGH',
      notes: 'Programmer la vaccination de prevention du lot cunicole.'
    }
  ];
}

function beekeepingCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'bee-colony-control',
      protocolLabel: 'Protocole apicole',
      eventType: 'CONTROLE',
      label: 'Controle de colonie',
      offsetDays: 14,
      priority: 'MEDIUM',
      notes: 'Verifier force de colonie, ponte et reserves.'
    },
    {
      ruleCode: 'bee-varroa-treatment',
      protocolLabel: 'Protocole apicole',
      eventType: 'TRAITEMENT',
      label: 'Traitement anti-varroa',
      offsetDays: 45,
      priority: 'HIGH',
      notes: 'Programmer un traitement de prevention contre varroa.'
    }
  ];
}

function fallbackCalendar(): SanitaryCalendarRule[] {
  return [
    {
      ruleCode: 'generic-initial-check',
      protocolLabel: 'Protocole generique',
      eventType: 'CONTROLE',
      label: 'Controle sanitaire initial',
      offsetDays: 0,
      priority: 'MEDIUM',
      notes: "Realiser un controle sanitaire de reference pour l'activite."
    },
    {
      ruleCode: 'generic-preventive-care',
      protocolLabel: 'Protocole generique',
      eventType: 'TRAITEMENT',
      label: 'Traitement preventif de routine',
      offsetDays: 30,
      priority: 'MEDIUM',
      notes: 'Planifier un traitement preventif selon le protocole local.'
    }
  ];
}

export function generateSanitaryCalendar(input: SanitaryCalendarRuleInput): SanitaryCalendarRule[] {
  const species = normalize(input.species);
  const subtype = normalize(input.subtype);

  if (
    species.includes('volaille') ||
    species.includes('poulet') ||
    species.includes('pondeuse') ||
    subtype.includes('pondeuse') ||
    subtype.includes('chair')
  ) {
    return poultrySanitaryCalendar();
  }

  if (species.includes('bovin') || species.includes('boeuf') || species.includes('vache')) {
    return cattleSanitaryCalendar();
  }

  if (species.includes('ovin') || species.includes('caprin') || species.includes('mouton') || species.includes('chevre')) {
    return smallRuminantCalendar();
  }

  if (species.includes('porc')) {
    return swineCalendar();
  }

  if (species.includes('poisson') || species.includes('aquaculture') || species.includes('tilapia')) {
    return genericAquacultureCalendar();
  }

  if (species.includes('lapin')) {
    return rabbitCalendar();
  }

  if (species.includes('abeille') || species.includes('apicole')) {
    return beekeepingCalendar();
  }

  return fallbackCalendar();
}
