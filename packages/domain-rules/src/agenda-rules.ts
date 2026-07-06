export type FarmActivityType = 'ELEVAGE' | 'CULTURE' | 'MIXTE' | 'PISCICULTURE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AgendaRuleInput {
  farmName: string;
  activityType: FarmActivityType;
  hasLivestock: boolean;
  hasCrops: boolean;
}

export interface AgendaRuleTask {
  title: string;
  description: string;
  priority: TaskPriority;
}

export function generateBootstrapTasks(input: AgendaRuleInput): AgendaRuleTask[] {
  const tasks: AgendaRuleTask[] = [
    {
      title: `Verifier le statut de la ferme ${input.farmName}`,
      description: 'Confirmer que la configuration initiale de la ferme est complete.',
      priority: 'HIGH'
    }
  ];

  if (input.hasLivestock) {
    tasks.push({
      title:
        input.activityType === 'PISCICULTURE'
          ? 'Controler les bassins et le suivi sanitaire des lots'
          : 'Controler le suivi sanitaire du cheptel',
      description:
        input.activityType === 'PISCICULTURE'
          ? "Verifier l'oxygene, l'alimentation, les mortalites et les observations du jour."
          : 'Verifier les vaccinations, traitements et observations du jour.',
      priority: 'HIGH'
    });
  }

  if (input.hasCrops) {
    tasks.push({
      title: 'Planifier les operations culturales',
      description: 'Verifier irrigation, fertilisation et travaux prevus.',
      priority: 'MEDIUM'
    });
  }

  return tasks;
}
