import type { FarmActivityType } from './agenda-rules.js';

export interface RecommendationInput {
  activityType: FarmActivityType;
  lowStockItems: number;
  outOfStockItems: number;
  criticalSanitaryEvents: number;
  overdueTasks: number;
  unreadCriticalAlerts: number;
  balance: number;
  balanceTrend: number;
  currentMonthBalance: number;
  previousMonthBalance: number;
  activeAnimals: number;
  hasLivestock: boolean;
  hasCrops: boolean;
}

export interface RecommendationRuleResult {
  category: 'OPERATIONS' | 'SANITAIRE' | 'STOCK' | 'FINANCE' | 'PRODUCTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  metricLabel: string;
  metricValue: string;
  actionLabel: string;
  actionKey: 'AGENDA' | 'ALERTS' | 'SANITARY' | 'STOCKS' | 'FINANCE' | 'LIVESTOCK' | 'CROPS' | 'DASHBOARD';
}

export function generateFarmRecommendations(input: RecommendationInput): RecommendationRuleResult[] {
  const recommendations: RecommendationRuleResult[] = [];

  if (input.overdueTasks > 0) {
    recommendations.push({
      category: 'OPERATIONS',
      severity: input.overdueTasks >= 3 ? 'CRITICAL' : 'WARNING',
      title: 'Rattraper les operations en retard',
      message: `${input.overdueTasks} tache(s) en retard doivent etre replanifiees ou executees rapidement.`,
      metricLabel: 'Taches en retard',
      metricValue: String(input.overdueTasks),
      actionLabel: "Ouvrir l'agenda",
      actionKey: 'AGENDA'
    });
  }

  if (input.lowStockItems > 0) {
    recommendations.push({
      category: 'STOCK',
      severity: input.lowStockItems >= 2 ? 'CRITICAL' : 'WARNING',
      title: 'Reconstituer les stocks sensibles',
      message: `${input.lowStockItems} article(s) sont sous le seuil critique. Prepare un reapprovisionnement prioritaire.`,
      metricLabel: 'Articles critiques',
      metricValue: String(input.lowStockItems),
      actionLabel: 'Voir les stocks',
      actionKey: 'STOCKS'
    });
  }

  if (input.outOfStockItems > 0) {
    recommendations.push({
      category: 'STOCK',
      severity: input.outOfStockItems >= 2 ? 'CRITICAL' : 'WARNING',
      title: 'Traiter les ruptures de stock',
      message: `${input.outOfStockItems} article(s) sont en rupture. Priorise les achats ou reaffectations pour eviter un blocage operationnel.`,
      metricLabel: 'Ruptures',
      metricValue: String(input.outOfStockItems),
      actionLabel: 'Corriger les stocks',
      actionKey: 'STOCKS'
    });
  }

  if (input.criticalSanitaryEvents > 0) {
    recommendations.push({
      category: 'SANITAIRE',
      severity: 'CRITICAL',
      title: 'Traiter les alertes sanitaires critiques',
      message: `${input.criticalSanitaryEvents} evenement(s) sanitaire(s) critique(s) necessitent un suivi immediat.`,
      metricLabel: 'Cas critiques',
      metricValue: String(input.criticalSanitaryEvents),
      actionLabel: 'Ouvrir le sanitaire',
      actionKey: 'SANITARY'
    });
  }

  if (input.unreadCriticalAlerts > 0) {
    recommendations.push({
      category: 'OPERATIONS',
      severity: 'CRITICAL',
      title: 'Accuser reception des alertes prioritaires',
      message: `${input.unreadCriticalAlerts} alerte(s) critique(s) restent ouvertes. Centralise le traitement pour eviter les oublis et escalades.`,
      metricLabel: 'Alertes critiques',
      metricValue: String(input.unreadCriticalAlerts),
      actionLabel: 'Ouvrir les alertes',
      actionKey: 'ALERTS'
    });
  }

  if (input.balance < 0) {
    recommendations.push({
      category: 'FINANCE',
      severity: input.balance < -1000 ? 'CRITICAL' : 'WARNING',
      title: 'Redresser la rentabilite',
      message: `Le solde actuel est negatif (${input.balance.toFixed(2)}). Verifie les charges et accelere les revenus disponibles.`,
      metricLabel: 'Solde actuel',
      metricValue: input.balance.toFixed(2),
      actionLabel: 'Analyser les finances',
      actionKey: 'FINANCE'
    });
  }

  if (input.previousMonthBalance !== 0 && input.balanceTrend <= -20) {
    recommendations.push({
      category: 'FINANCE',
      severity: input.balanceTrend <= -50 ? 'CRITICAL' : 'WARNING',
      title: 'Freiner la degradation mensuelle',
      message: `Le solde du mois courant (${input.currentMonthBalance.toFixed(2)}) decroche par rapport au mois precedent (${input.previousMonthBalance.toFixed(2)}). Analyse les categories qui accelerent la baisse.`,
      metricLabel: 'Tendance mensuelle',
      metricValue: `${input.balanceTrend.toFixed(1)}%`,
      actionLabel: 'Comparer les flux',
      actionKey: 'FINANCE'
    });
  }

  if (input.hasLivestock && input.activeAnimals > 0) {
    recommendations.push({
      category: 'PRODUCTION',
      severity: 'INFO',
      title:
        input.activityType === 'PISCICULTURE'
          ? 'Maintenir la routine piscicole'
          : 'Maintenir la routine d elevage',
      message:
        input.activityType === 'PISCICULTURE'
          ? `Les lots suivis comptent ${input.activeAnimals} unite(s). Garde un rythme stable pour l alimentation, la qualite de l eau et l observation des bassins.`
          : `Le cheptel actif compte ${input.activeAnimals} unite(s). Garde un rythme stable pour l alimentation, l abreuvement et l observation.`,
      metricLabel: input.activityType === 'PISCICULTURE' ? 'Unites suivies' : 'Animaux actifs',
      metricValue: String(input.activeAnimals),
      actionLabel: input.activityType === 'PISCICULTURE' ? 'Voir la production' : "Ouvrir l'elevage",
      actionKey: input.activityType === 'PISCICULTURE' ? 'DASHBOARD' : 'LIVESTOCK'
    });
  }

  if (input.hasCrops) {
    recommendations.push({
      category: 'PRODUCTION',
      severity: 'INFO',
      title: 'Surveiller les travaux culturaux',
      message: "Planifie l irrigation, la fertilisation et les controles de parcelles selon la saison et les priorites de la semaine.",
      metricLabel: 'Culture',
      metricValue: 'Suivi',
      actionLabel: 'Voir les cultures',
      actionKey: 'CROPS'
    });
  }

  if (
    recommendations.length === 0 &&
    input.balance > 0 &&
    input.overdueTasks === 0 &&
    input.lowStockItems === 0 &&
    input.outOfStockItems === 0 &&
    input.unreadCriticalAlerts === 0
  ) {
    recommendations.push({
      category: 'FINANCE',
      severity: 'INFO',
      title: 'Conserver le rythme de pilotage',
      message: "Les signaux principaux restent bien alignes. Continue les mises a jour regulieres pour garder cette lecture fiable et exploitable.",
      metricLabel: 'Solde',
      metricValue: input.balance.toFixed(2),
      actionLabel: 'Voir les finances',
      actionKey: 'FINANCE'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      category: 'OPERATIONS',
      severity: 'INFO',
      title: 'Situation globalement stable',
      message: "Aucun signal majeur n est detecte pour l instant. Continue le suivi quotidien et la mise a jour reguliere des donnees.",
      metricLabel: 'Etat',
      metricValue: 'Stable',
      actionLabel: 'Voir le dashboard',
      actionKey: 'DASHBOARD'
    });
  }

  return recommendations;
}
